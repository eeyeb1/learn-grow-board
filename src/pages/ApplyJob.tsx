import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { jobDetails } from "@/data/jobDetails";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Building2, 
  Briefcase,
  Loader2, 
  Mail, 
  User, 
  Phone, 
  Linkedin, 
  Github, 
  FileText, 
  CheckCircle, 
  Upload,
  GraduationCap
} from "lucide-react";

const ApplyJob = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const job = id ? jobDetails[id] : null;
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
    coverLetter: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (!formData.fullName || !formData.email || !formData.coverLetter) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Application submitted:", {
        ...formData,
        resume: resumeFile?.name,
        jobId: id,
        jobTitle: job?.title,
        companyName: job?.company,
      });
      
      setSubmitted(true);
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Job not found
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

  // Success View
  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                  Application Submitted!
                </h1>
                <p className="text-muted-foreground max-w-md mb-2">
                  Your application for <span className="font-medium text-foreground">{job.title}</span> at{" "}
                  <span className="font-medium text-foreground">{job.company}</span> has been sent successfully.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  The team will review your application and get back to you soon.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                  <Button className="flex-1" asChild>
                    <Link to="/jobs">Browse More Roles</Link>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to={`/jobs/${id}`}>View Job Details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Application Form
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Back Link */}
          <Link 
            to={`/jobs/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to job details
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Application Form */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Apply for this Role
                </h1>
                <p className="text-muted-foreground">
                  Complete the form below to submit your application
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Enter your full name"
                          value={formData.fullName}
                          onChange={(e) => handleChange("fullName", e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={formData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Links & Portfolio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Linkedin className="w-5 h-5 text-primary" />
                      Links & Portfolio
                    </CardTitle>
                    <CardDescription>
                      Help the company learn more about your work
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn Profile</Label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="linkedin"
                            type="url"
                            placeholder="linkedin.com/in/..."
                            value={formData.linkedin}
                            onChange={(e) => handleChange("linkedin", e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="github">GitHub / GitLab</Label>
                        <div className="relative">
                          <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="github"
                            type="url"
                            placeholder="github.com/..."
                            value={formData.github}
                            onChange={(e) => handleChange("github", e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio / Personal Website</Label>
                      <Input
                        id="portfolio"
                        type="url"
                        placeholder="https://yourportfolio.com"
                        value={formData.portfolio}
                        onChange={(e) => handleChange("portfolio", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Resume & Cover Letter */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Resume & Cover Letter
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resume">Resume / CV</Label>
                      <div className="relative">
                        <label
                          htmlFor="resume"
                          className="flex items-center justify-center gap-2 w-full p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30"
                        >
                          {resumeFile ? (
                            <>
                              <FileText className="w-5 h-5 text-primary" />
                              <span className="text-sm text-foreground">{resumeFile.name}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click to upload your resume (PDF, DOC - max 5MB)
                              </span>
                            </>
                          )}
                        </label>
                        <input
                          id="resume"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coverLetter">Why are you interested in this role? *</Label>
                      <Textarea
                        id="coverLetter"
                        placeholder="Tell us why you're excited about this opportunity and what you hope to learn..."
                        value={formData.coverLetter}
                        onChange={(e) => handleChange("coverLetter", e.target.value)}
                        rows={6}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Be specific about your interest and what you can contribute. Minimum 50 characters recommended.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => navigate(`/jobs/${id}`)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Job Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base text-muted-foreground">Applying for</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
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
                      <div>
                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location} • {locationTypeLabels[job.locationType]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{job.hoursPerWeek}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="w-4 h-4" />
                        <span>{job.duration}</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>Skills</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="soft" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{job.skills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApplyJob;
