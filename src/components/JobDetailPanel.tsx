import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Building2, 
  Users, 
  ExternalLink, 
  Briefcase, 
  GraduationCap,
  CheckCircle2,
  Lightbulb,
  Heart
} from "lucide-react";
import { Link } from "react-router-dom";
import { JobDetail } from "@/data/jobDetails";

interface JobDetailPanelProps {
  job: JobDetail;
}

const JobDetailPanel = ({ job }: JobDetailPanelProps) => {
  const locationTypeLabels = {
    remote: "Remote",
    "on-site": "On-site",
    hybrid: "Hybrid",
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt={job.company}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <Building2 className="w-7 h-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-xl text-foreground">{job.title}</h2>
          <p className="text-muted-foreground">{job.company}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={job.skillLevel}>{job.skillLevel}</Badge>
            <Badge variant={job.industry}>{job.industry}</Badge>
            <Badge variant="secondary">{locationTypeLabels[job.locationType]}</Badge>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{job.location}</span>
          </div>
        </Card>
        <Card className="p-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{job.hoursPerWeek}</span>
          </div>
        </Card>
        <Card className="p-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <span>{job.duration}</span>
          </div>
        </Card>
        {job.applicants !== undefined && (
          <Card className="p-3 bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{job.applicants} applicants</span>
            </div>
          </Card>
        )}
      </div>

      {/* Skills */}
      <div className="mb-6">
        <h3 className="font-medium text-sm text-muted-foreground mb-2">Required Skills</h3>
        <div className="flex flex-wrap gap-2">
          {job.skills.map((skill) => (
            <Badge key={skill} variant="soft">{skill}</Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <Button variant="hero" className="flex-1">
          Apply Now
        </Button>
        <Link to={`/jobs/${job.id}`}>
          <Button variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            Full Details
          </Button>
        </Link>
      </div>

      <Separator className="my-6" />

      {/* Description */}
      <div className="space-y-6">
        <div>
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-primary" />
            About This Opportunity
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
        </div>

        {job.responsibilities.length > 0 && (
          <div>
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              What You'll Do
            </h3>
            <ul className="space-y-2">
              {job.responsibilities.map((resp, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary mt-1">•</span>
                  {resp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.requirements.length > 0 && (
          <div>
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-primary" />
              Requirements
            </h3>
            <ul className="space-y-2">
              {job.requirements.map((req, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary mt-1">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.whatYouWillLearn.length > 0 && (
          <div>
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-primary" />
              What You'll Learn
            </h3>
            <ul className="space-y-2">
              {job.whatYouWillLearn.map((item, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.mentorshipDetails && (
          <div>
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-primary" />
              Mentorship & Support
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{job.mentorshipDetails}</p>
          </div>
        )}
      </div>

      {/* Company Info */}
      <Separator className="my-6" />
      
      <div>
        <h3 className="font-medium flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-primary" />
          About {job.company}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{job.companyDescription}</p>
        {job.companyWebsite && (
          <a 
            href={job.companyWebsite} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Visit Website <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

export default JobDetailPanel;
