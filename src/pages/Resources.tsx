import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, FileText, HelpCircle, ArrowRight, Lightbulb, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const resources = [
  {
    icon: Lightbulb,
    title: "How to Stand Out Without Experience",
    description: "Learn strategies to highlight your potential and land your first opportunity.",
    category: "For Learners",
    link: "/blog/how-to-stand-out",
  },
  {
    icon: Users,
    title: "Mentoring Beginners Effectively",
    description: "A guide for companies on creating meaningful learning experiences.",
    category: "For Companies",
    link: "/blog/mentoring-beginners",
  },
  {
    icon: Shield,
    title: "Understanding Free Experience vs. Exploitation",
    description: "Know your rights and what to expect from ethical experience opportunities.",
    category: "Guidelines",
    link: "/blog/experience-vs-exploitation",
  },
  {
    icon: FileText,
    title: "Building Your Portfolio from Scratch",
    description: "Turn your experience roles into impressive portfolio pieces.",
    category: "For Learners",
    link: "/blog/building-portfolio",
  },
];

const faqs = [
  {
    question: "Are these opportunities really free?",
    answer: "Yes, all opportunities on ExpBoard are unpaid, experience-based roles. They're designed to help you build skills, not replace paid employment.",
  },
  {
    question: "What do I get in return for my time?",
    answer: "You gain real-world experience, portfolio pieces, references, and skills that can help you land paid positions in the future.",
  },
  {
    question: "How long are typical experience roles?",
    answer: "Duration varies from 1-2 weeks to several months, depending on the role. Each listing clearly states the time commitment.",
  },
  {
    question: "Is this legal?",
    answer: "Experience-based roles are legal when they're truly educational, the company doesn't directly benefit from the work, and it doesn't replace paid employees.",
  },
];

const Resources = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-12 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-secondary-foreground" />
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
              Resources & Guides
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to make the most of your experience journey.
            </p>
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {resources.map((resource, index) => {
              const CardContent = (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <resource.icon className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-primary mb-1 block">
                      {resource.category}
                    </span>
                    <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {resource.description}
                    </p>
                  </div>
                </div>
              );

              return resource.link ? (
                <Link key={index} to={resource.link}>
                  <Card className="p-6 hover:shadow-elevated transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/30">
                    {CardContent}
                  </Card>
                </Link>
              ) : (
                <Card
                  key={index}
                  className="p-6 hover:shadow-elevated transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/30"
                >
                  {CardContent}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <HelpCircle className="w-6 h-6 text-primary" />
              <h2 className="font-display font-bold text-2xl text-foreground">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-2xl text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <Button variant="hero" size="lg" asChild>
            <Link to="/jobs">
              Browse Opportunities
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Resources;
