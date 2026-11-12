ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS messages boolean NOT NULL DEFAULT true;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_category_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_category_check CHECK(category IN ('application','placement','hours','feedback','deadline','company','message'));

CREATE OR REPLACE FUNCTION public._notify(_uid uuid, _category text, _key text, _title text, _preview text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE enabled boolean;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT CASE _category WHEN 'application' THEN application WHEN 'placement' THEN placement WHEN 'hours' THEN hours
    WHEN 'feedback' THEN feedback WHEN 'deadline' THEN deadline WHEN 'message' THEN messages END INTO enabled
  FROM notification_preferences WHERE user_id = _uid;
  IF enabled IS FALSE THEN RETURN; END IF;
  INSERT INTO notifications (user_id, category, dedupe_key, title, preview, body, link)
  VALUES (_uid, _category, _key, _title, _preview, _body, _link)
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public._notify(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE TABLE public.seeker_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid NOT NULL UNIQUE,
  guardian_user_id uuid NOT NULL,
  guardian_name text NOT NULL,
  relationship text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (seeker_id <> guardian_user_id)
);
GRANT SELECT ON public.seeker_guardians TO authenticated;
GRANT ALL ON public.seeker_guardians TO service_role;
ALTER TABLE public.seeker_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seeker, guardian and safeguarding reviewers read guardian links" ON public.seeker_guardians FOR SELECT TO authenticated
  USING (seeker_id = auth.uid() OR guardian_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  seeker_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.company_profiles(id),
  job_id uuid NOT NULL,
  started_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('seeker','company')),
  sender_name text NOT NULL,
  sender_detail text,
  kind text NOT NULL DEFAULT 'message' CHECK (kind IN ('message','instructions','schedule')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  hidden_at timestamptz,
  hidden_by uuid
);
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
CREATE TABLE public.conversation_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('seeker','company')),
  blocked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, side)
);
CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('abusive','spam','inappropriate','safeguarding','contact_request','other')),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','hidden','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, reporter_id)
);
GRANT ALL ON public.conversations, public.messages, public.conversation_blocks, public.message_reports TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.guard_message_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('app.message_purge', true) = 'on' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Messages are kept until the retention period ends';
  END IF;
  IF NEW.body IS DISTINCT FROM OLD.body OR NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.sender_name IS DISTINCT FROM OLD.sender_name
     OR NEW.sender_role IS DISTINCT FROM OLD.sender_role OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.kind IS DISTINCT FROM OLD.kind OR current_setting('app.message_moderation', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Messages cannot be edited';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_immutable BEFORE UPDATE OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_message_write();

CREATE OR REPLACE FUNCTION public.message_staff_access(_application_id uuid, _uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.company_application_read(_application_id,_uid) OR public.can_verify_hours(_application_id,_uid) $$;
CREATE OR REPLACE FUNCTION public.seeker_safeguarded(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT is_minor FROM public_profiles WHERE user_id=_uid),false)
      OR EXISTS(SELECT 1 FROM seeker_guardians WHERE seeker_id=_uid AND status IN ('pending','approved')) $$;
CREATE OR REPLACE FUNCTION public.approved_guardian(_seeker uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT guardian_user_id FROM seeker_guardians WHERE seeker_id=_seeker AND status='approved' $$;
CREATE OR REPLACE FUNCTION public.conversation_ended_at(_application_id uuid) RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN a.status IN ('rejected','withdrawn') THEN COALESCE(a.status_changed_at,a.submitted_at)
              WHEN p.status IN ('completed','cancelled') THEN COALESCE(p.completed_at,p.cancelled_at,p.updated_at) END
  FROM applications a LEFT JOIN placements p ON p.application_id=a.id WHERE a.id=_application_id $$;
REVOKE ALL ON FUNCTION public.message_staff_access(uuid,uuid), public.seeker_safeguarded(uuid), public.approved_guardian(uuid), public.conversation_ended_at(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_expired_messages() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
  PERFORM set_config('app.message_purge','on',true);
  DELETE FROM conversations c WHERE public.conversation_ended_at(c.application_id) < now() - interval '2 months'
    AND NOT EXISTS (SELECT 1 FROM message_reports r WHERE r.conversation_id=c.id AND r.status='open');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.message_purge','off',true);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.purge_expired_messages() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._message_role(_application_id uuid, _uid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN a.user_id=_uid THEN 'seeker' WHEN public.message_staff_access(a.id,_uid) THEN 'company'
              WHEN public.approved_guardian(a.user_id)=_uid THEN 'guardian' END FROM applications a WHERE a.id=_application_id $$;
REVOKE ALL ON FUNCTION public._message_role(uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_message(_application_id uuid, _body text, _kind text DEFAULT 'message') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); a applications; j jobs; role text; conv conversations; nm text; detail text; mid uuid; b text := btrim(coalesce(_body,'')); staff uuid; notified int := 0; hourkey text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to send messages'; END IF;
  SELECT * INTO a FROM applications WHERE id=_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authorised'; END IF;
  role := public._message_role(a.id, uid);
  IF role IS NULL OR role='guardian' THEN RAISE EXCEPTION 'Not authorised to message in this conversation'; END IF;
  BEGIN SELECT * INTO j FROM jobs WHERE id::text=a.job_id; EXCEPTION WHEN others THEN j := NULL; END;
  IF j.id IS NULL THEN RAISE EXCEPTION 'Messaging is only available for listed company opportunities'; END IF;
  IF public.conversation_ended_at(a.id) IS NOT NULL THEN RAISE EXCEPTION 'This conversation is closed because the application or placement has ended'; END IF;
  IF role='seeker' AND coalesce(_kind,'message') <> 'message' THEN RAISE EXCEPTION 'Only company staff can send instructions or schedules'; END IF;
  IF coalesce(_kind,'message') NOT IN ('message','instructions','schedule') THEN RAISE EXCEPTION 'Unknown message type'; END IF;
  IF char_length(b) < 1 OR char_length(b) > 4000 THEN RAISE EXCEPTION 'Messages must be between 1 and 4000 characters'; END IF;
  IF (SELECT count(*) FROM regexp_matches(b, 'https?://|www\.', 'gi')) > 3 THEN RAISE EXCEPTION 'Messages can include at most 3 links'; END IF;
  IF public.seeker_safeguarded(a.user_id) THEN
    IF public.approved_guardian(a.user_id) IS NULL THEN RAISE EXCEPTION 'Messaging with under-18s is paused until a parent or guardian has been approved by the safeguarding team'; END IF;
    IF b ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' OR b ~ '(\+?\d[\d\s().-]{8,}\d)' THEN
      RAISE EXCEPTION 'For safety, email addresses and phone numbers cannot be shared in messages with under-18s';
    END IF;
  END IF;
  SELECT * INTO conv FROM conversations WHERE application_id=a.id;
  IF conv.id IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM conversation_blocks WHERE conversation_id=conv.id AND side <> role) THEN RAISE EXCEPTION 'You cannot send messages in this conversation because it has been blocked'; END IF;
    IF EXISTS(SELECT 1 FROM messages WHERE conversation_id=conv.id AND sender_id=uid AND body=b AND created_at > now() - interval '10 minutes') THEN
      RAISE EXCEPTION 'You have just sent this same message';
    END IF;
  ELSE
    INSERT INTO conversations(application_id, seeker_id, company_id, job_id, started_by) VALUES (a.id, a.user_id, j.company_id, j.id, uid) RETURNING * INTO conv;
  END IF;
  IF role='seeker' THEN
    SELECT coalesce(nullif(full_name,''),'Applicant') INTO nm FROM profiles WHERE user_id=uid; nm := coalesce(nm,'Applicant'); detail := 'Applicant';
  ELSE
    SELECT coalesce(nullif(full_name,''),'Company staff member'), nullif(job_title,'') INTO nm, detail FROM employee_identities WHERE user_id=uid;
    nm := coalesce(nm,'Company staff member');
    detail := concat_ws(' · ', detail, (SELECT company_name FROM company_profiles WHERE id=j.company_id));
  END IF;
  INSERT INTO messages(conversation_id, sender_id, sender_role, sender_name, sender_detail, kind, body)
  VALUES (conv.id, uid, role, nm, detail, coalesce(_kind,'message'), b) RETURNING id INTO mid;
  UPDATE conversations SET last_message_at=now() WHERE id=conv.id;
  hourkey := 'msg:'||conv.id||':'||to_char(date_trunc('hour',now()),'YYYYMMDDHH24');
  IF role='company' THEN
    PERFORM public._notify(a.user_id,'message',hourkey,'New message','You have a new message about an application.',NULL,'/messages?application='||a.id);
    PERFORM public._notify(public.approved_guardian(a.user_id),'message',hourkey||':g','Message copy','A message was sent to the young person you support.',NULL,'/messages?application='||a.id);
  ELSE
    FOR staff IN SELECT DISTINCT sender_id FROM messages WHERE conversation_id=conv.id AND sender_role='company' LOOP
      IF public.message_staff_access(a.id, staff) THEN
        PERFORM public._notify(staff,'message',hourkey,'New message','An applicant replied to a conversation.',NULL,'/messages?application='||a.id); notified := notified + 1;
      END IF;
    END LOOP;
    IF notified = 0 THEN PERFORM public._notify_company_admins(j.company_id, NULL, hourkey, 'New applicant message','An applicant sent a message about an application.',NULL,'/messages?application='||a.id); END IF;
    PERFORM public._notify(public.approved_guardian(a.user_id),'message',hourkey||':g','Message copy','The young person you support sent a message.',NULL,'/messages?application='||a.id);
  END IF;
  PERFORM public.purge_expired_messages();
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.list_my_conversations() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to view messages'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x->>'last_message_at' DESC) FROM (
    SELECT jsonb_build_object('id',c.id,'application_id',c.application_id,'job_title',j.title,'company_name',cp.company_name,
      'seeker_name',coalesce(nullif(pr.full_name,''),'Applicant'),'my_role',public._message_role(c.application_id,uid),
      'last_message_at',c.last_message_at,'closed',public.conversation_ended_at(c.application_id) IS NOT NULL,
      'last_preview',(SELECT CASE WHEN m.hidden_at IS NULL THEN left(m.body,80) ELSE 'Message removed by moderation' END FROM messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1)) x
    FROM conversations c JOIN jobs j ON j.id=c.job_id JOIN company_profiles cp ON cp.id=c.company_id LEFT JOIN profiles pr ON pr.user_id=c.seeker_id
    WHERE public._message_role(c.application_id,uid) IS NOT NULL) s),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.get_conversation(_application_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); role text; a applications; j jobs; conv conversations; safe boolean; g uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to view messages'; END IF;
  role := public._message_role(_application_id, uid);
  IF role IS NULL THEN RAISE EXCEPTION 'Not authorised to view this conversation'; END IF;
  SELECT * INTO a FROM applications WHERE id=_application_id;
  BEGIN SELECT * INTO j FROM jobs WHERE id::text=a.job_id; EXCEPTION WHEN others THEN j := NULL; END;
  SELECT * INTO conv FROM conversations WHERE application_id=a.id;
  safe := public.seeker_safeguarded(a.user_id); g := public.approved_guardian(a.user_id);
  RETURN jsonb_build_object('application_id',a.id,'conversation_id',conv.id,'my_role',role,
    'job_title',j.title,'company_name',(SELECT company_name FROM company_profiles WHERE id=j.company_id),
    'seeker_name',(SELECT coalesce(nullif(full_name,''),'Applicant') FROM profiles WHERE user_id=a.user_id),
    'listed',j.id IS NOT NULL,'closed',public.conversation_ended_at(a.id) IS NOT NULL,
    'retention_until',public.conversation_ended_at(a.id) + interval '2 months',
    'safeguarded',safe,'guardian_approved',g IS NOT NULL,
    'blocked_by_me',CASE WHEN role IN ('seeker','company') THEN EXISTS(SELECT 1 FROM conversation_blocks WHERE conversation_id=conv.id AND side=role) ELSE false END,
    'blocked_by_other',CASE WHEN role IN ('seeker','company') THEN EXISTS(SELECT 1 FROM conversation_blocks WHERE conversation_id=conv.id AND side<>role) ELSE false END,
    'messages',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'mine',m.sender_id=uid,'sender_role',m.sender_role,'sender_name',m.sender_name,
        'sender_detail',m.sender_detail,'kind',m.kind,'created_at',m.created_at,'hidden',m.hidden_at IS NOT NULL,
        'body',CASE WHEN m.hidden_at IS NULL THEN m.body END) ORDER BY m.created_at) FROM messages m WHERE m.conversation_id=conv.id),'[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.set_conversation_block(_application_id uuid, _blocked boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); role text; cid uuid;
