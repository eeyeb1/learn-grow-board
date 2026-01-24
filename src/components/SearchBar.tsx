import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Briefcase, X, Loader2, Navigation } from "lucide-react";
import { RADIUS_OPTIONS, RadiusValue } from "@/utils/distance";

// Comprehensive job roles organized by category
const jobRolesByCategory = {
  "Software & Engineering": [
    "Software Engineer",
    "Software Developer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Web Developer",
    "Mobile Developer",
    "iOS Developer",
    "Android Developer",
    "React Developer",
    "Node.js Developer",
    "Python Developer",
    "Java Developer",
    "DevOps Engineer",
    "Site Reliability Engineer",
    "Cloud Engineer",
    "Data Engineer",
    "Machine Learning Engineer",
    "AI Engineer",
    "QA Engineer",
    "Test Engineer",
    "Automation Engineer",
    "Security Engineer",
    "Systems Engineer",
    "Embedded Systems Engineer",
    "Firmware Engineer",
    "Game Developer",
    "Blockchain Developer",
  ],
  "Design & Creative": [
    "UI Designer",
    "UX Designer",
    "UI/UX Designer",
    "Product Designer",
    "Graphic Designer",
    "Visual Designer",
    "Web Designer",
    "Interaction Designer",
    "Motion Designer",
    "Brand Designer",
    "Creative Director",
    "Art Director",
    "Illustrator",
    "Video Editor",
    "Animator",
    "3D Artist",
    "Photographer",
    "Content Creator",
    "Creative Strategist",
  ],
  "Data & Analytics": [
    "Data Analyst",
    "Data Scientist",
    "Business Analyst",
    "Business Intelligence Analyst",
    "Research Analyst",
    "Market Research Analyst",
    "Quantitative Analyst",
    "Financial Analyst",
    "Data Visualization Specialist",
    "Analytics Manager",
    "Insights Analyst",
    "Statistical Analyst",
  ],
  "Marketing & Communications": [
    "Marketing Manager",
    "Marketing Coordinator",
    "Marketing Assistant",
    "Digital Marketing Specialist",
    "Social Media Manager",
    "Social Media Specialist",
    "Content Marketing Manager",
    "Content Strategist",
    "Content Writer",
    "Copywriter",
    "SEO Specialist",
    "SEM Specialist",
    "Email Marketing Specialist",
    "Growth Marketing Manager",
    "Brand Manager",
    "PR Specialist",
    "Communications Manager",
    "Marketing Analyst",
    "Influencer Marketing Manager",
  ],
  "Product & Project Management": [
    "Product Manager",
    "Associate Product Manager",
    "Technical Product Manager",
    "Product Owner",
    "Project Manager",
    "Program Manager",
    "Scrum Master",
    "Agile Coach",
    "Product Analyst",
    "Product Marketing Manager",
  ],
  "Sales & Business Development": [
    "Sales Representative",
    "Sales Associate",
    "Account Executive",
    "Account Manager",
    "Business Development Representative",
    "Business Development Manager",
    "Sales Manager",
    "Sales Engineer",
    "Customer Success Manager",
    "Client Success Manager",
    "Partnership Manager",
    "Enterprise Sales",
    "Inside Sales Representative",
  ],
  "Customer Support": [
    "Customer Support Specialist",
    "Customer Service Representative",
    "Technical Support Specialist",
    "Help Desk Technician",
    "Support Engineer",
    "Customer Experience Specialist",
    "Community Manager",
    "Customer Success Associate",
  ],
  "Human Resources": [
    "HR Coordinator",
    "HR Specialist",
    "HR Manager",
    "Recruiter",
    "Technical Recruiter",
    "Talent Acquisition Specialist",
    "HR Business Partner",
    "People Operations Manager",
    "Learning & Development Specialist",
    "Compensation Analyst",
    "Employee Relations Specialist",
  ],
  "Finance & Accounting": [
    "Accountant",
    "Staff Accountant",
    "Senior Accountant",
    "Financial Analyst",
    "Finance Manager",
    "Controller",
    "Bookkeeper",
    "Accounts Payable Specialist",
    "Accounts Receivable Specialist",
    "Tax Accountant",
    "Auditor",
    "Budget Analyst",
    "Treasury Analyst",
  ],
  "Operations & Administration": [
    "Operations Manager",
    "Operations Coordinator",
    "Office Manager",
    "Administrative Assistant",
    "Executive Assistant",
    "Office Administrator",
    "Facilities Manager",
    "Procurement Specialist",
    "Supply Chain Analyst",
    "Logistics Coordinator",
  ],
  "Legal": [
    "Paralegal",
    "Legal Assistant",
    "Legal Counsel",
    "Contract Specialist",
    "Compliance Officer",
    "Legal Operations",
  ],
  "Healthcare": [
    "Nurse",
    "Registered Nurse",
    "Medical Assistant",
    "Healthcare Administrator",
    "Clinical Research Coordinator",
    "Health Coach",
    "Mental Health Counselor",
    "Physical Therapist",
  ],
  "Education": [
    "Teacher",
    "Tutor",
    "Curriculum Developer",
    "Instructional Designer",
    "Training Specialist",
    "Academic Advisor",
    "Education Coordinator",
  ],
  "Entry Level & Internships": [
    "Intern",
    "Internship",
    "Junior Developer",
    "Junior Designer",
    "Junior Analyst",
    "Associate",
    "Trainee",
    "Apprentice",
    "Entry Level",
    "Graduate",
    "Co-op",
    "Fellow",
    "Research Assistant",
    "Teaching Assistant",
  ],
};

