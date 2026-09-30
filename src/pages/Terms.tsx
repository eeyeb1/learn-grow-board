import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Info,
  Building2,
  UserCheck,
  UserCircle,
  Briefcase,
  ShieldCheck,
  Scale,
  Handshake,
  CreditCard,
  CheckCircle2,
  Lock,
  Globe,
  Copyright,
  Eye,
  Ban,
  Wifi,
  AlertTriangle,
  Calendar,
  Gavel,
  Mail,
  Flag,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

/*
  NOTE TO WEBSITE OWNER (internal — not rendered):
  - "Last updated" date below should reflect the date you publish.
  - Section 18 (Governing Law) uses a [JURISDICTION] placeholder — confirm with a
    qualified legal professional before launch.
  - Section 19 (Contact) uses placeholders for business name, email, address and
    registration number — replace with real details.
  - Have the final Terms of Use reviewed by a qualified legal professional before
    launch, especially because the platform connects people with paid and unpaid
    work opportunities. This page is not legal advice.
*/

const LAST_UPDATED = "30 September 2026";

type Section = {
  id: string;
  number: string;
  title: string;
  icon: typeof FileText;
  body: React.ReactNode;
};

const reportableNote = (
  <>
    If anything feels wrong — a suspicious request, a listing that seems fake,
    or behaviour that concerns you — please tell us. Reporting it could protect
    someone else in the community.
  </>
);


