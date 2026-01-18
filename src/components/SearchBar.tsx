import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Briefcase } from "lucide-react";

interface SearchBarProps {
  initialQuery?: string;
  initialLocation?: string;
  onSearch?: (query: string, location: string) => void;
}

const SearchBar = ({ initialQuery = "", initialLocation = "", onSearch }: SearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(query, location);
    } else {
      // Navigate to jobs page with search params
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
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-elevated p-2 flex flex-col md:flex-row gap-2">
        {/* Keyword Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search roles, skills, or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12 border-0 shadow-none bg-transparent h-12 focus-visible:ring-0"
          />
        </div>

        {/* Location */}
        <div className="flex-1 relative md:border-l border-border">
          <MapPin className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Location or Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12 md:pl-14 border-0 shadow-none bg-transparent h-12 focus-visible:ring-0"
          />
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