// Flatten all roles for searching
const allJobRoles = Object.values(jobRolesByCategory).flat();

interface LocationSuggestion {
  display_name: string;
  place_id: number;
  lat?: string;
  lon?: string;
}

export interface LocationCoords {
  lat: number;
  lng: number;
}

interface SearchBarProps {
  initialQuery?: string;
  initialLocation?: string;
  initialRadius?: RadiusValue;
  initialCoords?: LocationCoords | null;
  onSearch?: (query: string, location: string, radius: RadiusValue, coords: LocationCoords | null) => void;
}

const SearchBar = ({ 
  initialQuery = "", 
  initialLocation = "", 
  initialRadius = -1,
  initialCoords = null,
  onSearch 
}: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [radius, setRadius] = useState<RadiusValue>(initialRadius);
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(initialCoords);
  const [showQuerySuggestions, setShowQuerySuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const queryRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const locationDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with props when they change (e.g., from URL)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  // Filter job roles based on input with smart matching
  const filteredRoles = useMemo(() => {
    if (query.length === 0) {
      // Show popular roles when empty
      return [
        "Software Engineer",
        "Product Designer",
        "Data Analyst",
        "Marketing Manager",
        "Project Manager",
        "Intern",
      ];
    }

    const queryLower = query.toLowerCase();
    const matches: { role: string; score: number }[] = [];

    allJobRoles.forEach((role) => {
      const roleLower = role.toLowerCase();
      
      // Exact start match gets highest priority
      if (roleLower.startsWith(queryLower)) {
        matches.push({ role, score: 3 });
      }
      // Word start match (e.g., "dev" matches "Frontend Developer")
      else if (roleLower.split(" ").some(word => word.startsWith(queryLower))) {
        matches.push({ role, score: 2 });
      }
      // Contains match
      else if (roleLower.includes(queryLower)) {
        matches.push({ role, score: 1 });
      }
    });

    // Sort by score (higher first) then alphabetically
    return matches
      .sort((a, b) => b.score - a.score || a.role.localeCompare(b.role))
      .slice(0, 8)
      .map(m => m.role);
  }, [query]);

  // Fetch location suggestions from Nominatim API
  useEffect(() => {
    if (locationDebounceRef.current) {
      clearTimeout(locationDebounceRef.current);
    }

    // Handle "Remote" as a special case
    if (location.toLowerCase().startsWith("rem")) {
      setLocationSuggestions([{ display_name: "Remote", place_id: 0 }]);
      setIsLoadingLocations(false);
      return;
    }

    if (location.length < 2) {
      setLocationSuggestions([]);
      setIsLoadingLocations(false);
      return;
    }

    setIsLoadingLocations(true);

    locationDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=6&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          // Format the display names to be more concise and include coordinates
          const formatted = data.map((item: any) => ({
            display_name: formatLocationName(item),
            place_id: item.place_id,
            lat: item.lat,
            lon: item.lon,
          }));
          setLocationSuggestions(formatted);
        }
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
        setLocationSuggestions([]);
      } finally {
        setIsLoadingLocations(false);
      }
    }, 300);

    return () => {
      if (locationDebounceRef.current) {
        clearTimeout(locationDebounceRef.current);
      }
    };
  }, [location]);

  // Format location name to be more readable
  const formatLocationName = (item: any): string => {
    const address = item.address || {};
    const parts: string[] = [];

    // City or town
    const city = address.city || address.town || address.village || address.municipality;
    if (city) parts.push(city);

    // State/Province (for US, Canada, etc.)
    const state = address.state || address.province || address.region;
    if (state && parts.length > 0) parts.push(state);

    // Country
    const country = address.country;
    if (country) parts.push(country);

    // If we couldn't parse nicely, use original but truncate
    if (parts.length === 0) {
      return item.display_name.split(",").slice(0, 3).join(",").trim();
    }

    return parts.join(", ");
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (queryRef.current && !queryRef.current.contains(event.target as Node)) {
        setShowQuerySuggestions(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    setShowQuerySuggestions(false);
    setShowLocationSuggestions(false);
    if (onSearch) {
      onSearch(query, location, radius, locationCoords);
    } else {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (location) params.set("location", location);
      if (radius !== -1) params.set("radius", String(radius));
      if (locationCoords) {
        params.set("lat", String(locationCoords.lat));
        params.set("lng", String(locationCoords.lng));
      }
      navigate(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape") {
      setShowQuerySuggestions(false);
      setShowLocationSuggestions(false);
    }
  };

  const clearQuery = () => {
    setQuery("");
    if (onSearch) {
      onSearch("", location, radius, locationCoords);
    }
  };

  const clearLocation = () => {
    setLocation("");
    setLocationSuggestions([]);
    setLocationCoords(null);
    setRadius(-1);
    if (onSearch) {
      onSearch(query, "", -1, null);
    }
  };

  const selectQuerySuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowQuerySuggestions(false);
  };

  const selectLocationSuggestion = (suggestion: LocationSuggestion) => {
    setLocation(suggestion.display_name);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    
    // Store coordinates if available (not for "Remote")
    if (suggestion.lat && suggestion.lon) {
      setLocationCoords({
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lon),
      });
      // Default to 25km when a location is selected
      if (radius === -1) {
        setRadius(25);
      }
    } else {
      setLocationCoords(null);
      setRadius(-1);
    }
  };

  const handleRadiusChange = (value: string) => {
    const newRadius = parseInt(value, 10) as RadiusValue;
    setRadius(newRadius);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-elevated p-2 flex flex-col md:flex-row gap-2">
        {/* Keyword Search */}
        <div className="flex-1 relative" ref={queryRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            placeholder="Job title, skills, or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowQuerySuggestions(true)}
            onKeyDown={handleKeyDown}
            className="pl-12 pr-10 border-0 shadow-none bg-transparent h-12 focus-visible:ring-0"
          />
          {query && (
            <button
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors z-10"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          
          {/* Query Suggestions Dropdown */}
          {showQuerySuggestions && filteredRoles.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="py-1">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {query.length > 0 ? "Suggested roles" : "Popular roles"}
                </div>
                {filteredRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => selectQuerySuggestion(role)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex-1 md:border-l border-border" ref={locationRef}>
          <div className="relative">
            <MapPin className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
            <Input
              placeholder="City, state, or Remote"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                // Clear coords when user types (they'll be set when selecting from dropdown)
                setLocationCoords(null);
              }}
              onFocus={() => setShowLocationSuggestions(true)}
              onKeyDown={handleKeyDown}
              className="pl-12 md:pl-14 pr-10 border-0 shadow-none bg-transparent h-12 focus-visible:ring-0"
            />
            {location && (
              <button
                onClick={clearLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors z-10"
                aria-label="Clear location"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Radius Selector - Shows when a location with coords is selected */}
          {locationCoords && location && location.toLowerCase() !== "remote" && (
            <div className="flex items-center gap-2 px-4 md:px-6 pb-2">
              <Navigation className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Within</span>
              <Select value={String(radius)} onValueChange={handleRadiusChange}>
                <SelectTrigger className="h-6 w-[90px] text-xs border-0 bg-accent/50 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location Suggestions Dropdown */}
          {showLocationSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="py-1">
                {isLoadingLocations ? (
                  <div className="px-3 py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching locations...</span>
                  </div>
                ) : locationSuggestions.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Locations
                    </div>
                    {locationSuggestions.map((loc) => (
                      <button
                        key={loc.place_id}
                        onClick={() => selectLocationSuggestion(loc)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{loc.display_name}</span>
                      </button>
                    ))}
                  </>
                ) : location.length >= 2 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                    No locations found
                  </div>
                ) : (
                  <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                    Type to search locations worldwide
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Button */}
        <Button variant="hero" size="lg" className="h-12 px-8" onClick={handleSearch}>
          <Briefcase className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
