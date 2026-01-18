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
import { Separator } from "@/components/ui/separator";
import { X, Plus, Briefcase, Clock, MapPin, GraduationCap, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PostRole = () => {
  const navigate = useNavigate();
  
  // Job Details State
  const [jobDetails, setJobDetails] = useState({
    title: "",
    company: "",
    companyDescription: "",
    companyWebsite: "",
    location: "",
    locationType: "remote" as "remote" | "on-site" | "hybrid",
    duration: "",
    hoursPerWeek: "",
    skillLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    industry: "tech" as "tech" | "design" | "marketing" | "business",
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
    if (!jobDetails.title || !jobDetails.company || !jobDetails.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Filter out empty items from lists
    const filteredResponsibilities = responsibilities.filter(r => r.trim());
    const filteredRequirements = requirements.filter(r => r.trim());
    const filteredWhatYouWillLearn = whatYouWillLearn.filter(w => w.trim());

    const roleData = {
      ...jobDetails,
      skills,
      responsibilities: filteredResponsibilities,
      requirements: filteredRequirements,
      whatYouWillLearn: filteredWhatYouWillLearn,
    };

    console.log("Role data:", roleData);
    toast.success("Role posted successfully!");
    navigate("/jobs");
  };

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

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Tell us about the role and your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Label htmlFor="company">Company/Organization Name *</Label>
                    <Input
                      id="company"
                      placeholder="e.g., TechStart Studio"
                      value={jobDetails.company}
                      onChange={(e) => setJobDetails({ ...jobDetails, company: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea
                    id="companyDescription"
                    placeholder="Tell applicants about your organization..."
                    value={jobDetails.companyDescription}
                    onChange={(e) => setJobDetails({ ...jobDetails, companyDescription: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={jobDetails.companyWebsite}
                    onChange={(e) => setJobDetails({ ...jobDetails, companyWebsite: e.target.value })}
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

                {/* Mentorship */}
                <div className="space-y-2">
                  <Label htmlFor="mentorshipDetails">Mentorship & Support Offered</Label>
                  <Textarea
                    id="mentorshipDetails"
                    placeholder="Describe what mentorship or guidance you'll provide..."
                    value={jobDetails.mentorshipDetails}
                    onChange={(e) => setJobDetails({ ...jobDetails, mentorshipDetails: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Application Form Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Application Form
                </CardTitle>
                <CardDescription>
                  Applicants will fill out this standard form when applying
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    The following fields will be collected from applicants:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Full Name</Label>
                      <div className="h-9 bg-background rounded-md border border-input px-3 flex items-center text-sm text-muted-foreground">
                        Required
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Email Address</Label>
                      <div className="h-9 bg-background rounded-md border border-input px-3 flex items-center text-sm text-muted-foreground">
                        Required
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Phone Number</Label>
                      <div className="h-9 bg-background rounded-md border border-input px-3 flex items-center text-sm text-muted-foreground">
                        Optional
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">LinkedIn Profile</Label>
                      <div className="h-9 bg-background rounded-md border border-input px-3 flex items-center text-sm text-muted-foreground">
                        Optional
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Portfolio/Website URL</Label>
                    <div className="h-9 bg-background rounded-md border border-input px-3 flex items-center text-sm text-muted-foreground">
                      Optional
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Resume/CV</Label>
                    <div className="h-9 bg-background rounded-md border border-input px-3 flex items-center text-sm text-muted-foreground">
                      File Upload (PDF) - Required
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Why are you interested in this role?</Label>
                    <div className="h-20 bg-background rounded-md border border-input px-3 py-2 flex items-start text-sm text-muted-foreground">
                      Required - Cover letter / motivation
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Weekly Availability</Label>
                    <div className="h-9 bg-background rounded-md border border-input px-3 flex items-center text-sm text-muted-foreground">
                      Required - Hours per week available
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Relevant Experience or Skills</Label>
                    <div className="h-20 bg-background rounded-md border border-input px-3 py-2 flex items-start text-sm text-muted-foreground">
                      Optional - Previous experience or self-taught skills
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-1">
                      Important: Unpaid Experience-Based Role
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-500">
                      By posting this role, you confirm that this is an unpaid, experience-based opportunity 
                      focused on providing learning and mentorship. This platform is for volunteer positions 
                      only and should not be used for roles that would typically be paid employment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" size="lg">
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
