import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import FilterBar, { Filters } from "@/components/FilterBar";
import JobCard from "@/components/JobCard";
import JobListItem from "@/components/JobListItem";
import JobDetailPanel from "@/components/JobDetailPanel";
import { sampleJobs } from "@/data/sampleData";
import { jobDetails, JobDetail } from "@/data/jobDetails";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SlidersHorizontal, ChevronLeft, ChevronRight, LayoutGrid, Columns, Loader2 } from "lucide-react";
import { useJobs, Job } from "@/hooks/useJobs";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

type ViewMode = "grid" | "split";

const initialFilters: Filters = {
  industry: [],
  skillLevel: [],
  locationType: [],
  duration: [],
};

// Transform database job to display format
const transformDbJob = (job: Job) => ({
  id: job.id,
  title: job.title,
  company: job.company?.company_name || "Unknown Company",
  companyLogo: job.company?.logo_url || undefined,
  location: job.location || "Remote",
  locationType: job.location_type as "remote" | "on-site" | "hybrid",
  duration: job.duration || "Flexible",
  hoursPerWeek: job.hours_per_week || "Flexible",
  skillLevel: job.skill_level as "beginner" | "intermediate" | "advanced",
  industry: (job.industry || "tech") as "tech" | "design" | "marketing" | "business",
  skills: job.skills || [],
  postedAt: job.created_at,
});

