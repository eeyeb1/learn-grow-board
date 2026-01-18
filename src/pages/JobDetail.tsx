import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { jobDetails } from "@/data/jobDetails";
import { useJobStorage } from "@/hooks/useJobStorage";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  Building2, 
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Heart
} from "lucide-react";

const JobDetail = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const job = id ? jobDetails[id] : null;
  const { user } = useAuth();
  const { isFavorite, hasApplied, toggleFavorite } = useJobStorage();

  const isFav = id ? isFavorite(id) : false;
  const alreadyApplied = id ? hasApplied(id) : false;

  const handleToggleFavorite = async () => {
    if (!id) return;
    
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const newState = await toggleFavorite(id);
    toast.success(newState ? "Added to favorites" : "Removed from favorites");
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display font-bold text-2xl text-foreground mb-4">
            Job Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The opportunity you're looking for doesn't exist or has been removed.
          </p>
          <Button variant="hero" asChild>
            <Link to="/jobs">Browse All Opportunities</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const locationTypeLabels = {
    remote: "Remote",
    "on-site": "On-site",
    hybrid: "Hybrid",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <Link 
            to="/jobs" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to opportunities
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Job Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  {job.companyLogo ? (
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-1">
                    {job.title}
                  </h1>
                  <p className="text-lg text-muted-foreground">{job.company}</p>
                </div>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant={job.skillLevel}>{job.skillLevel}</Badge>
                <Badge variant={job.industry}>{job.industry}</Badge>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="w-3 h-3" />
                  {locationTypeLabels[job.locationType]}
                </Badge>
              </div>

              {/* Quick info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {job.hoursPerWeek}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {job.duration}
                </span>
                {job.applicants !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {job.applicants} applicants
                  </span>
                )}
              </div>
            </div>

            {/* Apply Card */}
            <Card className="p-6 lg:w-80 shrink-0 h-fit">
              <div className="flex gap-2 mb-4">
                {alreadyApplied ? (
                  <Button variant="outline" size="lg" className="flex-1" disabled>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    Applied
                  </Button>
                ) : (
                  <Button variant="hero" size="lg" className="flex-1" asChild>
                    <Link to={`/jobs/${id}/apply`}>Apply Now</Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleToggleFavorite}
                  className={isFav ? "text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" : ""}
                >
                  <Heart className={`w-5 h-5 ${isFav ? "fill-current" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Posted {job.postedAt}
              </p>
              <div className="border-t border-border pt-4">
                <h4 className="font-semibold text-sm text-foreground mb-3">Skills needed</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="soft" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div>
                <h2 className="font-display font-semibold text-xl text-foreground mb-4">
                  About this opportunity
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Responsibilities */}
              <div>
                <h2 className="font-display font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  What you'll do
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-muted-foreground">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h2 className="font-display font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Requirements
                </h2>
                <ul className="space-y-3">
                  {job.requirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What You'll Learn */}
              <div className="bg-primary/5 rounded-2xl p-6">
                <h2 className="font-display font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  What you'll learn
                </h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {job.whatYouWillLearn.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mentorship */}
              <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <h2 className="font-display font-semibold text-xl text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Mentorship & Support
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {job.mentorshipDetails}
                </p>
              </Card>
            </div>

            {/* Sidebar - Company Info */}
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-display font-semibold text-lg text-foreground mb-4">
                  About {job.company}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {job.companyDescription}
                </p>
                {job.companyWebsite && (
                  <a 
                    href={job.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline"
                  >
                    Visit website
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                )}
              </Card>

              {/* Mobile Apply Button */}
              <div className="lg:hidden space-y-2">
                <div className="flex gap-2">
                  {alreadyApplied ? (
                    <Button variant="outline" size="lg" className="flex-1" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                      Applied
                    </Button>
                  ) : (
                    <Button variant="hero" size="lg" className="flex-1" asChild>
                      <Link to={`/jobs/${id}/apply`}>Apply Now</Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleToggleFavorite}
                    className={isFav ? "text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" : ""}
                  >
                    <Heart className={`w-5 h-5 ${isFav ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
      />
    </div>
  );
};

export default JobDetail;
