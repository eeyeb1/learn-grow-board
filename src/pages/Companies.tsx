import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles, ArrowRight, Users } from "lucide-react";
import { Link } from "react-router-dom";

const LOGO_COUNT = 12;

const Companies = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-14 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-5 shadow-soft">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            Companies
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We're building a network of employers offering valuable work
            experience opportunities.
          </p>
        </div>
      </section>

      {/* Coming soon badge */}
      <section className="pt-12">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-soft">
            <Sparkles className="w-4 h-4 text-primary" />
            Coming Soon
          </div>
        </div>
      </section>

      {/* Partner logo placeholders */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: LOGO_COUNT }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-muted/60 border border-border/40 flex flex-col items-center justify-center gap-2 opacity-60 select-none"
                aria-hidden="true"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground/60" />
                </div>
                <div className="h-2 w-14 rounded-full bg-muted" />
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground/80 mt-6">
            Partner logos coming soon
          </p>

          <div className="max-w-2xl mx-auto text-center mt-10">
            <p className="text-muted-foreground leading-relaxed">
              We're currently onboarding employers who are passionate about
              mentoring the next generation. Verified company partners will be
              featured here soon — check back to discover the organisations
              investing in real-world experience.
            </p>
          </div>
        </div>
      </section>

      {/* Employer CTA */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl gradient-hero px-6 py-12 md:py-16 text-center shadow-elevated">
            <div className="relative z-10 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-background/15 flex items-center justify-center mx-auto mb-5">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-primary-foreground mb-3">
                Want to reach motivated young talent?
              </h2>
              <p className="text-primary-foreground/80 mb-8">
                Join the first group of employers shaping the platform and
                connect with ambitious learners eager to prove themselves.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/post-role">
                  <Button variant="outline" size="lg" className="bg-background text-foreground hover:bg-background/90 border-transparent w-full sm:w-auto">
                    Become a Partner
                  </Button>
                </Link>
                <Link to="/post-role">
                  <Button size="lg" className="w-full sm:w-auto">
                    Post an Opportunity
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student CTA */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-2xl text-foreground mb-3">
            Ready to start gaining experience?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            You don't have to wait for partner companies — real opportunities
            are already live on the platform right now.
          </p>
          <Link to="/jobs">
            <Button variant="hero" size="lg">
              Check current opportunities
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Companies;
