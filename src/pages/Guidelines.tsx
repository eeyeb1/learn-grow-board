import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  HeartHandshake,
  BadgeCheck,
  Briefcase,
  AlertTriangle,
  Lock,
  MessagesSquare,
  ShieldCheck,
  Flag,
  ArrowRight,
  Gavel,
  Info,
} from "lucide-react";
import { Link } from "react-router-dom";

const dishonestBehaviours = [
  "Fake company profiles",
  "Fake opportunities",
  "Misleading job descriptions",
  "False qualifications or experience",
  "Pretending to represent another organisation",
  "Hiding important information about an opportunity",
];

const listingMustHaves = [
  "What the opportunity involves",
  "Location",
  "Whether it is remote, hybrid, or in person",
  "Duration",
  "Expected hours",
  "Requirements",
  "Whether it is paid or unpaid",
  "Application deadline where applicable",
];

const scamBehaviours = [
  "Requests for unnecessary payments",
  "Fake recruitment schemes",
  "Pyramid schemes",
  "Suspicious investment opportunities",
  "Requests for passwords or security codes",
  "Attempts to steal financial or personal information",
  "Misleading paid courses disguised as work experience",
];

const sensitiveInfo = [
  "Banking information",
  "Passwords",
  "Home addresses",
  "Passport details",
  "National Insurance numbers",
  "Verification codes",
  "Sensitive identification documents",
];

const unprofessional = [
  "Sexual or inappropriate messages",
  "Threats",
  "Harassment",
  "Repeated unwanted messages",
  "Spam",
  "Fraudulent links",
  "Discriminatory comments",
];

const reportableIssues = [
  "Fake opportunities",
  "Scam attempts",
  "Harassment",
  "Discrimination",
  "Inappropriate messages",
  "Misleading company information",
  "Unsafe behaviour",
  "Suspicious requests for money",
  "Other guideline violations",
];

const enforcementActions = [
  "Remove content or opportunity listings",
  "Issue warnings",
  "Restrict account features",
  "Temporarily suspend accounts",
  "Permanently remove accounts",
  "Prevent organisations from posting future opportunities",
];

const SectionHeading = ({
  icon: Icon,
  title,
}: {
  icon: typeof HeartHandshake;
  title: string;
}) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-accent-foreground" />
    </div>
    <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">
      {title}
    </h2>
  </div>
);

