import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import FilterBar from "@/components/FilterBar";
import JobCard from "@/components/JobCard";
import { sampleJobs } from "@/data/sampleData";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

const Jobs = () => {
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
          <SearchBar />
        </div>
      </section>

      {/* Filters */}
      <FilterBar activeFilters={["Remote", "Beginner"]} />

      {/* Job Listings */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{sampleJobs.length}</span> opportunities
            </p>
            <Button variant="ghost" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Sort by: Newest
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleJobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-10">
            <Button variant="outline" size="lg">
              Load More Opportunities
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Jobs;
