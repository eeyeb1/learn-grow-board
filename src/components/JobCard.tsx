import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Building2, Users } from "lucide-react";
import { Link } from "react-router-dom";

export interface JobCardProps {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  locationType: "remote" | "on-site" | "hybrid";
  duration: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  industry: "tech" | "design" | "marketing" | "business";
  skills: string[];
  applicants?: number;
  postedAt?: string;
}

const JobCard = ({
  id,
  title,
  company,
  companyLogo,
  location,
  locationType,
  duration,
  skillLevel,
  industry,
  skills,
  applicants,
}: JobCardProps) => {
  const locationTypeLabels = {
    remote: "Remote",
    "on-site": "On-site",
    hybrid: "Hybrid",
  };

  return (
    <Link to={`/jobs/${id}`}>
      <Card className="p-5 hover:shadow-elevated transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/30 bg-card">
        <div className="flex items-start gap-4">
          {/* Company Logo */}
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={company}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Building2 className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title & Company */}
            <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{company}</p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {location} · {locationTypeLabels[locationType]}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {duration}
              </span>
              {applicants !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {applicants} applicants
                </span>
              )}
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="soft" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skills.length > 3 && (
                <Badge variant="soft" className="text-xs">
                  +{skills.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* Right side badges */}
          <div className="flex flex-col gap-2 items-end shrink-0">
            <Badge variant={skillLevel}>{skillLevel}</Badge>
            <Badge variant={industry}>{industry}</Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default JobCard;
