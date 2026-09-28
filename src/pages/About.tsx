import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sprout,
  Repeat2,
  Wrench,
  SunMedium,
  Compass,
  FileText,
  Target,
  HandHeart,
  Eye,
  Star,
  Building2,
  HeartHandshake,
} from "lucide-react";

const journeys = [
  {
    icon: Sprout,
    title: "Starting Out",
    text: "For people taking their first steps into the world of work.",
  },
  {
    icon: Repeat2,
    title: "Changing Careers",
    text: "For people exploring a completely different industry or profession.",
  },
  {
    icon: Wrench,
    title: "Building New Skills",
    text: "For people who want practical experience alongside what they already know.",
  },
  {
    icon: SunMedium,
    title: "Returning to Work",
    text: "For people rebuilding confidence and experience after time away from employment.",
  },
  {
    icon: Compass,
    title: "Exploring Something New",
    text: "For anyone who wants to understand an industry before committing to it.",
  },
  {
    icon: FileText,
    title: "Building Your CV",
    text: "For people looking to strengthen their experience and demonstrate what they can do.",
  },
];

const experiences = [
  "Work experience placements",
  "Internships",
  "Job shadowing",
  "Virtual work experience",
  "Volunteering",
  "Short-term projects",
  "Insight days",
  "Industry experiences",
  "Entry-level opportunities",
  "Skills-based projects",
  "Career exploration opportunities",
];

const values = [
  {
    icon: Target,
    title: "Opportunity",
    text: "People should have meaningful ways to gain experience.",
  },
  {
    icon: HandHeart,
    title: "Accessibility",
    text: "Opportunities should be easier to discover and understand.",
  },
  {
    icon: Eye,
    title: "Transparency",
    text: "People should know exactly what an opportunity involves, including whether it is paid or unpaid.",
  },
  {
    icon: Star,
    title: "Potential",
    text: "What someone has done before should not be the only measure of what they could become.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20 gradient-subtle relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/40 blur-3xl"
        />
        <div className="container mx-auto px-4 relative max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-soft mb-6">
            <HeartHandshake className="w-4 h-4 text-primary" />
            About Us
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance">
            Everyone Deserves a Chance to Gain Experience.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mb-8">
            Experience can open doors, but getting that first opportunity isn't
            always easy. We're building a platform that helps people from all
            backgrounds find meaningful ways to learn, grow and gain real-world
            experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/jobs">
              <Button variant="hero" size="lg" className="w-full sm:w-auto">
                Find Opportunities
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/post-role">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Become a Partner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl">
          <div>
            <h2 className="font-display font-bold text-2xl md:text-4xl text-foreground mb-6">
              Why We Exist
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Too often, people are told they need experience before they can
                get an opportunity — but how are you supposed to gain experience
                if nobody gives you the chance to start?
              </p>
              <p className="font-medium text-foreground">
                That's the problem we want to help solve.
              </p>
              <p>
                We're creating a place where people can discover practical
                opportunities to learn, contribute and build their experience,
                while organisations can connect with motivated people who are
                ready to develop.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-border bg-card shadow-elevated p-8 md:p-10 gradient-subtle">
              <div className="space-y-4">
                {[
                  "Students",
                  "Graduates",
                  "Career changers",
                  "People returning to work",
                  "People with little or no experience",
                  "People entering a new industry",
                  "Experienced professionals exploring a new path",
                  "Anyone who simply needs a chance",
                ].map((group, i) => (
                  <div
                    key={group}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft animate-fade-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {group}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-6 text-center">
                Experience is for everyone — at every age and every stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="py-16 md:py-20 bg-accent/50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="font-display font-semibold text-sm uppercase tracking-widest text-primary mb-4">
            Our Mission
          </h2>
          <p className="font-display font-bold text-2xl md:text-4xl text-foreground mb-6 text-balance">
            To make gaining real-world experience more accessible to everyone.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Your background, age, education or previous career should not
            automatically determine whether you deserve an opportunity. We aim
            to help remove some of the barriers between people who want
            experience and organisations willing to provide it.
          </p>
        </div>
      </section>

      {/* There's No One Right Time to Start */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display font-bold text-2xl md:text-4xl text-foreground mb-4">
              There's No One Right Time to Start.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              People look for experience for many different reasons. Whether you
              see yourself in one of these journeys — or somewhere entirely your
              own — you're welcome here.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {journeys.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-elevated"
              >
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {text}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-10">
            You don't have to fit into one specific category — every journey
            counts.
          </p>
        </div>
      </section>

      {/* What You Can Find */}
      <section className="py-16 md:py-20 bg-accent/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display font-bold text-2xl md:text-4xl text-foreground mb-4">
              Different Experiences. Different Journeys.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The platform may feature opportunities such as:
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {experiences.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-soft"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-10">
            Whether an opportunity is paid or unpaid is clearly labelled, so you
            always know what you're applying for.
          </p>
        </div>
      </section>

      {/* For Organisations */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="rounded-3xl border border-border bg-card shadow-card p-8 md:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="w-12 h-12 rounded-xl gradient-warm flex items-center justify-center mb-5">
                <Building2 className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h2 className="font-display font-bold text-2xl md:text-4xl text-foreground mb-4 text-balance">
                Giving Someone a Chance Can Make a Difference.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                Behind every opportunity is someone looking for their chance to
                prove themselves. By opening your organisation to new talent,
                you can help someone develop valuable skills while discovering
                motivated people with fresh ideas and different perspectives.
              </p>
              <Link to="/post-role">
                <Button variant="secondary" size="lg">
                  Become a Partner
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div
              aria-hidden="true"
              className="hidden lg:flex flex-col gap-4 pr-4"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-24 h-16 rounded-2xl border border-border gradient-subtle shadow-soft"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 md:py-20 gradient-subtle">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display font-bold text-2xl md:text-4xl text-foreground mb-4">
              What We Believe
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 shadow-card text-center"
              >
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl gradient-hero shadow-elevated p-10 md:p-16 text-center max-w-5xl mx-auto">
            <h2 className="font-display font-bold text-2xl md:text-4xl lg:text-5xl text-primary-foreground mb-5 text-balance">
              You Don't Need the Perfect Background. You Just Need an
              Opportunity.
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
              Whether you're starting out, starting again or simply trying
              something new, our goal is to help you find experience that can
              move you forward.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/jobs">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto bg-primary-foreground text-foreground hover:bg-primary-foreground/90 border-transparent"
                >
                  Explore Opportunities
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/post-role">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Partner With Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