BEGIN
  role := public._message_role(_application_id, uid);
  IF role IS NULL OR role='guardian' THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT id INTO cid FROM conversations WHERE application_id=_application_id;
  IF cid IS NULL THEN RAISE EXCEPTION 'There is no conversation to block yet'; END IF;
  IF _blocked THEN INSERT INTO conversation_blocks(conversation_id, side, blocked_by) VALUES (cid, role, uid) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM conversation_blocks WHERE conversation_id=cid AND side=role; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.report_message(_message_id uuid, _reason text, _details text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); m messages; c conversations; rid uuid; adm uuid;
BEGIN
  SELECT * INTO m FROM messages WHERE id=_message_id; SELECT * INTO c FROM conversations WHERE id=m.conversation_id;
  IF m.id IS NULL OR public._message_role(c.application_id, uid) IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF m.sender_id=uid THEN RAISE EXCEPTION 'You cannot report your own message'; END IF;
  INSERT INTO message_reports(message_id, conversation_id, reporter_id, reason, details) VALUES (m.id, c.id, uid, _reason, nullif(btrim(_details),''))
  ON CONFLICT (message_id, reporter_id) DO NOTHING RETURNING id INTO rid;
  IF rid IS NULL THEN RAISE EXCEPTION 'You have already reported this message'; END IF;
  FOR adm IN SELECT DISTINCT user_id FROM user_roles WHERE role IN ('admin','moderator') LOOP
    PERFORM public._notify(adm,'company','msg-report:'||rid,'Message reported','A message needs moderation review.',NULL,'/messages?view=moderation');
  END LOOP;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.list_message_reports() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'reason',r.reason,'details',r.details,'status',r.status,'created_at',r.created_at,
     'resolution_note',r.resolution_note,'sender_name',m.sender_name,'sender_role',m.sender_role,'sender_detail',m.sender_detail,'body',m.body,
     'sent_at',m.created_at,'safeguarded',public.seeker_safeguarded(c.seeker_id),'job_title',(SELECT title FROM jobs WHERE id=c.job_id)) ORDER BY r.status='open' DESC, r.created_at DESC)
    FROM message_reports r JOIN messages m ON m.id=r.message_id JOIN conversations c ON c.id=r.conversation_id),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.moderate_message_report(_report_id uuid, _decision text, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); r message_reports;
