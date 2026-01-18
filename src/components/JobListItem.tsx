import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JobListItemProps {
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
  isSelected?: boolean;
  onClick?: () => void;
}

const JobListItem = ({
  title,
  company,
  companyLogo,
  location,
  locationType,
  duration,
  skillLevel,
  isSelected,
  onClick,
}: JobListItemProps) => {
  const locationTypeLabels = {
    remote: "Remote",
    "on-site": "On-site",
    hybrid: "Hybrid",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border-b border-border cursor-pointer transition-colors hover:bg-accent/50",
        isSelected && "bg-accent border-l-2 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Company Logo */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={company}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Building2 className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className={cn(
            "font-medium text-sm truncate",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{company}</p>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {locationTypeLabels[locationType]}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </span>
          </div>
        </div>

        {/* Skill Level Badge */}
        <Badge variant={skillLevel} className="text-xs shrink-0">
          {skillLevel}
        </Badge>
      </div>
    </div>
  );
};

export default JobListItem;
