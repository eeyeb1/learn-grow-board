import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import JobCard from "@/components/JobCard";
import CompanyCard from "@/components/CompanyCard";
import { sampleJobs, sampleCompanies, stats } from "@/data/sampleData";
import { ArrowRight, Users, Building2, Award, Sparkles, BookOpen, Shield, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-illustration.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 gradient-subtle overflow-hidden relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large gradient blob - top right */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          {/* Warm accent blob - bottom left */}
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary/15 rounded-full blur-3xl" />
          
          {/* Floating geometric shapes */}
          <div className="absolute top-20 left-[10%] w-16 h-16 border-2 border-primary/20 rounded-2xl rotate-12 animate-float" />
          <div className="absolute top-40 right-[15%] w-12 h-12 bg-primary/10 rounded-xl -rotate-12 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-32 left-[20%] w-8 h-8 bg-secondary/20 rounded-lg rotate-45 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-60 left-[5%] w-6 h-6 bg-primary/15 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-20 right-[25%] w-10 h-10 border-2 border-secondary/25 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
          
          {/* Dotted pattern grid */}
          <div className="absolute top-32 right-[8%] grid grid-cols-4 gap-3 opacity-40">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
            ))}
          </div>
          
          {/* Growth/ladder icon shapes */}
          <div className="absolute bottom-40 right-[10%] flex flex-col gap-1 opacity-30">
            <div className="w-8 h-1 bg-primary/40 rounded-full" />
            <div className="w-12 h-1 bg-primary/40 rounded-full" />
            <div className="w-16 h-1 bg-primary/40 rounded-full" />
            <div className="w-20 h-1 bg-primary/40 rounded-full" />
          </div>
          
          {/* Connection lines */}
          <svg className="absolute top-1/2 left-0 w-full h-32 opacity-10" preserveAspectRatio="none">
            <path d="M0,50 Q200,20 400,60 T800,40 T1200,70 T1600,30" stroke="currentColor" strokeWidth="1" fill="none" className="text-primary" />
            <path d="M0,80 Q300,50 600,90 T1000,60 T1400,100" stroke="currentColor" strokeWidth="1" fill="none" className="text-secondary" />
          </svg>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left animate-fade-up">
              <div className="inline-flex items-center gap-2 bg-accent/80 rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-accent-foreground">
                  Experience-first job board
                </span>
              </div>

              <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6">
                Gain Real Experience.{" "}
                <span className="text-gradient-hero">Build Your Future.</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
                Connect with companies offering free, mentorship-focused opportunities. 
                Build skills, portfolios, and references — no experience required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/jobs">
                    Find Experience
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline-primary" size="xl" asChild>
                  <Link to="/post">Post a Role</Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-border">
                <div>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {stats.totalOpportunities.toLocaleString()}+
                  </p>
                  <p className="text-sm text-muted-foreground">Opportunities</p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {stats.activeCompanies}+
                  </p>
                  <p className="text-sm text-muted-foreground">Companies</p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {(stats.skillsGained / 1000).toFixed(0)}k+
                  </p>
                  <p className="text-sm text-muted-foreground">Skills Gained</p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {stats.successStories}+
                  </p>
                  <p className="text-sm text-muted-foreground">Success Stories</p>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="hidden lg:block animate-float">
              <img
                src={heroImage}
                alt="People growing careers together"
                className="w-full rounded-3xl shadow-elevated"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-background -mt-8 relative z-10">
        <div className="container mx-auto px-4">
          <SearchBar />
        </div>
      </section>

      {/* Featured Roles */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground">
                Featured Opportunities
              </h2>
              <p className="text-muted-foreground mt-1">
                Hand-picked roles from top mentoring companies
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/jobs" className="text-primary">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleJobs.slice(0, 6).map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get hands-on experience in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4 shadow-card">
                <BookOpen className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                1. Browse Opportunities
              </h3>
              <p className="text-sm text-muted-foreground">
                Search for experience roles matching your interests, skills, and availability.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4 shadow-card">
                <Handshake className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                2. Apply & Connect
              </h3>
              <p className="text-sm text-muted-foreground">
                Send your application and connect directly with companies offering mentorship.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-4 shadow-card">
                <Award className="w-7 h-7 text-background" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                3. Gain Skills & Grow
              </h3>
              <p className="text-sm text-muted-foreground">
                Build real-world skills, grow your portfolio, and earn references for your career.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Companies */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground">
                Companies Offering Experience
              </h2>
              <p className="text-muted-foreground mt-1">
                Learn from companies committed to helping you grow
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/companies" className="text-primary">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleCompanies.map((company) => (
              <CompanyCard key={company.id} {...company} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-foreground mb-2">
                  Built on Trust & Transparency
                </h2>
                <p className="text-muted-foreground">
                  We're committed to ethical, learning-focused opportunities — not exploitation.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card p-5 rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-2">Learning First</h3>
                <p className="text-sm text-muted-foreground">
                  Every role must provide genuine skill-building and mentorship opportunities.
                </p>
              </div>
              <div className="bg-card p-5 rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-2">Clear Expectations</h3>
                <p className="text-sm text-muted-foreground">
                  All listings include time commitments, skills gained, and what you'll learn.
                </p>
              </div>
              <div className="bg-card p-5 rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-2">Community Safety</h3>
                <p className="text-sm text-muted-foreground">
                  Report inappropriate listings and we'll review them within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-primary-foreground mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Join thousands of learners gaining real-world experience and building their careers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="xl"
              className="bg-background text-foreground hover:bg-background/90 shadow-elevated"
              asChild
            >
              <Link to="/jobs">Find Experience</Link>
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link to="/post">Post a Role</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
