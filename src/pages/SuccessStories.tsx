import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Trophy, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const successStories = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Now UX Designer at Spotify",
    previousRole: "Marketing Intern → UX Design",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    quote: "ExpBoard gave me the chance to work on real design projects when no one would hire me without experience. Within 6 months, I had a portfolio that landed me my dream job.",
    company: "DesignHub Co.",
    duration: "3 months experience",
    skills: ["Figma", "User Research", "Prototyping"],
  },
  {
    id: 2,
    name: "Marcus Johnson",
    role: "Now Software Engineer at Google",
    previousRole: "Bootcamp Graduate → Full-Stack Dev",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    quote: "After finishing my bootcamp, I struggled to get interviews. ExpBoard connected me with a startup where I built real features. That experience was the missing piece on my resume.",
    company: "TechStart Inc.",
    duration: "4 months experience",
    skills: ["React", "Node.js", "PostgreSQL"],
  },
  {
    id: 3,
    name: "Priya Patel",
    role: "Now Content Lead at HubSpot",
    previousRole: "English Major → Content Marketing",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    quote: "I had the writing skills but zero marketing experience. Through ExpBoard, I created content strategies for two startups. Now I lead a team of 8 content creators.",
    company: "GrowthLabs",
    duration: "2 months experience",
    skills: ["SEO", "Content Strategy", "Analytics"],
  },
];

const SuccessStories = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextStory = () => {
    setCurrentIndex((prev) => (prev + 1) % successStories.length);
  };

  const prevStory = () => {
    setCurrentIndex((prev) => (prev - 1 + successStories.length) % successStories.length);
  };

  const currentStory = successStories[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-12 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
              Success Stories
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Real people who turned experience opportunities into dream careers.
            </p>
          </div>
        </div>
      </section>

      {/* Success Stories Slider */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Main Card */}
            <Card className="relative overflow-hidden border-border/50 shadow-elevated">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image Side */}
                <div className="relative h-64 md:h-auto md:min-h-[400px] bg-gradient-to-br from-primary/20 to-secondary/20">
                  <img
                    src={currentStory.image}
                    alt={currentStory.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent md:bg-gradient-to-r" />
                  
                  {/* Mobile Name Overlay */}
                  <div className="absolute bottom-4 left-4 md:hidden">
                    <h3 className="font-display font-bold text-xl text-foreground">
                      {currentStory.name}
                    </h3>
                    <p className="text-sm text-primary font-medium">
                      {currentStory.role}
                    </p>
                  </div>
                </div>

                {/* Content Side */}
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  {/* Quote Icon */}
                  <Quote className="w-10 h-10 text-primary/30 mb-4" />
                  
                  {/* Quote */}
                  <blockquote className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
                    "{currentStory.quote}"
                  </blockquote>

                  {/* Person Info - Desktop */}
                  <div className="hidden md:block mb-6">
                    <h3 className="font-display font-bold text-xl text-foreground">
                      {currentStory.name}
                    </h3>
                    <p className="text-primary font-medium">
                      {currentStory.role}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentStory.previousRole}
                    </p>
                  </div>

                  {/* Experience Details */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                      {currentStory.company}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {currentStory.duration}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2">
                    {currentStory.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevStory}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              {/* Dots */}
              <div className="flex gap-2">
                {successStories.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentIndex
                        ? "bg-primary w-6"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextStory}
                className="rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SuccessStories;
