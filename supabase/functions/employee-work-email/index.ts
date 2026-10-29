import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const schema = z.object({ action: z.literal('send') }).strict();
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply(503, { error: 'Work email verification is unavailable.' });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!bearer) return reply(401, { error: 'Sign in to verify your work email.' });
  const { data: auth, error: authError } = await admin.auth.getUser(bearer);
  if (authError || !auth.user) return reply(401, { error: 'Your session expired. Sign in again.' });
  if (!auth.user.email_confirmed_at) return reply(403, { error: 'Confirm your platform account email first.' });
  try {
    if (!schema.safeParse(await req.json()).success) return reply(400, { error: 'Invalid verification request.' });
    // Fail closed until the sender domain and registered template are configured.
    const origin = Deno.env.get('EMPLOYEE_EMAIL_APP_ORIGIN');
    const enabled = Deno.env.get('EMPLOYEE_EMAIL_DELIVERY_ENABLED') === 'true';
    if (!enabled || !origin || !/^https:\/\/[a-z0-9.-]+$/i.test(origin)) return reply(503, { error: 'Verification email delivery is not set up yet. Your saved details and manual review request remain available; no work-email proof or draft permission is granted.' });
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
    const { data, error } = await admin.rpc('begin_employee_email_challenge', { _uid: auth.user.id, _hash: hash });
    if (error) return reply(429, { error: error.message });
    const sent = await admin.functions.invoke('send-transactional-email', { body: { templateName: 'employee-work-email', recipientEmail: data.email, idempotencyKey: `employee-work-email-${data.id}`, templateData: { name: data.name, verificationUrl: `${origin}/employer/verify-work-email#token=${token}` } } });
    if (sent.error || sent.data?.error) {
      await admin.from('employee_email_challenges').update({ invalidated_at: new Date().toISOString() }).eq('id', data.id);
      return reply(503, { error: 'Verification email could not be delivered. Request another link later.' });
    }
    return reply(200, { sent: true });
  } catch { return reply(400, { error: 'Could not process this verification request.' }); }
});