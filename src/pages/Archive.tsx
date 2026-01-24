import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Mail,
  Phone,
  FileText,
  Eye,
  Check,
  X,
  Clock3,
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
  const { isCompany, companyProfile, loading: profileLoading } = useCompanyProfile();
  const { favorites, applied, drafts, deleteDraft, removeFavorite, removeApplied } = useJobStorage();

  const [companyApplications, setCompanyApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Update application status
  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase.from("applications").update({ status: newStatus }).eq("id", applicationId);

      if (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update application status");
        return;
      }

      // Update local state
      setCompanyApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app)),
      );

      // Update selected application if it's the one being updated
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      toast.success(`Application marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update application status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete single application
  const deleteApplication = async (applicationId: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("applications").delete().eq("id", applicationId);

      if (error) {
        console.error("Error deleting application:", error);
        toast.error("Failed to delete application");
        return;
      }

      setCompanyApplications((prev) => prev.filter((app) => app.id !== applicationId));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
      setSelectedApplication(null);
      toast.success("Application deleted");
    } catch (error) {
      console.error("Error deleting application:", error);
      toast.error("Failed to delete application");
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete applications
  const bulkDeleteApplications = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("applications").delete().in("id", Array.from(selectedIds));

      if (error) {
        console.error("Error bulk deleting applications:", error);
        toast.error("Failed to delete applications");
        return;
      }

      setCompanyApplications((prev) => prev.filter((app) => !selectedIds.has(app.id)));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} application(s) deleted`);
    } catch (error) {
      console.error("Error bulk deleting applications:", error);
      toast.error("Failed to delete applications");
    } finally {
      setDeleting(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedIds.size === companyApplications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companyApplications.map((app) => app.id)));
    }
  };

  // Fetch applications for company's jobs
  useEffect(() => {
    const fetchCompanyApplications = async () => {
      // Wait for profile to load
      if (profileLoading) return;

      if (!isCompany || !companyProfile) {
        setLoadingApplications(false);
        return;
      }

      setLoadingApplications(true);
      try {
        // First get all jobs for this company
        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id, title")
          .eq("company_id", companyProfile.id);

        if (jobsError || !jobs || jobs.length === 0) {
          setCompanyApplications([]);
          setLoadingApplications(false);
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
          setLoadingApplications(false);
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
  }, [isCompany, companyProfile, profileLoading]);

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
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
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
                <p className="text-sm text-muted-foreground">Job no longer available</p>
                <p className="text-xs text-muted-foreground">ID: {jobId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
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
                <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover rounded-xl" />
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

                <Button variant="ghost" size="sm" className="text-primary" asChild>
                  <Link to={type === "draft" ? `/jobs/${jobId}/apply` : `/jobs/${jobId}`}>
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
  const ApplicationCard = ({
    application,
    onClick,
    isSelected,
    onToggleSelect,
  }: {
    application: Application;
    onClick: () => void;
    isSelected: boolean;
    onToggleSelect: () => void;
  }) => {
    const formData = application.form_data as Record<string, unknown> | null;
    const applicantName = (formData?.fullName as string) || "Unknown Applicant";
    const applicantEmail = (formData?.email as string) || "";

    const getStatusStyles = (status: string) => {
      switch (status) {
        case "accepted":
          return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        case "rejected":
          return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        case "reviewed":
          return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
        default:
          return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      }
    };

    return (
      <Card
        className={`group hover:shadow-card transition-all duration-200 cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 pt-1"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
            >
              <Checkbox checked={isSelected} />
            </div>
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
                <Badge variant="soft" className={`text-xs ${getStatusStyles(application.status)}`}>
                  {application.status}
                </Badge>
              </div>

              <div className="mt-2">
                <p className="text-sm text-foreground">
                  Applied for: <span className="font-medium">{application.job_title}</span>
                </p>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">Applied {formatDate(application.submitted_at)}</span>
                <Button variant="ghost" size="sm" className="text-primary">
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Application Detail Modal
  const ApplicationDetailModal = () => {
    if (!selectedApplication) return null;

    const formData = selectedApplication.form_data as Record<string, unknown> | null;
    const applicantName = (formData?.fullName as string) || "Unknown Applicant";
    const applicantEmail = (formData?.email as string) || "";
    const applicantPhone = (formData?.phone as string) || "";
    const experience = (formData?.experience as string) || "";
    const motivation = (formData?.motivation as string) || "";
    const portfolio = (formData?.portfolio as string) || "";
    const coverLetter = (formData?.coverLetter as string) || "";

    return (
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="block">{applicantName}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Applied for {selectedApplication.job_title}
                </span>
              </div>
            </DialogTitle>
            <DialogDescription>Submitted on {formatDate(selectedApplication.submitted_at)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Contact Information
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <a href={`mailto:${applicantEmail}`} className="text-primary hover:underline">
                    {applicantEmail}
                  </a>
                </p>
                {applicantPhone && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <a href={`tel:${applicantPhone}`} className="text-primary hover:underline">
                      {applicantPhone}
                    </a>
                  </p>
                )}
                {portfolio && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Portfolio:</span>{" "}
                    <a
                      href={portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {portfolio}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Experience */}
            {experience && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Experience
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{experience}</p>
                </div>
              </div>
            )}

            {/* Motivation */}
            {motivation && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Motivation
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{motivation}</p>
                </div>
              </div>
            )}

            {/* Cover Letter */}
            {coverLetter && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-primary" />
                  Cover Letter
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{coverLetter}</p>
                </div>
              </div>
            )}

            {/* Status & Actions */}
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                <Badge
                  variant="soft"
                  className={
                    selectedApplication.status === "accepted"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : selectedApplication.status === "rejected"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : selectedApplication.status === "reviewed"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }
                >
                  {selectedApplication.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                  onClick={() => updateApplicationStatus(selectedApplication.id, "reviewed")}
                  disabled={updatingStatus || selectedApplication.status === "reviewed"}
                >
                  <Clock3 className="w-4 h-4 mr-1" />
                  Mark Reviewed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                  onClick={() => updateApplicationStatus(selectedApplication.id, "accepted")}
                  disabled={updatingStatus || selectedApplication.status === "accepted"}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => updateApplicationStatus(selectedApplication.id, "rejected")}
                  disabled={updatingStatus || selectedApplication.status === "rejected"}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/20 hover:bg-destructive/10 ml-auto"
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Application</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this application? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteApplication(selectedApplication.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Applications</h1>
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
                    {/* Bulk Actions Bar */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.size === companyApplications.length && companyApplications.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                        </span>
                      </div>
                      {selectedIds.size > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={deleting}>
                              {deleting ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-1" />
                              )}
                              Delete Selected ({selectedIds.size})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {selectedIds.size} Application(s)</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {selectedIds.size} application(s)? This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={bulkDeleteApplications}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete All
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>

                    {companyApplications.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        onClick={() => setSelectedApplication(app)}
                        isSelected={selectedIds.has(app.id)}
                        onToggleSelect={() => toggleSelection(app.id)}
                      />
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

      {/* Application Detail Modal */}
      <ApplicationDetailModal />
    </div>
  );
};

export default Archive;