// Transform database job to detail format
const transformDbJobToDetail = (job: Job): JobDetail => ({
  id: job.id,
  title: job.title,
  company: job.company?.company_name || "Unknown Company",
  companyLogo: job.company?.logo_url || undefined,
  companyDescription: job.company?.company_description || "No description available",
  location: job.location || "Remote",
  locationType: job.location_type as "remote" | "on-site" | "hybrid",
  duration: job.duration || "Flexible",
  hoursPerWeek: job.hours_per_week || "Flexible",
  skillLevel: job.skill_level as "beginner" | "intermediate" | "advanced",
  industry: (job.industry || "tech") as "tech" | "design" | "marketing" | "business",
  skills: job.skills || [],
  postedAt: job.created_at,
  description: job.description,
  responsibilities: job.responsibilities || [],
  requirements: job.requirements || [],
  whatYouWillLearn: job.what_you_will_learn || [],
  mentorshipDetails: job.mentorship_details || "Mentorship details not specified",
});

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [dbJobs, setDbJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  
  const { fetchJobs } = useJobs();
  
  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";

  // Fetch jobs from database
  useEffect(() => {
    const loadJobs = async () => {
      setLoadingJobs(true);
      const { data, error } = await fetchJobs();
      if (data && !error) {
        setDbJobs(data);
      }
      setLoadingJobs(false);
    };
    loadJobs();
  }, [fetchJobs]);

  const handleSearch = (newQuery: string, newLocation: string) => {
    const params = new URLSearchParams();
    if (newQuery) params.set("q", newQuery);
    if (newLocation) params.set("location", newLocation);
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Combine static jobs with database jobs
  const allJobs = useMemo(() => {
    const transformedDbJobs = dbJobs.map(transformDbJob);
    // Put database jobs first, then sample jobs
    return [...transformedDbJobs, ...sampleJobs];
  }, [dbJobs]);

  // Build a combined job details map
  const allJobDetails = useMemo(() => {
    const dbJobDetailsMap: Record<string, JobDetail> = {};
    dbJobs.forEach(job => {
      dbJobDetailsMap[job.id] = transformDbJobToDetail(job);
    });
    return { ...jobDetails, ...dbJobDetailsMap };
  }, [dbJobs]);

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      const queryLower = query.toLowerCase();
      const locationLower = location.toLowerCase();

      // Text search
      const matchesQuery =
        !query ||
        job.title.toLowerCase().includes(queryLower) ||
        job.company.toLowerCase().includes(queryLower) ||
        job.skills.some((skill) => skill.toLowerCase().includes(queryLower));

      // Location search
      const matchesLocation =
        !location ||
        job.location.toLowerCase().includes(locationLower);

      // Industry filter
      const matchesIndustry =
        filters.industry.length === 0 ||
        filters.industry.includes(job.industry);

      // Skill level filter
      const matchesSkillLevel =
        filters.skillLevel.length === 0 ||
        filters.skillLevel.includes(job.skillLevel);

      // Location type filter
      const matchesLocationType =
        filters.locationType.length === 0 ||
        filters.locationType.includes(job.locationType);

      // Duration filter
      const matchesDuration =
        filters.duration.length === 0 ||
        filters.duration.includes(job.duration);

      return (
        matchesQuery &&
        matchesLocation &&
        matchesIndustry &&
        matchesSkillLevel &&
        matchesLocationType &&
        matchesDuration
      );
    });
  }, [query, location, allJobs, filters]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  // Auto-select first job when page changes or entering split view
  useEffect(() => {
    if (viewMode === "split" && paginatedJobs.length > 0) {
      setSelectedJobId(paginatedJobs[0].id);
    }
  }, [currentPage, viewMode, paginatedJobs.length]);

  const selectedJob = selectedJobId ? allJobDetails[selectedJobId] : null;

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleViewModeChange = (value: string) => {
    if (value) {
      setViewMode(value as ViewMode);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Selection will be handled by useEffect
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header - Compact in split view */}
      <section className={`pt-24 gradient-subtle ${viewMode === "split" ? "pb-4 md:pt-20" : "pb-8 md:pt-28"}`}>
        <div className="container mx-auto px-4">
          {viewMode === "grid" && (
            <div className="text-center mb-8">
              <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
                Find Experience Opportunities
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Browse {allJobs.length}+ free experience roles from companies ready to mentor you.
              </p>
            </div>
          )}
          <SearchBar 
            initialQuery={query} 
            initialLocation={location} 
            onSearch={handleSearch} 
          />
        </div>
      </section>

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Job Listings */}
      <section className={`py-4 flex-1 ${viewMode === "split" ? "flex flex-col" : ""}`}>
        <div className={`container mx-auto px-4 ${viewMode === "split" ? "flex-1 flex flex-col" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredJobs.length)}</span> of {filteredJobs.length} opportunities
              {query && (
                <span> for "<span className="text-primary">{query}</span>"</span>
              )}
              {location && (
                <span> in "<span className="text-primary">{location}</span>"</span>
              )}
            </p>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={handleViewModeChange}
                className="border rounded-lg p-1"
              >
                <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0">
                  <LayoutGrid className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="split" aria-label="Split view" className="h-8 w-8 p-0">
                  <Columns className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Sort by: Newest
              </Button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === "grid" && (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedJobs.map((job) => (
                  <JobCard key={job.id} {...job} />
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No opportunities found matching your search.</p>
                </div>
              )}
            </>
          )}

          {/* Split View - Full Height */}
          {viewMode === "split" && (
            <div className="flex gap-0 border rounded-xl overflow-hidden bg-card flex-1" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
              {/* Job List Panel */}
              <div className="w-[340px] lg:w-[400px] shrink-0 border-r overflow-y-auto">
                {paginatedJobs.map((job) => (
                  <JobListItem
                    key={job.id}
                    {...job}
                    isSelected={selectedJobId === job.id}
                    onClick={() => setSelectedJobId(job.id)}
                  />
                ))}
                {filteredJobs.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">No opportunities found.</p>
                  </div>
                )}
              </div>

              {/* Job Detail Panel */}
              <div className="flex-1 bg-background h-full overflow-y-auto">
                {selectedJob ? (
                  <JobDetailPanel job={selectedJob} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a job to view details
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {viewMode === "grid" && <Footer />}
    </div>
  );
};

export default Jobs;