const Guidelines = () => {
  const { toast } = useToast();

  const handleReport = () => {
    toast({
      title: "Thank you for helping keep the community safe",
      description:
        "In-app reporting is coming soon. If something needs urgent attention, please contact us directly.",
    });
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
              Building a Safe and Respectful Community.
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Our platform exists to help people discover opportunities, gain
              experience, and connect with organisations in a safe, honest, and
              respectful environment.
            </p>
          </div>

          <Card className="max-w-2xl mx-auto mt-8 p-4 flex items-start gap-3 border-primary/20 bg-accent/40">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">
              These guidelines apply to everyone using the platform —
              applicants, employers, organisations, and partners alike.
            </p>
          </Card>
        </div>
      </section>

      {/* Sections */}
      <section className="py-14">
        <div className="container mx-auto px-4 max-w-3xl space-y-10">
          {/* Respect */}
          <div>
            <SectionHeading icon={HeartHandshake} title="Treat Everyone With Respect." />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-4">
                Harassment, bullying, threats, discrimination, hate speech,
                abusive behaviour, or inappropriate conduct are not allowed —
                anywhere on the platform, in any message, listing, or profile.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Everyone here deserves to be treated fairly, regardless of
                their background, age, experience level, race, religion,
                disability, gender, sexuality, or personal circumstances. We
                are a community built on encouragement, not judgement.
              </p>
            </Card>
          </div>

          {/* Honesty */}
          <div>
            <SectionHeading icon={BadgeCheck} title="Keep It Honest." />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-5">
                Provide accurate information when creating profiles, posting
                opportunities, or applying for roles. Honesty is what makes
                genuine connections possible.
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Not allowed
              </p>
              <ul className="space-y-2.5">
                {dishonestBehaviours.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Genuine opportunities */}
          <div>
            <SectionHeading icon={Briefcase} title="Only Post Genuine Opportunities." />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-5">
                Employers and organisations should only post opportunities they
                are genuinely authorised to offer, and every listing should
                clearly include:
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
                {listingMustHaves.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <BadgeCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Misleading or suspicious listings may be removed without
                notice.
              </p>
            </Card>
          </div>

          {/* Scams — prominent */}
          <div>
            <SectionHeading icon={AlertTriangle} title="No Scams. No Exploitation." />
            <Card className="p-6 border-secondary/40 bg-secondary/5">
              <p className="text-muted-foreground leading-relaxed mb-5">
                The platform must never be used to scam, deceive, or
                financially exploit another person. This includes:
              </p>
              <ul className="space-y-2.5 mb-5">
                {scamBehaviours.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <AlertTriangle className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-3 rounded-xl bg-secondary/10 p-4">
                <AlertTriangle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/90 leading-relaxed">
                  If anything feels off — a strange payment request, a too-good-to-be-true
                  offer, pressure to act quickly — please report it. You could
                  protect someone else in the community.
                </p>
              </div>
            </Card>
          </div>

          {/* Personal information */}
          <div>
            <SectionHeading icon={Lock} title="Protect Your Personal Information." />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-5">
                Never share sensitive information publicly on the platform,
                including:
              </p>
              <ul className="space-y-2.5 mb-5">
                {sensitiveInfo.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Employers should only request information that is reasonably
                necessary for an application or placement — nothing more.
              </p>
            </Card>
          </div>

          {/* Professional communication */}
          <div>
            <SectionHeading icon={MessagesSquare} title="Keep Communication Professional." />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-5">
                Communication between users should stay respectful and relevant
                to the opportunity. The following are never acceptable:
              </p>
              <ul className="space-y-2.5">
                {unprofessional.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Safety */}
          <div>
            <SectionHeading icon={ShieldCheck} title="Safety Comes First." />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-4">
                You should never feel pressured to take part in an opportunity
                or interaction that feels unsafe, suspicious, or
                inappropriate. Your comfort and safety matter more than any
                opportunity.
              </p>
              <p className="text-foreground/80 leading-relaxed">
                If something does not feel right, stop communicating and report
                the situation. We are here to help.
              </p>
            </Card>
          </div>

          {/* Reporting */}
          <div>
            <SectionHeading icon={Flag} title="See Something Wrong? Tell Us." />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-5">
                You can report any of the following, and every report helps
                keep the community safe:
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5 mb-6">
                {reportableIssues.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Flag className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Button onClick={handleReport} className="w-full sm:w-auto">
                <Flag className="w-4 h-4 mr-2" />
                Report a Problem
              </Button>
            </Card>
          </div>

          {/* Enforcement */}
          <div>
            <SectionHeading icon={Gavel} title="What Happens When Guidelines Are Broken?" />
            <Card className="p-6 border-border/50">
              <p className="text-muted-foreground leading-relaxed mb-5">
                Depending on how serious a situation is, we may:
              </p>
              <ul className="space-y-2.5 mb-5">
                {enforcementActions.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Serious violations — especially anything involving scams,
                exploitation, or threats to someone's safety — may result in
                immediate action.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final message */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-4">
            Opportunity Works Better When Everyone Plays Their Part.
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Our goal is to create a place where people can gain experience,
            organisations can discover motivated individuals, and everyone
            feels respected and safe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/jobs">
                Explore Opportunities
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={handleReport}>
              <Flag className="w-4 h-4 mr-2" />
              Report a Problem
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-10">
            These Community Guidelines should be read alongside our Terms &
            Conditions and Privacy Policy.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Guidelines;