BEGIN
  IF NOT (public.has_role(uid,'admin') OR public.has_role(uid,'moderator')) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _decision NOT IN ('hidden','dismissed') OR char_length(btrim(coalesce(_note,''))) < 3 THEN RAISE EXCEPTION 'Choose a decision and add a note'; END IF;
  SELECT * INTO r FROM message_reports WHERE id=_report_id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'open' THEN RAISE EXCEPTION 'This report is already resolved'; END IF;
  UPDATE message_reports SET status=_decision, resolved_by=uid, resolved_at=now(), resolution_note=btrim(_note) WHERE id=r.id;
  IF _decision='hidden' THEN
    PERFORM set_config('app.message_moderation','on',true);
    UPDATE messages SET hidden_at=now(), hidden_by=uid WHERE id=r.message_id AND hidden_at IS NULL;
    PERFORM set_config('app.message_moderation','off',true);
  END IF;
  PERFORM public._notify(r.reporter_id,'message','msg-report-done:'||r.id,'Report reviewed','A message you reported has been reviewed.',NULL,'/messages?application='||(SELECT application_id FROM conversations WHERE id=r.conversation_id));
END $$;

CREATE OR REPLACE FUNCTION public.request_guardian(_email text, _name text, _relationship text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); gid uuid; rid uuid; cur seeker_guardians; adm uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF NOT COALESCE((SELECT is_minor FROM public_profiles WHERE user_id=uid),false) AND NOT EXISTS(SELECT 1 FROM seeker_guardians WHERE seeker_id=uid) THEN
    RAISE EXCEPTION 'Guardian links are for seekers who have said they are under 18 in their profile'; END IF;
  IF char_length(btrim(coalesce(_name,''))) < 2 OR char_length(btrim(coalesce(_relationship,''))) < 2 THEN RAISE EXCEPTION 'Add the guardian''s name and relationship'; END IF;
  SELECT id INTO gid FROM auth.users WHERE lower(email)=lower(btrim(_email)) AND email_confirmed_at IS NOT NULL;
  IF gid IS NULL THEN RAISE EXCEPTION 'Ask your parent or guardian to create and confirm an account with this email first'; END IF;
  IF gid = uid THEN RAISE EXCEPTION 'You cannot be your own guardian'; END IF;
  SELECT * INTO cur FROM seeker_guardians WHERE seeker_id=uid FOR UPDATE;
  IF cur.status IN ('pending','approved') THEN RAISE EXCEPTION 'A guardian link is already %', cur.status; END IF;
  INSERT INTO seeker_guardians(seeker_id, guardian_user_id, guardian_name, relationship) VALUES (uid, gid, btrim(_name), btrim(_relationship))
  ON CONFLICT (seeker_id) DO UPDATE SET guardian_user_id=EXCLUDED.guardian_user_id, guardian_name=EXCLUDED.guardian_name, relationship=EXCLUDED.relationship,
    status='pending', review_note=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now() RETURNING id INTO rid;
  PERFORM public._notify(gid,'message','guardian-request:'||rid||':'||extract(epoch from now())::bigint,'Guardian request','A young person named you as their parent or guardian. Our safeguarding team will review it.',NULL,'/messages');
  FOR adm IN SELECT DISTINCT user_id FROM user_roles WHERE role IN ('admin','moderator') LOOP
    PERFORM public._notify(adm,'company','guardian-review:'||rid||':'||extract(epoch from now())::bigint,'Guardian link to review','A guardian link needs safeguarding review.',NULL,'/messages?view=moderation');
  END LOOP;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.review_guardian(_id uuid, _decision text, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); g seeker_guardians;