const sections: Section[] = [
  {
    id: "about-the-platform",
    number: "01",
    title: "About the Platform",
    icon: Building2,
    body: (
      <>
        <p>
          This platform is designed to help connect people seeking experience
          with employers and organisations offering opportunities. Depending on
          how a particular opportunity reaches you, the platform may act as a
          marketplace or connection service.
        </p>
        <p>
          The platform is not automatically the employer, recruiter, agent, or
          representative of any organisation posting an opportunity. Unless we
          clearly state otherwise, opportunities are offered by the relevant
          employer or organisation, and they are responsible for their own
          listings and decisions.
        </p>
        <p>
          We do not guarantee that any user will receive an interview, a
          placement, a work experience opportunity, an internship, employment,
          or any other outcome.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    number: "02",
    title: "Eligibility",
    icon: UserCheck,
    body: (
      <>
        <p>
          You must be legally permitted to use the platform. Individual
          opportunities may also have their own eligibility requirements, such
          as:
        </p>
        <ul>
          <li>Age requirements</li>
          <li>Location</li>
          <li>Right to work</li>
          <li>Qualifications</li>
          <li>Experience level</li>
          <li>Availability</li>
        </ul>
        <p>
          Where users under 18 may access the platform, additional parental,
          guardian, employer, or safeguarding requirements may apply depending
          on the opportunity. These are set by the relevant employer or
          organisation and by applicable law — not by this platform.
        </p>
      </>
    ),
  },
  {
    id: "user-accounts",
    number: "03",
    title: "User Accounts",
    icon: UserCircle,
    body: (
      <>
        <p>
          You are responsible for keeping your account details accurate and
          secure. That means you should:
        </p>
        <ul>
          <li>Provide accurate information</li>
          <li>Keep your login details confidential</li>
          <li>Not share your account with others</li>
          <li>Notify us if you suspect unauthorised access to your account</li>
          <li>Not impersonate another person or organisation</li>
        </ul>
        <p>
          Accounts may be suspended or removed where there is misuse or a
          serious breach of these Terms of Use.
        </p>
      </>
    ),
  },
  {
    id: "candidate-responsibilities",
    number: "04",
    title: "Candidate Responsibilities",
    icon: Briefcase,
    body: (
      <>
        <p>
          If you are searching for or applying to opportunities, you are
          responsible for making sure the information you provide is truthful
          and accurate. You must not:
        </p>
        <ul>
          <li>Provide false qualifications</li>
          <li>Misrepresent your experience</li>
          <li>Submit fraudulent applications</li>
          <li>Impersonate another person</li>
          <li>Abuse or harass employers</li>
          <li>Use the platform for unlawful purposes</li>
        </ul>
        <p>
          You are also responsible for deciding whether an opportunity is
          suitable for you. Please review the details carefully, ask questions
          where something is unclear, and use your own judgement before
          applying or accepting.
        </p>
      </>
    ),
  },
  {
    id: "employer-responsibilities",
    number: "05",
    title: "Employer and Organisation Responsibilities",
    icon: Handshake,
    body: (
      <>
        <p>
          Employers and organisations must only publish genuine opportunities
          that they are authorised to offer, and must provide accurate
          information about:
        </p>
        <ul>
          <li>Responsibilities</li>
          <li>Location</li>
          <li>Duration</li>
          <li>Working hours</li>
          <li>Requirements</li>
          <li>Application deadlines</li>
          <li>Whether the opportunity is paid or unpaid</li>
          <li>Any relevant costs or commitments</li>
        </ul>
        <p>Employers must not post:</p>
        <ul>
          <li>Fake opportunities</li>
          <li>Misleading opportunities</li>
          <li>Discriminatory listings</li>
          <li>Scams</li>
          <li>Pyramid schemes</li>
          <li>Illegal work</li>
          <li>Opportunities intended to financially exploit users</li>
          <li>Advertisements disguised as work experience</li>
        </ul>
        <p>
          We may review, reject, suspend, or remove listings that appear
          unsafe, misleading, unlawful, or inappropriate.
        </p>
      </>
    ),
  },
  {
    id: "paid-and-unpaid",
    number: "06",
    title: "Paid and Unpaid Opportunities",
    icon: Scale,
    body: (
      <>
        <p>
          Opportunities on the platform may be paid or unpaid. Employers are
          responsible for ensuring that their opportunities comply with
          applicable employment, minimum wage, internship, volunteering, and
          other relevant laws.
        </p>
        <Card className="p-4 flex items-start gap-3 border-primary/20 bg-accent/40">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p>
            Simply describing an opportunity as "work experience",
            "internship", or "volunteering" does not automatically determine
            its legal status. We do not provide legal advice to employers or
            candidates regarding employment status. If you are uncertain about
            your rights or obligations, please obtain independent advice.
          </p>
        </Card>
      </>
    ),
  },
  {
    id: "applications-and-recruitment",
    number: "07",
    title: "Applications and Recruitment",
    icon: CheckCircle2,
    body: (
      <>
        <p>
          The platform may allow users to discover, apply for, or express
          interest in opportunities. However, we do not guarantee:
        </p>
        <ul>
          <li>A response from an employer</li>
          <li>An interview</li>
          <li>Acceptance</li>
          <li>A placement</li>
          <li>Employment</li>
          <li>Payment</li>
          <li>Future employment</li>
        </ul>
        <p>
          Recruitment and selection decisions are generally made by the
          relevant employer or organisation, not by the platform.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    number: "08",
    title: "Fees and Paid Services",
    icon: CreditCard,
    body: (
      <>
        <p>
          Some platform features may be free while others may become paid
          services. Examples may include:
        </p>
        <ul>
          <li>Featured opportunity listings</li>
          <li>Employer subscriptions</li>
          <li>Promotional listings</li>
          <li>Sponsored opportunities</li>
          <li>Premium employer features</li>
          <li>Partnership services</li>
        </ul>
        <p>
          Where fees apply, the price and payment terms will be shown before
          you purchase. Any applicable refund or cancellation terms will be
          explained at the point of purchase for the relevant paid service.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    number: "09",
    title: "Acceptable Use",
    icon: ShieldCheck,
    body: (
      <>
        <p>You must not use the platform to:</p>
        <ul>
          <li>Break the law</li>
          <li>Harass others</li>
          <li>Discriminate against users</li>
          <li>Spread malware</li>
          <li>Attempt to hack the platform</li>
          <li>Scrape or collect data without permission</li>
          <li>Send spam</li>
          <li>Create fake accounts</li>
          <li>Commit fraud</li>
          <li>Upload harmful or illegal content</li>
          <li>Interfere with the operation of the website</li>
          <li>Attempt to gain unauthorised access to other accounts or systems</li>
        </ul>
        <p>
          These rules work alongside our{" "}
          <Link to="/guidelines" className="text-primary underline underline-offset-4 hover:opacity-80">
            Community Guidelines
          </Link>
          , which explain in more detail what respectful, honest participation
          looks like.
        </p>
      </>
    ),
  },
  {
    id: "safety-and-verification",
    number: "10",
    title: "Safety and Verification",
    icon: Eye,
    body: (
      <>
        <p>
          We may take reasonable steps to review or verify employers,
          organisations, users, or opportunities where appropriate. However, we
          cannot confirm the identity or intentions of every person or
          organisation using the platform.
        </p>
        <p>
          Please use reasonable care when communicating with others — never
          share sensitive information like passwords or banking details, and
          let us know if something does not feel right.
        </p>
        {reportableNote}
        <div className="pt-2">
          <ReportButton />
        </div>
      </>
    ),
  },
  {
    id: "third-party",
    number: "11",
    title: "Third-Party Websites and Services",
    icon: ExternalLink,
    body: (
      <>
        <p>
          Opportunities or profiles may contain links to external websites or
          services. We are not responsible for the content, availability,
          security, or practices of third-party websites.
        </p>
        <p>
          Please review the terms and privacy policies of any external service
          before using it.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    number: "12",
    title: "Intellectual Property",
    icon: Copyright,
    body: (
      <>
        <p>
          The platform's branding, website design, original text, software,
          graphics, and other content we own may be protected by intellectual
          property laws. You should not copy, reproduce, distribute, or
          commercially exploit platform content without permission.
        </p>
        <p>
          You retain responsibility for content you upload, such as profile
          information, logos, opportunity descriptions, images, and company
          information. You also allow us to display that content where
          necessary to operate the service.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    number: "13",
    title: "Privacy",
    icon: Lock,
    body: (
      <p>
        Personal information is handled in accordance with our{" "}
        <Link to="/privacy" className="text-primary underline underline-offset-4 hover:opacity-80">
          Privacy Policy
        </Link>
        , which explains what we collect and how we use it. That policy is not
        duplicated here.
      </p>
    ),
  },
  {
    id: "suspension-and-termination",
    number: "14",
    title: "Suspension and Termination",
    icon: Ban,
    body: (
      <>
        <p>We may restrict, suspend, or terminate access where users:</p>
        <ul>
          <li>Seriously or repeatedly breach these Terms of Use</li>
          <li>Violate our Community Guidelines</li>
          <li>Engage in fraud</li>
          <li>Post unsafe or misleading opportunities</li>
          <li>Abuse other users</li>
          <li>Attempt to compromise platform security</li>
        </ul>
        <p>You may also request closure of your account at any time.</p>
      </>
    ),
  },
  {
    id: "availability",
    number: "15",
    title: "Platform Availability",
    icon: Wifi,
    body: (
      <>
        <p>
          We make reasonable efforts to keep the platform available, but
          uninterrupted access cannot be guaranteed. The platform may
          occasionally be unavailable due to:
        </p>
        <ul>
          <li>Maintenance</li>
          <li>Technical issues</li>
          <li>Updates</li>
          <li>Security incidents</li>
          <li>Circumstances outside our reasonable control</li>
        </ul>
      </>
    ),
  },
  {
    id: "limitation-of-responsibility",
    number: "16",
    title: "Limitation of Responsibility",
    icon: AlertTriangle,
    body: (
      <>
        <p>
          We cannot guarantee the behaviour of users, employers, organisations,
          or third parties on the platform. You should make your own decisions
          when choosing whether to apply for, accept, or participate in an
          opportunity.
        </p>
        <p>
          Nothing in these Terms of Use excludes or limits responsibility in
          ways that would be unlawful.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    number: "17",
    title: "Changes to These Terms",
    icon: Calendar,
    body: (
      <>
        <p>
          These Terms of Use may be updated from time to time. Where
          appropriate, significant changes may be communicated to users.
        </p>
        <p className="text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    number: "18",
    title: "Governing Law",
    icon: Gavel,
    body: (
      <p>
        These Terms of Use are governed by the laws of [JURISDICTION], subject
        to any rights you may have under applicable law.
      </p>
    ),
  },
  {
    id: "contact",
    number: "19",
    title: "Questions About These Terms?",
    icon: Mail,
    body: (
      <>
        <p>If you have questions about these Terms of Use, you can reach us at:</p>
        <ul>
          <li>Business/legal name: [BUSINESS NAME]</li>
          <li>Contact email: [CONTACT EMAIL]</li>
          <li>Registered business address (if applicable): [ADDRESS]</li>
          <li>Company registration number (if applicable): [REGISTRATION NUMBER]</li>
        </ul>
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
    <Button variant="hero" onClick={() =>
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
};

function ReportButton() {
  const { toast } = useToast();
  return (
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
  );
};

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

const Terms = () => {
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
              <FileText className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-3xl md:text-5xl text-foreground mb-4">
              Terms of Use.
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              The rules that apply when you use our platform — written in plain
              English wherever possible.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </div>

          <Card className="max-w-2xl mx-auto mt-8 p-4 flex items-start gap-3 border-primary/20 bg-accent/40">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">
              By accessing or using this platform, you agree to these Terms of
              Use. They apply to everyone who uses the website — people
              searching and applying for opportunities, employers,
              organisations, partners, and anyone creating an account.
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

      {/* Related policies */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-4">
            Related Policies.
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            These Terms of Use work alongside the other policies that keep the
            community safe and clear.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Button variant="hero" asChild>
              <Link to="/privacy">
                Privacy Policy
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/guidelines">Community Guidelines</Link>
            </Button>
            <Button variant="outline" onClick={() =>
              toast({
                title: "Cookie Policy coming soon",
                description: "We're preparing our Cookie Policy and will publish it here.",
              })
            }>
              Cookie Policy
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

export default Terms;
