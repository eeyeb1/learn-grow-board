import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompanyCard from "@/components/CompanyCard";
import { sampleCompanies } from "@/data/sampleData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2 } from "lucide-react";

const Companies = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-12 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
              Companies Offering Experience
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Discover companies committed to mentoring and helping you build real-world skills.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search companies by name or industry..."
                className="pl-12 h-12"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Companies Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{sampleCompanies.length}</span> companies with open roles
            </p>
            <div className="flex gap-2">
              <Button variant="soft" size="sm">All</Button>
              <Button variant="ghost" size="sm">Technology</Button>
              <Button variant="ghost" size="sm">Design</Button>
              <Button variant="ghost" size="sm">Marketing</Button>
              <Button variant="ghost" size="sm">Business</Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleCompanies.map((company) => (
              <CompanyCard key={company.id} {...company} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA for Companies */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-2xl text-foreground mb-3">
            Want to List Your Company?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Help aspiring professionals gain experience while getting fresh perspectives for your team.
          </p>
          <Button variant="hero" size="lg">
            Post a Free Experience Role
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Companies;
