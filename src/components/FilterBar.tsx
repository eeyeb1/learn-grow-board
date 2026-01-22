import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

export interface Filters {
  industry: string[];
  skillLevel: string[];
  locationType: string[];
  duration: string[];
}

export const filterOptions = {
  industry: [
    { value: "tech", label: "Tech" },
    { value: "design", label: "Design" },
    { value: "marketing", label: "Marketing" },
    { value: "business", label: "Business" },
    { value: "media", label: "Media" },
    { value: "other", label: "Other" },
  ],
  skillLevel: [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ],
  locationType: [
    { value: "remote", label: "Remote" },
    { value: "on-site", label: "On-site" },
    { value: "hybrid", label: "Hybrid" },
  ],
  duration: [
    { value: "1-2 weeks", label: "1-2 weeks" },
    { value: "1 month", label: "1 month" },
    { value: "2 months", label: "2 months" },
    { value: "3 months", label: "3 months" },
    { value: "4 months", label: "4 months" },
    { value: "6+ months", label: "6+ months" },
    { value: "Ongoing", label: "Ongoing" },
    { value: "Flexible", label: "Flexible" },
  ],
};

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const FilterBar = ({ filters, onFiltersChange }: FilterBarProps) => {
  const handleFilterToggle = (
    category: keyof Filters,
    value: string
  ) => {
    const currentValues = filters[category];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({
      ...filters,
      [category]: newValues,
    });
  };

  const getActiveFiltersCount = () => {
    return (
      filters.industry.length +
      filters.skillLevel.length +
      filters.locationType.length +
      filters.duration.length
    );
  };

  const getActiveFilterLabels = () => {
    const labels: { category: keyof Filters; value: string; label: string }[] = [];
    
    (Object.keys(filterOptions) as Array<keyof typeof filterOptions>).forEach((category) => {
      filters[category].forEach((value) => {
        const option = filterOptions[category].find((o) => o.value === value);
        if (option) {
          labels.push({ category, value, label: option.label });
        }
      });
    });
    
    return labels;
  };

  const clearAllFilters = () => {
    onFiltersChange({
      industry: [],
      skillLevel: [],
      locationType: [],
      duration: [],
    });
  };

  const removeFilter = (category: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [category]: filters[category].filter((v) => v !== value),
    });
  };

  const activeFilterLabels = getActiveFilterLabels();

  const FilterDropdown = ({
    label,
    category,
    options,
  }: {
    label: string;
    category: keyof Filters;
    options: { value: string; label: string }[];
  }) => {
    const selectedCount = filters[category].length;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-9 ${selectedCount > 0 ? "border-primary text-primary" : ""}`}
          >
            {label}
            {selectedCount > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {selectedCount}
              </span>
            )}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={filters[category].includes(option.value)}
                  onCheckedChange={() => handleFilterToggle(category, option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="w-full py-4 border-b border-border bg-background/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground mr-2">
            Filters:
          </span>

          {/* Filter Dropdowns */}
          <FilterDropdown
            label="Industry"
            category="industry"
            options={filterOptions.industry}
          />

          <FilterDropdown
            label="Skill Level"
            category="skillLevel"
            options={filterOptions.skillLevel}
          />

          <FilterDropdown
            label="Location Type"
            category="locationType"
            options={filterOptions.locationType}
          />

          <FilterDropdown
            label="Duration"
            category="duration"
            options={filterOptions.duration}
          />

          {/* Active Filters */}
          {activeFilterLabels.length > 0 && (
            <>
              <div className="w-px h-6 bg-border mx-2" />
              {activeFilterLabels.map((filter) => (
                <Badge
                  key={`${filter.category}-${filter.value}`}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => removeFilter(filter.category, filter.value)}
                >
                  {filter.label} ×
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive text-xs"
                onClick={clearAllFilters}
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
