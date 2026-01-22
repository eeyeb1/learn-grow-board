import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Briefcase, X } from "lucide-react";

// Common job roles for autocomplete
const commonRoles = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Data Analyst",
  "Data Scientist",
  "Marketing Assistant",
  "Social Media Manager",
  "Content Writer",
  "Copywriter",
  "Business Analyst",
  "Project Manager",
  "Product Manager",
  "Software Engineer",
  "QA Engineer",
  "DevOps Engineer",
  "Mobile Developer",
  "Web Developer",
  "Junior Developer",
  "Intern",
  "Research Assistant",
  "Sales Representative",
  "Customer Success",
  "HR Assistant",
  "Finance Analyst",
  "Video Editor",
  "Photographer",
  "Animator",
];

// Common locations for autocomplete
const commonLocations = [
  "Remote",
  "San Francisco, CA",
  "New York, NY",
  "Los Angeles, CA",
  "Seattle, WA",
  "Austin, TX",
  "Chicago, IL",
  "Boston, MA",
  "Denver, CO",
  "Portland, OR",
  "Miami, FL",
  "Atlanta, GA",
  "Dallas, TX",
  "San Diego, CA",
  "Philadelphia, PA",
  "Washington, DC",
  "London, UK",
  "Toronto, Canada",
  "Berlin, Germany",
  "Amsterdam, Netherlands",
];

interface SearchBarProps {
  initialQuery?: string;
  initialLocation?: string;
  onSearch?: (query: string, location: string) => void;
}

const SearchBar = ({ initialQuery = "", initialLocation = "", onSearch }: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [showQuerySuggestions, setShowQuerySuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const queryRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  // Sync local state with props when they change (e.g., from URL)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

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
      onSearch(query, location);
    } else {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (location) params.set("location", location);
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
      onSearch("", location);
    }
  };

  const clearLocation = () => {
    setLocation("");
    if (onSearch) {
      onSearch(query, "");
    }
  };

  const selectQuerySuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowQuerySuggestions(false);
  };

  const selectLocationSuggestion = (suggestion: string) => {
    setLocation(suggestion);
    setShowLocationSuggestions(false);
  };

  // Filter suggestions based on input
  const filteredRoles = query.length > 0
    ? commonRoles.filter((role) =>
        role.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : commonRoles.slice(0, 6);

  const filteredLocations = location.length > 0
    ? commonLocations.filter((loc) =>
        loc.toLowerCase().includes(location.toLowerCase())
      ).slice(0, 6)
    : commonLocations.slice(0, 6);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-elevated p-2 flex flex-col md:flex-row gap-2">
        {/* Keyword Search */}
        <div className="flex-1 relative" ref={queryRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            placeholder="Search roles, skills, or keywords..."
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
                  Popular roles
                </div>
                {filteredRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => selectQuerySuggestion(role)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <span>{role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex-1 relative md:border-l border-border" ref={locationRef}>
          <MapPin className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            placeholder="Location or Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
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

          {/* Location Suggestions Dropdown */}
          {showLocationSuggestions && filteredLocations.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="py-1">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Popular locations
                </div>
                {filteredLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => selectLocationSuggestion(loc)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{loc}</span>
                  </button>
                ))}
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
