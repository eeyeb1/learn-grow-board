import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Info,
  Building2,
  Users,
  Database,
  ListChecks,
  Scale,
  Send,
  Eye,
  Briefcase,
  HeartHandshake,
  Share2,
  Cookie,
  Bot,
  Globe,
  ShieldCheck,
  Clock,
  UserCheck,
  ExternalLink,
  Bell,
  Calendar,
  Mail,
  Flag,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

/*
  NOTE TO WEBSITE OWNER (internal — not rendered):
  - "Last updated" date below should reflect the date you publish.
  - Placeholders for legal name, website URL, privacy contact email and business
    address appear in sections 2, 17 and 22 — replace them with real details.
  - Several sections deliberately note that details (analytics, storage
    locations, retention periods, AI use, verification steps) must be confirmed
    against the platform's ACTUAL setup before publication — keep or remove
    those notes as the real arrangements are confirmed.
  - Have the final Privacy Policy reviewed by a qualified legal professional
    before launch. This page is a plain-English draft, not legal advice.
*/

const LAST_UPDATED = "1 October 2026";

type Section = {
  id: string;
  number: string;
  title: string;
  icon: typeof FileText;
  body: React.ReactNode;
};

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-2">
    {children}
  </p>
);

const sections: Section[] = [
  {
    id: "introduction",
    number: "01",
    title: "Introduction",
    icon: FileText,
    body: (
      <>
        <p>
          Welcome to Expboard. Expboard is a platform designed to make work
          experience and practical learning opportunities more accessible to
          people from all backgrounds. We connect individuals looking to
          develop their skills and gain experience with businesses offering
          work-experience opportunities.
        </p>
        <p>
          This Privacy Policy explains how Expboard collects, uses, stores,
          shares and protects personal information when you visit our website,
          create an account, apply for opportunities, publish opportunities or
          communicate through the platform.
        </p>
        <p>
          We aim to handle personal information responsibly, collect only what
          is necessary and explain our practices clearly. This policy is
          intended to be read by applicants, business representatives and
          website visitors, including users aged 16 and 17.
        </p>
      </>
    ),
  },
  {
    id: "who-is-responsible",
    number: "02",
    title: "Who is responsible for your personal information?",
    icon: Building2,
    body: (
      <>
        <p>
          The organisation responsible for deciding how and why your personal
          information is processed is known as the data controller. For this
          policy:
        </p>
        <ul>
          <li>
            <strong className="text-foreground">Platform name:</strong> Expboard
          </li>
          <li>
            <strong className="text-foreground">
              Legal name of the data controller:
            </strong>{" "}
            [Insert registered company or individual business name]
          </li>
          <li>
            <strong className="text-foreground">Website:</strong> [Insert
            website URL]
          </li>
          <li>
            <strong className="text-foreground">Privacy contact:</strong>{" "}
            [Insert privacy contact email]
          </li>
          <li>
            <strong className="text-foreground">Business address:</strong>{" "}
            [Insert business address, where applicable]
          </li>
        </ul>
        <p>
          Expboard's legal operating structure and data controller details must
          be confirmed before this policy is published.
        </p>
      </>
    ),
  },
  {
    id: "who-can-use",
    number: "03",
    title: "Who can use Expboard?",
    icon: Users,
    body: (
      <>
        <p>
          Expboard is intended for individuals aged 16 and over and businesses
          that wish to offer work-experience opportunities.
        </p>
        <p>
          We recognise that our users may be at different stages of their
          education, careers and professional development. We aim to make our
          privacy information understandable and accessible to young people and
          adults alike.
        </p>
        <p>
          If you are under 18, take care when sharing personal information
          online. Avoid including unnecessary sensitive information in your
          profile, CV or applications.
        </p>
        <p>
          Expboard must establish and implement appropriate privacy and
          safeguarding arrangements for younger users, taking account of the
          nature of the opportunities offered and the personal information
          processed.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    number: "04",
    title: "What personal information do we collect?",
    icon: Database,
    body: (
      <>
        <p>
          The information we collect depends on how you use Expboard and which
          features are available.
        </p>
        <SubHeading>A. Information provided by applicants</SubHeading>
        <p>
          If you register or apply for an opportunity, we may collect your name
          and email address; your account login and authentication information;
          your telephone number, if requested; your educational background,
          skills, interests and career goals; your work experience and
          qualifications; your CV, portfolio, application answers and
          supporting documents; information about opportunities you save, view
          or apply for, where these activities are recorded; messages and
          communications sent through the platform; and information you provide
          when contacting support or reporting an opportunity.
        </p>
        <p>
          We aim to collect only information that is relevant to providing our
          services. You should not include sensitive personal information in
          your profile or applications unless it is genuinely necessary and you
          understand how it will be used.
        </p>
        <SubHeading>B. Information provided by businesses</SubHeading>
        <p>
          Businesses using Expboard may provide business and trading names;
          company contact details and business email addresses; details of
          authorised representatives; company profiles, descriptions and
          industry information; opportunity descriptions, requirements,
          locations and dates; application management information and
          communications with applicants; and information reasonably required
          for business verification, where such checks are implemented.
        </p>
        <p>
          Business information may be visible publicly when a business profile
          or opportunity is published.
        </p>
        <SubHeading>C. Information collected automatically</SubHeading>
        <p>
          When you visit Expboard, certain technical information may be
          collected, depending on the website's configuration. This may include
          your IP address; browser type and device information; website usage
          and interaction information; access times and diagnostic logs;
          security events and error reports; and cookie identifiers and similar
          technical information.
        </p>
        <p>
          We will disclose the relevant information collected through these
          technologies once our website's analytics, hosting and security
          arrangements have been confirmed.
        </p>
        <SubHeading>D. Information received from other sources</SubHeading>
        <p>
          Where applicable, Expboard may receive information from service
          providers, businesses, identity or business verification services, or
          other sources involved in delivering our services. Where information
          is obtained indirectly, we will provide the privacy information
          required by applicable law.
        </p>
        <p>
          We will not assume that we collect information from any particular
          third party unless that arrangement is actually in place.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    number: "05",
    title: "How do we use your personal information?",
    icon: ListChecks,
    body: (
      <>
        <p>Depending on the features you use, Expboard may process personal information to:</p>
        <ul>
          <li>Create and administer user and business accounts.</li>
          <li>Display and manage work-experience opportunities.</li>
          <li>Allow applicants to discover and apply for opportunities.</li>
          <li>Deliver application information to the relevant business.</li>
          <li>Allow businesses to review and manage applications.</li>
          <li>Facilitate communications between applicants and businesses.</li>
          <li>Provide customer support and respond to enquiries.</li>
          <li>Maintain platform functionality, security and reliability.</li>
          <li>Identify and investigate suspected fraud, abuse or misleading listings.</li>
          <li>Maintain relevant records and resolve disputes.</li>
          <li>Improve our services using appropriate, lawful methods.</li>
          <li>Send service-related notifications.</li>
          <li>
            Send marketing communications where permitted by law and where any
            required consent or other conditions have been satisfied.
          </li>
          <li>Comply with legal and regulatory obligations.</li>
        </ul>
        <p>
          Expboard will not use personal information for unrelated purposes
          without an appropriate lawful basis and any additional information or
          permission required by law.
        </p>
      </>
    ),
  },
  {
    id: "legal-reasons",
    number: "06",
    title: "Our legal reasons for processing personal information",
    icon: Scale,
    body: (
      <>
        <p>
          UK data protection law requires organisations to have an appropriate
          lawful basis for processing personal information. Depending on the
          activity, Expboard may rely on one or more of the following lawful
          bases where the relevant conditions are met:
        </p>
        <ul>
          <li>
            <strong className="text-foreground">Contractual necessity:</strong>{" "}
            where processing is necessary to provide a service requested by a
            user or to take steps requested before entering into a contract.
          </li>
          <li>
            <strong className="text-foreground">Legitimate interests:</strong>{" "}
            where processing is necessary for a legitimate interest pursued by
            Expboard or another party, provided those interests are not
            overridden by the individual's rights and interests. The relevant
            interests and balancing considerations must be assessed and
            documented.
          </li>
          <li>
            <strong className="text-foreground">Consent:</strong> where an
            individual has freely agreed to a clearly explained use of their
            personal information and consent is the appropriate lawful basis.
          </li>
          <li>
            <strong className="text-foreground">Legal obligation:</strong>{" "}
            where processing is necessary to comply with an applicable legal
            obligation.
          </li>
        </ul>
        <p>
          The lawful basis used will depend on the specific purpose. Expboard
          will identify and document the appropriate basis for each processing
          activity before launch and provide any additional information
          required by law.
        </p>
        <p>
          Where processing relies on consent, you may withdraw that consent.
          Withdrawal does not affect the lawfulness of processing carried out
          before withdrawal.
        </p>
      </>
    ),
  },
  {
    id: "applications",
    number: "07",
    title: "How applications work and who receives your information",
    icon: Send,
    body: (
      <>
        <p>
          Expboard supports applications made through the platform and
          applications made through external channels.
        </p>
        <SubHeading>Applications submitted through Expboard</SubHeading>
        <p>
          When you apply through Expboard, the information you submit may be
          shared with the business offering the relevant opportunity. This may
          include your name, contact details, CV, profile information,
          application answers and other documents you choose to submit. The
          information shared will depend on the application form and the
          details requested for that opportunity.
        </p>
        <p>
          Before you submit an application, Expboard should clearly explain
          which information will be sent to the business and how it will be
          used. The receiving business may use your information to review your
          application, contact you, arrange an interview or manage the
          opportunity. The business may have separate data protection
          responsibilities and may need to provide its own privacy information.
        </p>
        <SubHeading>Applications submitted externally</SubHeading>
        <p>
          Some opportunities may direct you to a business's own website,
          application system or email address. When you follow an external link
          and submit information directly to that business, the business's own
          systems and privacy policy will generally govern its handling of the
          information it receives.
        </p>
        <p>
          Expboard may still process information about your interaction with
          the opportunity if this is supported by the website's actual features
          and an appropriate lawful basis. We will not claim that Expboard
          controls personal information submitted directly to an external
          business when it does not. Please review the external business's
          privacy policy before providing personal information.
        </p>
      </>
    ),
  },
  {
    id: "public-profiles",
    number: "08",
    title: "Public profiles and visibility",
    icon: Eye,
    body: (
      <>
        <p>Expboard's profile visibility settings are still being finalised.</p>
        <p>
          Before this policy is published, Expboard will confirm whether
          applicant profiles are private, visible to businesses, or publicly
          accessible. Until the relevant settings have been established,
          Expboard must not make unsupported promises about who can view
          profile information.
        </p>
        <p>
          Where profile visibility controls are available, the website will
          explain which information is visible, to whom it is visible and how
          users can manage their settings.
        </p>
        <p>
          Applicants should avoid placing telephone numbers, personal email
          addresses, home addresses or other unnecessary private details in
          publicly visible fields.
        </p>
      </>
    ),
  },
  {
    id: "information-for-businesses",
    number: "09",
    title: "Information for businesses",
    icon: Briefcase,
    body: (
      <>
        <p>
          Businesses can use Expboard to publish opportunities and manage
          applications. Expboard may process business account details,
          opportunity information, application records and communications to
          provide these services.
        </p>
        <p>
          Businesses must ensure that their listings are accurate and that they
          have the necessary authority to submit personal information about
          other individuals. Businesses must handle applicant information
          lawfully, use it only for appropriate purposes, protect it against
          unauthorised access and retain it only as long as necessary.
        </p>
        <p>
          Where a business receives applicant information, it is responsible
          for determining and meeting its own data protection obligations in
          relation to that information.
        </p>
        <p>
          Expboard may introduce proportionate measures to review or verify
          businesses and investigate reports of misleading listings. Any
          verification process will be described accurately once implemented.
        </p>
      </>
    ),
  },
  {
    id: "fair-access",
    number: "10",
    title: "Fair access, equality and sensitive information",
    icon: HeartHandshake,
    body: (
      <>
        <p>
          Expboard aims to make work experience accessible to people from a
          wide range of backgrounds. We do not intend for personal information
          to be used for unlawful discrimination.
        </p>
        <p>
          We will collect information about characteristics such as ethnicity,
          disability, religion or other sensitive matters only where a specific
          purpose justifies doing so and the applicable legal requirements have
          been met. Special-category personal information requires an
          additional legal condition as well as an appropriate lawful basis.
        </p>
        <p>
          We will not require applicants to disclose sensitive information
          unnecessarily. Where equality monitoring is introduced, its purpose,
          participation arrangements, access controls and retention will be
          explained separately.
        </p>
        <p>
          Businesses remain responsible for complying with applicable equality
          and other relevant laws when offering and managing opportunities.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    number: "11",
    title: "Sharing personal information",
    icon: Share2,
    body: (
      <>
        <p>
          Expboard may share personal information where necessary and lawful
          with the following categories of recipients:
        </p>
        <ul>
          <li>Businesses receiving applications.</li>
          <li>Hosting, database and website infrastructure providers.</li>
          <li>Account authentication and security providers.</li>
          <li>Email, communications and customer-support providers.</li>
          <li>Analytics providers, if used.</li>
          <li>Professional advisers and insurers, where appropriate.</li>
          <li>
            Regulators, law enforcement authorities or other parties where
            legally justified.
          </li>
          <li>
            A successor organisation in connection with a proposed or completed
            business transfer, subject to applicable law.
          </li>
        </ul>
        <p>
          The actual providers used by Expboard must be identified and assessed
          before publication. Where third-party service providers process
          personal information on our behalf, we will put appropriate
          contractual and security arrangements in place.
        </p>
        <p>
          Expboard does not sell personal information to third parties for
          their independent marketing purposes. We will not share personal
          information for unrelated purposes without an appropriate lawful
          basis and any additional transparency or consent required by law.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    number: "12",
    title: "Cookies and similar technologies",
    icon: Cookie,
    body: (
      <>
        <p>
          Expboard may use cookies and similar technologies to support website
          functionality, account sessions, security and user preferences. The
          types of cookies used will depend on the website's actual
          configuration.
        </p>
        <p>
          If analytics, advertising or other non-essential tracking
          technologies are introduced, Expboard will explain their purposes and
          provide appropriate choices. Where consent is legally required,
          non-essential cookies and similar technologies will not be activated
          before the necessary consent is obtained.
        </p>
        <p>
          Users will be able to manage their cookie preferences through the
          controls provided by the website, where applicable. A cookie notice
          and any linked cookie policy must reflect the technologies actually
          in use.
        </p>
      </>
    ),
  },
  {
    id: "ai-and-automation",
    number: "13",
    title: "Artificial intelligence and automated processing",
    icon: Bot,
    body: (
      <>
        <p>
          Expboard's use of artificial intelligence and automated processing
          has not yet been confirmed.
        </p>
        <p>
          Before publication, Expboard will establish whether any AI tools or
          automated systems are used to recommend opportunities, match
          applicants with businesses, analyse CVs, assess applications, rank
          candidates or support moderation. If such features are introduced,
          Expboard will explain their purpose, the personal information
          involved and any significant effects on users.
        </p>
        <p>
          Where required by law, Expboard will provide appropriate information
          and safeguards for profiling or automated decision-making. We will
          not claim that applications are assessed exclusively by humans or
          that AI is never used unless this accurately reflects the service.
        </p>
      </>
    ),
  },
  {
    id: "storage-and-transfers",
    number: "14",
    title: "Data storage and international transfers",
    icon: Globe,
    body: (
      <>
        <p>
          Expboard may rely on third-party infrastructure and service providers
          to operate the website. The locations where personal information is
          stored or accessed have not yet been confirmed.
        </p>
        <p>
          Before launch, Expboard will identify the relevant providers, storage
          locations and any international transfers. Where personal information
          is transferred outside the UK, Expboard will use an appropriate
          transfer mechanism or other safeguard where required by applicable
          law.
        </p>
        <p>
          We will not claim that information is stored exclusively in the UK
          unless this has been verified.
        </p>
      </>
    ),
  },
  {
    id: "security",
    number: "15",
    title: "How we protect personal information",
    icon: ShieldCheck,
    body: (
      <>
        <p>
          Expboard will take appropriate technical and organisational measures
          to protect personal information against unauthorised access, loss,
          alteration, disclosure or destruction. The measures adopted will
          reflect the nature of the information, the risks involved and the
          website's actual technical arrangements.
        </p>
        <p>
          Depending on the final implementation, safeguards may include access
          restrictions, secure authentication, encryption, monitoring, backups
          and procedures for responding to security incidents. Only authorised
          individuals should have access to personal information where access
          is necessary for their responsibilities.
        </p>
        <p>
          No online service can guarantee absolute security. If a personal data
          breach occurs, Expboard will assess its legal obligations and notify
          affected individuals or the relevant authority where required. The
          final policy must be consistent with the security measures actually
          implemented.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    number: "16",
    title: "How long we keep information",
    icon: Clock,
    body: (
      <>
        <p>
          Expboard will retain personal information only for as long as
          necessary for the purposes for which it was collected, taking account
          of applicable legal obligations and legitimate business requirements.
          The precise retention periods have not yet been confirmed.
        </p>
        <p>Before publication, Expboard will establish retention rules for:</p>
        <ul>
          <li>Active and inactive user accounts.</li>
          <li>CVs, profiles and application records.</li>
          <li>Business accounts and opportunity listings.</li>
          <li>Messages and customer-support enquiries.</li>
          <li>Security logs and fraud investigations.</li>
          <li>Records required for legal or regulatory purposes.</li>
        </ul>
        <p>
          Where information is no longer needed, it will be securely deleted or
          anonymised where appropriate, subject to lawful retention
          requirements. Closing an account will not necessarily remove every
          record immediately if particular information must lawfully be
          retained. Where applicable, we will explain the reason for retaining
          it.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    number: "17",
    title: "Your privacy rights",
    icon: UserCheck,
    body: (
      <>
        <p>
          Depending on the circumstances, your rights under applicable data
          protection law may include:
        </p>
        <ul>
          <li>
            <strong className="text-foreground">Right of access:</strong> asking
            for a copy of your personal information.
          </li>
          <li>
            <strong className="text-foreground">Right to rectification:</strong>{" "}
            asking us to correct inaccurate or incomplete information.
          </li>
          <li>
            <strong className="text-foreground">Right to erasure:</strong>{" "}
            asking us to delete personal information where the legal conditions
            are met.
          </li>
          <li>
            <strong className="text-foreground">Right to restriction:</strong>{" "}
            asking us to restrict certain processing.
          </li>
          <li>
            <strong className="text-foreground">Right to object:</strong>{" "}
            objecting to processing where the relevant legal conditions apply.
          </li>
          <li>
            <strong className="text-foreground">Right to data portability:</strong>{" "}
            receiving certain information in a portable format where the right
            applies.
          </li>
          <li>
            <strong className="text-foreground">Right to withdraw consent:</strong>{" "}
            withdrawing consent where consent is the lawful basis.
          </li>
          <li>
            <strong className="text-foreground">
              Rights relating to automated decisions:
            </strong>{" "}
            exercising applicable rights where decisions are made solely by
            automated means and the relevant legal conditions apply.
          </li>
        </ul>
        <p>
          These rights are subject to the conditions and exceptions set out in
          applicable law. To exercise your rights, contact us at:
        </p>
        <p>
          <strong className="text-foreground">Email:</strong> [Insert privacy
          contact email]
        </p>
        <p>
          We may need to verify your identity before responding. We will
          respond within the applicable legal time limits.
        </p>
        <p>
          You also have the right to raise concerns with the UK Information
          Commissioner's Office (ICO):{" "}
          <a
            href="https://ico.org.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            https://ico.org.uk/
          </a>
        </p>
      </>
    ),
  },
  {
    id: "users-16-17",
    number: "18",
    title: "Privacy for users aged 16 and 17",
    icon: Users,
    body: (
      <>
        <p>Expboard allows users aged 16 and 17 to access the platform.</p>
        <p>
          We aim to explain our privacy practices in clear language so that
          younger users can understand how their information is used and make
          informed decisions about what they share. Young users should be able
          to access appropriate information about their privacy rights and how
          to exercise them.
        </p>
        <p>
          We will consider the specific risks associated with collecting and
          sharing young people's information, particularly when applications
          involve direct contact with businesses.
        </p>
        <p>
          Before launch, Expboard will assess whether a data protection impact
          assessment and additional child-focused design safeguards are
          required. We will also establish appropriate reporting, moderation
          and safeguarding procedures that reflect the services offered.
        </p>
        <p>
          We will not assume that parental consent is always required or that
          it is never required; the applicable requirements depend on the
          processing activity and legal basis.
        </p>
      </>
    ),
  },
  {
    id: "external-websites",
    number: "19",
    title: "External websites",
    icon: ExternalLink,
    body: (
      <>
        <p>
          Expboard may contain links to external websites operated by
          businesses or other organisations.
        </p>
        <p>
          We do not control the privacy practices of external websites. When
          you visit an external website, review its privacy policy and check
          how your information will be handled before submitting it.
        </p>
        <p>
          Our responsibility for information processed by an external
          organisation depends on the circumstances and our respective roles
          under applicable law.
        </p>
      </>
    ),
  },
  {
    id: "marketing",
    number: "20",
    title: "Marketing communications",
    icon: Bell,
    body: (
      <>
        <p>
          If Expboard sends marketing communications, it will do so in
          accordance with applicable privacy and electronic communications
          laws. Where required, we will obtain consent before sending marketing
          messages.
        </p>
        <p>
          You can unsubscribe from marketing emails using the unsubscribe
          facility provided or contact us directly. Unsubscribing from
          marketing will not prevent us from sending essential service-related
          communications where appropriate.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    number: "21",
    title: "Changes to this Privacy Policy",
    icon: Calendar,
    body: (
      <>
        <p>
          We may update this Privacy Policy as Expboard develops, introduces
          new features or changes how personal information is handled. The
          latest version will be published on our website with an updated
          revision date.
        </p>
        <p>
          Where material changes require additional notification or action, we
          will take appropriate steps to inform affected users.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    number: "22",
    title: "Contact Expboard",
    icon: Mail,
    body: (
      <>
        <p>
          If you have questions about this Privacy Policy, how we use your
          personal information or how to exercise your rights, contact us:
        </p>
        <ul>
          <li>
            <strong className="text-foreground">Platform:</strong> Expboard
          </li>
          <li>
            <strong className="text-foreground">Legal organisation:</strong>{" "}
            [Insert legal name]
          </li>
          <li>
            <strong className="text-foreground">Website:</strong> [Insert
            website URL]
          </li>
          <li>
            <strong className="text-foreground">Privacy email:</strong> [Insert
            privacy contact email]
          </li>
          <li>
            <strong className="text-foreground">Business address:</strong>{" "}
            [Insert address, where applicable]
          </li>
        </ul>
        <p>
          We will review privacy enquiries and respond in accordance with
          applicable legal requirements.
        </p>
        <div className="pt-2">
          <ContactButton />
        </div>
      </>
    ),
  },
];

function ContactButton() {
  const { toast } = useToast();
  return (
    <Button variant="outline" onClick={() =>
      toast({
        title: "Contact form coming soon",
        description:
          "In-app contact is on the way. In the meantime, please reach out via the details listed in this section once they are confirmed.",
      })
    }>
      <Mail className="w-4 h-4 mr-2" />
      Contact Us
    </Button>
  );
}

const SectionHeading = ({
  icon: Icon,
  number,
  title,
}: {
  icon: typeof FileText;
  number: string;
  title: string;
}) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-accent-foreground" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Section {number}
      </p>
      <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">
        {title}
      </h2>
    </div>
  </div>
);

const Privacy = () => {
  const { toast } = useToast();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-14 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-3xl md:text-5xl text-foreground mb-4">
              Privacy Policy.
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              How we collect, use, store and protect your personal information
              — written in plain English wherever possible.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </div>

          <Card className="max-w-2xl mx-auto mt-8 p-4 flex items-start gap-3 border-primary/20 bg-accent/40">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">
              This policy applies to everyone who uses the platform —
              applicants, business representatives and website visitors,
              including users aged 16 and 17.
            </p>
          </Card>
        </div>
      </section>

      {/* Table of contents */}
      <section className="py-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-6">
            <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              On this page
            </h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1.5 flex items-baseline gap-2"
                >
                  <span className="text-xs font-semibold text-primary/70">{s.number}</span>
                  {s.title}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Sections */}
      <section className="pb-14">
        <div className="container mx-auto px-4 max-w-3xl space-y-10">
          {sections.map((s) => (
            <div key={s.id} id={s.id} className="scroll-mt-20">
              <SectionHeading icon={s.icon} number={s.number} title={s.title} />
              <Card className="p-6 border-border/50">
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  {s.body}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Draft notice */}
      <section className="pb-14">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-4 flex items-start gap-3 border-secondary/40 bg-secondary/5">
            <Flag className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              This Privacy Policy is a draft and must be completed and checked
              against Expboard's actual data practices before publication. It
              does not replace legal advice or guarantee compliance with
              applicable law.
            </p>
          </Card>
        </div>
      </section>

      {/* Related policies */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-4">
            Related Policies.
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            This Privacy Policy works alongside the other policies that keep
            the community safe and clear.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Button variant="hero" asChild>
              <Link to="/terms">
                Terms of Use
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/guidelines">Community Guidelines</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/privacy#cookies">Cookie Policy</Link>
            </Button>
            <Button variant="outline" onClick={() =>
              toast({
                title: "Thank you for helping keep the community safe",
                description:
                  "In-app reporting is coming soon. If something needs urgent attention, please contact us directly.",
              })
            }>
              <Flag className="w-4 h-4 mr-2" />
              Report a Problem
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Privacy;
