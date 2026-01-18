import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, User, Phone, Linkedin, Github, FileText, CheckCircle, Upload, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  companyName: string;
}

type ApplyView = "form" | "success";

const ApplyModal = ({ open, onOpenChange, jobTitle, companyName }: ApplyModalProps) => {
  const [view, setView] = useState<ApplyView>("form");
  const [loading, setLoading] = useState(false);
  
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
        jobTitle,
        companyName,
      });
      
      setView("success");
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      linkedin: "",
      github: "",
      portfolio: "",
      coverLetter: "",
    });
    setResumeFile(null);
    setView("form");
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after animation completes
    setTimeout(resetForm, 300);
  };

  // Success View
  if (view === "success") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              Application Submitted!
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Your application for <span className="font-medium text-foreground">{jobTitle}</span> at{" "}
              <span className="font-medium text-foreground">{companyName}</span> has been sent successfully.
            </p>
            <p className="text-sm text-muted-foreground">
              The team will review your application and get back to you soon.
            </p>
          </div>

          <div className="space-y-3">
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Browse More Roles
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Application Form View
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Apply for this Role</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4" />
            {jobTitle} at {companyName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Personal Information</p>
            
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
          </div>

          <Separator />

          {/* Links & Portfolio */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Links & Portfolio</p>

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
          </div>

          <Separator />

          {/* Resume & Cover Letter */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Resume & Cover Letter</p>

            <div className="space-y-2">
              <Label htmlFor="resume">Resume / CV</Label>
              <div className="relative">
                <label
                  htmlFor="resume"
                  className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30"
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
                        Click to upload (PDF, DOC - max 5MB)
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
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 50 characters. Be specific about your interest and what you can contribute.
              </p>
            </div>
          </div>

          <Separator />

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
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
      </DialogContent>
    </Dialog>
  );
};

export default ApplyModal;
