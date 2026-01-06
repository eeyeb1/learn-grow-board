import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const filters = {
  industry: ["Tech", "Design", "Marketing", "Business", "Media", "Other"],
  skillLevel: ["Beginner", "Intermediate", "Advanced"],
  locationType: ["Remote", "On-site", "Hybrid"],
  duration: ["1-2 weeks", "1 month", "3 months", "6+ months", "Ongoing"],
};

interface FilterBarProps {
  activeFilters?: string[];
  onFilterChange?: (filter: string) => void;
}

const FilterBar = ({ activeFilters = [], onFilterChange }: FilterBarProps) => {
  return (
    <div className="w-full py-4 border-b border-border bg-background/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground mr-2">
            Filters:
          </span>

          {/* Filter Dropdowns */}
          <Button variant="outline" size="sm" className="h-9">
            Industry
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <Button variant="outline" size="sm" className="h-9">
            Skill Level
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <Button variant="outline" size="sm" className="h-9">
            Location Type
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <Button variant="outline" size="sm" className="h-9">
            Duration
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <>
              <div className="w-px h-6 bg-border mx-2" />
              {activeFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="accent"
                  className="cursor-pointer hover:bg-accent/80"
                >
                  {filter} ×
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                Clear all
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