BEGIN
  IF NOT (public.has_role(uid,'admin') OR public.has_role(uid,'moderator')) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _decision NOT IN ('approved','rejected','revoked') OR char_length(btrim(coalesce(_note,''))) < 3 THEN RAISE EXCEPTION 'Choose a decision and add a safeguarding note'; END IF;
  SELECT * INTO g FROM seeker_guardians WHERE id=_id FOR UPDATE;
  IF g.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _decision IN ('approved','rejected') AND g.status <> 'pending' THEN RAISE EXCEPTION 'Only pending links can be approved or rejected'; END IF;
  IF _decision='revoked' AND g.status <> 'approved' THEN RAISE EXCEPTION 'Only approved links can be revoked'; END IF;
  UPDATE seeker_guardians SET status=_decision, review_note=btrim(_note), reviewed_by=uid, reviewed_at=now() WHERE id=g.id;
  PERFORM public._notify(g.seeker_id,'message','guardian:'||g.id||':'||_decision||':'||extract(epoch from now())::bigint,'Guardian link update','Your parent or guardian link has been reviewed.',NULL,'/messages');
  PERFORM public._notify(g.guardian_user_id,'message','guardian-g:'||g.id||':'||_decision||':'||extract(epoch from now())::bigint,'Guardian link update','A guardian link naming you has been reviewed.',NULL,'/messages');
END $$;

REVOKE ALL ON FUNCTION public.send_message(uuid,text,text), public.list_my_conversations(), public.get_conversation(uuid), public.set_conversation_block(uuid,boolean),
  public.report_message(uuid,text,text), public.list_message_reports(), public.moderate_message_report(uuid,text,text), public.request_guardian(text,text,text), public.review_guardian(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_message(uuid,text,text), public.list_my_conversations(), public.get_conversation(uuid), public.set_conversation_block(uuid,boolean),
  public.report_message(uuid,text,text), public.list_message_reports(), public.moderate_message_report(uuid,text,text), public.request_guardian(text,text,text), public.review_guardian(uuid,text,text) TO authenticated;