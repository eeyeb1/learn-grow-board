import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  UserRound,
  Search,
  Send,
  Award,
  Building2,
  FilePlus2,
  Users,
  TrendingUp,
  ArrowRight,
  Compass,
  Handshake,
  Sparkles,
} from "lucide-react";

const candidateSteps = [
  {
    icon: UserRound,
    title: "Create Your Profile",
    text: "Create a free profile and tell us about your interests, skills, education and the type of experience you're looking for.",
  },
  {
    icon: Search,
    title: "Discover Opportunities",
    text: "Browse work experience, internships, job shadowing, virtual experiences, volunteering opportunities and more. Filter by industry, location, remote availability, duration and whether the opportunity is paid or unpaid.",
  },
  {
    icon: Send,
    title: "Apply",
    text: "Once you find an opportunity that interests you, view the full details and apply. Keep the application process simple and easy to understand — especially if you've never applied for work experience before.",
  },
  {
    icon: Award,
    title: "Gain Experience",
    text: "Connect with employers, build real-world experience, develop new skills and strengthen your CV.",
  },
];

const employerSteps = [
  {
    icon: Building2,
    title: "Create Your Company Profile",
    text: "Create a company profile explaining who you are, what your organisation does and what opportunities you provide.",
  },
  {
    icon: FilePlus2,
    title: "Post an Opportunity",
    text: "Post internships, work experience, insight days, shadowing opportunities, volunteering opportunities or virtual experiences. Clearly state whether the opportunity is paid or unpaid, its location, duration, requirements and application deadline.",
  },
  {
    icon: Users,
    title: "Reach Emerging Talent",
    text: "Your opportunity becomes discoverable by young people actively looking to gain experience and start their careers. Receive and review applications from interested candidates.",
  },
  {
    icon: TrendingUp,
    title: "Find Your Next Talent",
    text: "Connect with motivated young people, provide valuable experience and potentially discover future employees.",
  },
];

type Audience = "candidates" | "employers";

const HowItWorks = () => {
  const [audience, setAudience] = useState<Audience>("candidates");
  const steps = audience === "candidates" ? candidateSteps : employerSteps;
  const stepPrefix = audience === "candidates" ? "01" : "02";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-14 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-5 shadow-soft">
            <Compass className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl text-foreground mb-4 text-balance">
            Finding Experience Shouldn't Be Complicated.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Whether you're looking for your first opportunity or looking to
            give someone their first chance, we make the process simple.
          </p>
        </div>
      </section>

      {/* Toggle */}
      <section className="pt-12">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-border bg-card p-1 shadow-soft">
            {(
              [
                { key: "candidates", label: "For Candidates", icon: UserRound },
                { key: "employers", label: "For Employers", icon: Building2 },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setAudience(key)}
                aria-pressed={audience === key}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  audience === key
                    ? "gradient-hero text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-14">
        <div className="container mx-auto px-4">
          <ol className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Connecting line (desktop) */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-px bg-border"
            />
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <li key={step.title} className="relative">
                  <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col transition-shadow hover:shadow-elevated">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative z-10 w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shrink-0">
                        <StepIcon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <span className="font-display text-3xl font-bold text-accent-foreground/30">
                        {stepPrefix}{i + 1}
                      </span>
                    </div>
                    <h2 className="font-display font-semibold text-lg text-foreground mb-2">
                      Step {i + 1} — {step.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                  {/* Arrow to next step (tablet/desktop) */}
                  {i < steps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden lg:flex absolute top-10 -right-4 w-8 h-8 rounded-full bg-card border border-border items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="flex justify-center mt-12">
            <Link to={audience === "candidates" ? "/jobs" : "/post-role"}>
              <Button variant="hero" size="lg">
                {audience === "candidates"
                  ? "Explore Opportunities"
                  : "Post an Opportunity"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* One Platform. Two Goals. */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-5 shadow-soft">
            <Handshake className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="font-display font-bold text-2xl md:text-4xl text-foreground mb-4">
            One Platform. Two Goals. More Opportunities.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The platform exists to make it easier for young people to access
            meaningful work experience while helping employers discover
            motivated early-career talent.
          </p>
        </div>

        <div className="container mx-auto px-4 mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card text-center">
            <div className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-xl text-foreground mb-2">
              Looking for Experience?
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Discover opportunities and start building your future.
            </p>
            <Link to="/jobs">
              <Button variant="hero" className="w-full sm:w-auto">
                Find Opportunities
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="rounded-3xl border border-border bg-card p-8 shadow-card text-center">
            <div className="w-12 h-12 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-xl text-foreground mb-2">
              Looking for Talent?
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Give someone their first opportunity and meet emerging talent.
            </p>
            <Link to="/post-role">
              <Button variant="warm" className="w-full sm:w-auto">
                Become a Partner
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorks;
