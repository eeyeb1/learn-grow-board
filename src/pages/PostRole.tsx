import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Clock, MapPin, GraduationCap, FileText, AlertCircle, Building2, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";

// Mock user state - in real app this would come from auth context
const useMockAuth = () => {
  // Set to true to show the Post Role form, false to show auth gate
  const [isAuthenticated] = useState(true);
  const [userType] = useState<"applicant" | "company" | null>("company");
  const [companyProfile] = useState({
    companyName: "TechStart Studio",
    companyDescription: "TechStart Studio is a dynamic web development agency focused on building modern, scalable applications. We're passionate about mentoring the next generation of developers.",
    companyWebsite: "https://techstartstudio.com",
    industry: "tech",
  });

  return { isAuthenticated, userType, companyProfile };
};

const PostRole = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userType, companyProfile } = useMockAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Job Details State - company info auto-filled from profile
  const [jobDetails, setJobDetails] = useState({
    title: "",
    location: "",
    locationType: "remote" as "remote" | "on-site" | "hybrid",
    duration: "",
    hoursPerWeek: "",
    skillLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    industry: companyProfile.industry as "tech" | "design" | "marketing" | "business",
    description: "",
    mentorshipDetails: "",
  });

  // Skills State
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // Responsibilities State
  const [responsibilities, setResponsibilities] = useState<string[]>([""]);
  
  // Requirements State
  const [requirements, setRequirements] = useState<string[]>([""]);
  
  // What You'll Learn State
  const [whatYouWillLearn, setWhatYouWillLearn] = useState<string[]>([""]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleAddListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    list: string[]
  ) => {
    setter([...list, ""]);
  };

  const handleUpdateListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    list: string[],
    index: number,
    value: string
  ) => {
    const newList = [...list];
    newList[index] = value;
    setter(newList);
  };

  const handleRemoveListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    list: string[],
    index: number
  ) => {
    if (list.length > 1) {
      setter(list.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!jobDetails.title || !jobDetails.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Filter out empty items from lists
    const filteredResponsibilities = responsibilities.filter(r => r.trim());
    const filteredRequirements = requirements.filter(r => r.trim());
    const filteredWhatYouWillLearn = whatYouWillLearn.filter(w => w.trim());

    const roleData = {
      ...jobDetails,
      company: companyProfile.companyName,
      companyDescription: companyProfile.companyDescription,
      companyWebsite: companyProfile.companyWebsite,
      skills,
      responsibilities: filteredResponsibilities,
      requirements: filteredRequirements,
      whatYouWillLearn: filteredWhatYouWillLearn,
    };

    console.log("Role data:", roleData);
    toast.success("Role posted successfully!");
    navigate("/jobs");
  };

  // Auth Gate - Show when user is not authenticated or not a company
  if (!isAuthenticated || userType !== "company") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                
                <h1 className="text-2xl font-display font-bold text-foreground mb-3">
                  Company Account Required
                </h1>
                
                <p className="text-muted-foreground max-w-md mb-8">
                  Only registered companies can post volunteer roles. Sign in with your company account or register your organization to start posting opportunities.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                  <Button 
                    className="flex-1" 
                    size="lg"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Sign In / Register
                  </Button>
                </div>

                <div className="mt-8 pt-8 border-t border-border w-full max-w-md">
                  <p className="text-sm text-muted-foreground mb-4">
                    Looking for volunteer opportunities instead?
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/jobs")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Browse Available Roles
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Benefits of registering */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Access Talent</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with motivated individuals eager to learn and contribute
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Easy Posting</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage role listings with our simple posting form
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Build Your Brand</h3>
                <p className="text-sm text-muted-foreground">
                  Showcase your organization to potential future employees
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    );
  }

  // Main Form - Only shown to authenticated company users
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Post a Volunteer Role
            </h1>
            <p className="text-muted-foreground">
              Create an opportunity for experience seekers to learn and grow with your organization.
            </p>
          </div>

          {/* Company Info Banner */}
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">Posting as {companyProfile.companyName}</p>
                <p className="text-sm text-muted-foreground truncate">{companyProfile.companyWebsite}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Role Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Role Details
                </CardTitle>
                <CardDescription>
                  Basic information about the volunteer opportunity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Role Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Junior Frontend Developer"
                    value={jobDetails.title}
                    onChange={(e) => setJobDetails({ ...jobDetails, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select
                    value={jobDetails.industry}
                    onValueChange={(value: "tech" | "design" | "marketing" | "business") => 
                      setJobDetails({ ...jobDetails, industry: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Location & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location & Time Commitment
                </CardTitle>
                <CardDescription>
                  Where and how much time is expected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., San Francisco, CA or Remote"
                      value={jobDetails.location}
                      onChange={(e) => setJobDetails({ ...jobDetails, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationType">Location Type *</Label>
                    <Select
                      value={jobDetails.locationType}
                      onValueChange={(value: "remote" | "on-site" | "hybrid") => 
                        setJobDetails({ ...jobDetails, locationType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="on-site">On-site</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      placeholder="e.g., 3 months, Ongoing"
                      value={jobDetails.duration}
                      onChange={(e) => setJobDetails({ ...jobDetails, duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoursPerWeek">Hours per Week</Label>
                    <Input
                      id="hoursPerWeek"
                      placeholder="e.g., 10-15 hours"
                      value={jobDetails.hoursPerWeek}
                      onChange={(e) => setJobDetails({ ...jobDetails, hoursPerWeek: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills & Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Skills & Experience Level
                </CardTitle>
                <CardDescription>
                  What skills are needed and at what level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="skillLevel">Skill Level Required *</Label>
                  <Select
                    value={jobDetails.skillLevel}
                    onValueChange={(value: "beginner" | "intermediate" | "advanced") => 
                      setJobDetails({ ...jobDetails, skillLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner - Willing to learn</SelectItem>
                      <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                      <SelectItem value="advanced">Advanced - Strong experience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (e.g., React, Python)"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                    />
                    <Button type="button" variant="outline" onClick={handleAddSkill}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1">
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Role Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Role Description
                </CardTitle>
                <CardDescription>
                  Describe the opportunity in detail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description">About This Opportunity *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this role involves and what makes it a great learning opportunity..."
                    value={jobDetails.description}
                    onChange={(e) => setJobDetails({ ...jobDetails, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                {/* Responsibilities */}
                <div className="space-y-2">
                  <Label>What They'll Do (Responsibilities)</Label>
                  {responsibilities.map((resp, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Responsibility ${index + 1}`}
                        value={resp}
                        onChange={(e) => handleUpdateListItem(setResponsibilities, responsibilities, index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveListItem(setResponsibilities, responsibilities, index)}
                        disabled={responsibilities.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddListItem(setResponsibilities, responsibilities)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Responsibility
                  </Button>
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <Label>Requirements</Label>
                  {requirements.map((req, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Requirement ${index + 1}`}
                        value={req}
                        onChange={(e) => handleUpdateListItem(setRequirements, requirements, index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveListItem(setRequirements, requirements, index)}
                        disabled={requirements.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddListItem(setRequirements, requirements)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Requirement
                  </Button>
                </div>

                {/* What You'll Learn */}
                <div className="space-y-2">
                  <Label>What They'll Learn</Label>
                  {whatYouWillLearn.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Learning outcome ${index + 1}`}
                        value={item}
                        onChange={(e) => handleUpdateListItem(setWhatYouWillLearn, whatYouWillLearn, index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveListItem(setWhatYouWillLearn, whatYouWillLearn, index)}
                        disabled={whatYouWillLearn.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddListItem(setWhatYouWillLearn, whatYouWillLearn)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Learning Outcome
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mentorship */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Mentorship & Support
                </CardTitle>
                <CardDescription>
                  What kind of guidance will you provide?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="mentorshipDetails">Mentorship Details</Label>
                  <Textarea
                    id="mentorshipDetails"
                    placeholder="Describe the mentorship and support you'll provide (e.g., weekly 1:1 meetings, code reviews, career guidance...)"
                    value={jobDetails.mentorshipDetails}
                    onChange={(e) => setJobDetails({ ...jobDetails, mentorshipDetails: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Application Preview */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Application Form Preview</CardTitle>
                <CardDescription>
                  Applicants will submit the following standard information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Full Name
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Email Address
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Phone Number
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    LinkedIn Profile
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Portfolio/GitHub
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Resume/CV
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Cover Letter / Why interested
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="flex gap-4 pt-6">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-400">
                    Experience-Based Roles Only
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    This platform is for unpaid volunteer opportunities focused on skill development and mentorship. 
                    By posting, you confirm this role provides genuine learning value and is not a substitute for paid employment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" size="lg">
                Post Role
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PostRole;
