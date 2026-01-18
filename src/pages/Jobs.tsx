import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import FilterBar from "@/components/FilterBar";
import JobCard from "@/components/JobCard";
import { sampleJobs } from "@/data/sampleData";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(6);
  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";

  const handleSearch = (newQuery: string, newLocation: string) => {
    const params = new URLSearchParams();
    if (newQuery) params.set("q", newQuery);
    if (newLocation) params.set("location", newLocation);
    setSearchParams(params);
  };

  const filteredJobs = useMemo(() => {
    return sampleJobs.filter((job) => {
      const queryLower = query.toLowerCase();
      const locationLower = location.toLowerCase();

      const matchesQuery =
        !query ||
        job.title.toLowerCase().includes(queryLower) ||
        job.company.toLowerCase().includes(queryLower) ||
        job.skills.some((skill) => skill.toLowerCase().includes(queryLower));

      const matchesLocation =
        !location ||
        job.location.toLowerCase().includes(locationLower);

      return matchesQuery && matchesLocation;
    });
  }, [query, location]);

  const visibleJobs = filteredJobs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredJobs.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
              Find Experience Opportunities
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Browse {sampleJobs.length}+ free experience roles from companies ready to mentor you.
            </p>
          </div>
          <SearchBar 
            initialQuery={query} 
            initialLocation={location} 
            onSearch={handleSearch} 
          />
        </div>
      </section>

      {/* Filters */}
      <FilterBar activeFilters={["Remote", "Beginner"]} />

      {/* Job Listings */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{visibleJobs.length}</span> of {filteredJobs.length} opportunities
              {query && (
                <span> for "<span className="text-primary">{query}</span>"</span>
              )}
              {location && (
                <span> in "<span className="text-primary">{location}</span>"</span>
              )}
            </p>
            <Button variant="ghost" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Sort by: Newest
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleJobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No opportunities found matching your search.</p>
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-10">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setVisibleCount((prev) => prev + 1)}
              >
                Load More Opportunities
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Jobs;
