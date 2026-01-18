import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJobStorage } from "@/hooks/useJobStorage";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { supabase } from "@/integrations/supabase/client";
import { jobDetails } from "@/data/jobDetails";
import {
  Heart,
  FileEdit,
  CheckCircle2,
  Building2,
  MapPin,
  Clock,
  Trash2,
  ArrowRight,
  Inbox,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Application {
  id: string;
  job_id: string;
  user_id: string;
  form_data: unknown;
  status: string;
  submitted_at: string;
  job_title?: string;
}

const Archive = () => {
  const { user, userType } = useAuth();
  const { isCompany, companyProfile } = useCompanyProfile();
  const {
    favorites,
    applied,
    drafts,
    deleteDraft,
    removeFavorite,
    removeApplied,
  } = useJobStorage();

  const [companyApplications, setCompanyApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Fetch applications for company's jobs
  useEffect(() => {
    const fetchCompanyApplications = async () => {
      if (!isCompany || !companyProfile) return;

      setLoadingApplications(true);
      try {
        // First get all jobs for this company
        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id, title")
          .eq("company_id", companyProfile.id);

        if (jobsError || !jobs || jobs.length === 0) {
          setCompanyApplications([]);
          return;
        }

        const jobIds = jobs.map((job) => job.id);
        const jobTitleMap = Object.fromEntries(jobs.map((job) => [job.id, job.title]));

        // Then get all applications for those jobs
        const { data: applications, error: appsError } = await supabase
          .from("applications")
          .select("*")
          .in("job_id", jobIds)
          .order("submitted_at", { ascending: false });

        if (appsError) {
          console.error("Error fetching applications:", appsError);
          return;
        }

        // Add job title to each application
        const appsWithTitles = (applications || []).map((app) => ({
          ...app,
          job_title: jobTitleMap[app.job_id] || "Unknown Role",
        }));

        setCompanyApplications(appsWithTitles);
      } catch (error) {
        console.error("Error fetching company applications:", error);
      } finally {
        setLoadingApplications(false);
      }
    };

    fetchCompanyApplications();
  }, [isCompany, companyProfile]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const locationTypeLabels = {
    remote: "Remote",
    "on-site": "On-site",
    hybrid: "Hybrid",
  };

  const EmptyState = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
  }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      <Button variant="hero" asChild>
        <Link to="/jobs">Browse Opportunities</Link>
      </Button>
    </div>
  );

  const JobCard = ({
    jobId,
    savedAt,
    type,
    onRemove,
    extraInfo,
  }: {
    jobId: string;
    savedAt: string;
    type: "favorite" | "draft" | "applied";
    onRemove: () => void;
    extraInfo?: React.ReactNode;
  }) => {
    const job = jobDetails[jobId];

    if (!job) {
      return (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Job no longer available
                </p>
                <p className="text-xs text-muted-foreground">ID: {jobId}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="group hover:shadow-card transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={job.company}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Building2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>

            {/* Job Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {job.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    onRemove();
                  }}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {locationTypeLabels[job.locationType]}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {job.duration}
                </span>
                <Badge variant={job.skillLevel} className="text-xs">
                  {job.skillLevel}
                </Badge>
              </div>

              {/* Extra info and timestamp */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {extraInfo}
                  <span className="text-xs text-muted-foreground">
                    {type === "favorite" && "Saved"}
                    {type === "draft" && "Last edited"}
                    {type === "applied" && "Applied"} {formatDate(savedAt)}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  asChild
                >
                  <Link
                    to={
                      type === "draft" ? `/jobs/${jobId}/apply` : `/jobs/${jobId}`
                    }
                  >
                    {type === "draft" ? "Continue" : "View"}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Application Card for company view
  const ApplicationCard = ({ application }: { application: Application }) => {
    const formData = application.form_data as Record<string, unknown> | null;
    const applicantName = formData?.fullName as string || "Unknown Applicant";
    const applicantEmail = formData?.email as string || "";

    return (
      <Card className="group hover:shadow-card transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {applicantName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{applicantEmail}</p>
                </div>
                <Badge
                  variant="soft"
                  className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {application.status}
                </Badge>
              </div>

              <div className="mt-2">
                <p className="text-sm text-foreground">
                  Applied for: <span className="font-medium">{application.job_title}</span>
                </p>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Applied {formatDate(application.submitted_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              My Archive
            </h1>
            <p className="text-muted-foreground">
              {isCompany 
                ? "View applications to your posted roles"
                : "Track your saved jobs, application drafts, and submissions"}
            </p>
          </div>

          {/* Company View - Show Applications */}
          {isCompany ? (
            <Tabs defaultValue="applications" className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-8">
                <TabsTrigger value="applications" className="gap-2">
                  <Users className="w-4 h-4" />
                  Applications
                  {companyApplications.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {companyApplications.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="applications">
                {loadingApplications ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : companyApplications.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No applications yet"
                    description="Applications to your posted roles will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {companyApplications.map((app) => (
                      <ApplicationCard key={app.id} application={app} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            /* Applicant View - Show Favorites, Drafts, Applied */
            <Tabs defaultValue="favorites" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="favorites" className="gap-2">
                  <Heart className="w-4 h-4" />
                  Favorites
                  {favorites.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {favorites.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="drafts" className="gap-2">
                  <FileEdit className="w-4 h-4" />
                  Drafts
                  {drafts.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {drafts.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="applied" className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Applied
                  {applied.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {applied.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Favorites Tab */}
              <TabsContent value="favorites">
                {favorites.length === 0 ? (
                  <EmptyState
                    icon={Heart}
                    title="No favorites yet"
                    description="Save jobs you're interested in by clicking the heart icon on job details."
                  />
                ) : (
                  <div className="space-y-4">
                    {favorites.map((fav) => (
                      <JobCard
                        key={fav.jobId}
                        jobId={fav.jobId}
                        savedAt={fav.savedAt}
                        type="favorite"
                        onRemove={() => {
                          removeFavorite(fav.jobId);
                          toast.success("Removed from favorites");
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Drafts Tab */}
              <TabsContent value="drafts">
                {drafts.length === 0 ? (
                  <EmptyState
                    icon={FileEdit}
                    title="No drafts saved"
                    description="Your application drafts will appear here when you start filling out applications."
                  />
                ) : (
                  <div className="space-y-4">
                    {drafts.map((draft) => (
                      <JobCard
                        key={draft.jobId}
                        jobId={draft.jobId}
                        savedAt={draft.savedAt}
                        type="draft"
                        onRemove={() => {
                          deleteDraft(draft.jobId);
                          toast.success("Draft deleted");
                        }}
                        extraInfo={
                          draft.formData.fullName && (
                            <Badge variant="outline" className="text-xs">
                              {draft.formData.fullName}
                            </Badge>
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Applied Tab */}
              <TabsContent value="applied">
                {applied.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No applications yet"
                    description="Jobs you've applied to will appear here so you can track your progress."
                  />
                ) : (
                  <div className="space-y-4">
                    {applied.map((app) => (
                      <JobCard
                        key={app.jobId}
                        jobId={app.jobId}
                        savedAt={app.appliedAt}
                        type="applied"
                        onRemove={() => {
                          removeApplied(app.jobId);
                          toast.success("Removed from applied jobs");
                        }}
                        extraInfo={
                          <Badge
                            variant="soft"
                            className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          >
                            Submitted
                          </Badge>
                        }
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Archive;
