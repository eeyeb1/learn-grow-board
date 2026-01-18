import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import BlogCard from "@/components/BlogCard";
import CreateBlogModal from "@/components/CreateBlogModal";
import { sampleBlogs } from "@/data/sampleData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenSquare, SlidersHorizontal } from "lucide-react";

const Blog = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { id: "career-tips", label: "Career Tips" },
    { id: "success-stories", label: "Success Stories" },
    { id: "industry-insights", label: "Industry Insights" },
    { id: "tutorials", label: "Tutorials" },
  ];

  const filteredBlogs = activeCategory
    ? sampleBlogs.filter((blog) => blog.category === activeCategory)
    : sampleBlogs;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
              Blog & Insights
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Discover stories, tips, and insights from our community of learners and industry professionals.
            </p>
          </div>
          <div className="flex justify-center gap-3 mb-6">
            <SearchBar />
            <Button onClick={() => setCreateModalOpen(true)} className="shrink-0">
              <PenSquare className="w-4 h-4 mr-2" />
              Write a Post
            </Button>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="border-b border-border/50 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-4 overflow-x-auto">
            <Badge
              variant={activeCategory === null ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setActiveCategory(null)}
            >
              All Posts
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer shrink-0"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Listings */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredBlogs.length}</span> posts
            </p>
            <Button variant="ghost" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Sort by: Newest
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <BlogCard key={blog.id} {...blog} />
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-10">
            <Button variant="outline" size="lg">
              Load More Posts
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      <CreateBlogModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
};

export default Blog;
