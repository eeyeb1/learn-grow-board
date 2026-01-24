import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBlogInteractions } from "@/hooks/useBlogInteractions";
import { supabase } from "@/integrations/supabase/client";
import { blogDetails } from "@/data/blogDetails";
import {
  Trash2,
  ArrowRight,
  Loader2,
  FileText,
  BookmarkCheck,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const SavedPosts = () => {
  const { user } = useAuth();
  const { savedBlogs, refreshSavedBlogs } = useBlogInteractions();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemoveSaved = async (blogId: string) => {
    setRemovingId(blogId);
    try {
      await supabase.from("saved_blogs").delete().eq("blog_id", blogId).eq("user_id", user?.id);
      await refreshSavedBlogs();
      toast.success("Post removed from saved");
    } catch (error) {
      console.error("Error removing saved post:", error);
      toast.error("Failed to remove post");
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookmarkCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Sign in to view saved posts</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                You need to be signed in to save and view blog posts.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Saved Posts</h1>
            <p className="text-muted-foreground">
              Blog posts you've saved for later reading
            </p>
          </div>

          {savedBlogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookmarkCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No saved posts yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Save blog posts you find interesting to read later.
              </p>
              <Button variant="hero" asChild>
                <Link to="/blog">Browse Blog</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {savedBlogs.map((saved) => {
                const blog = blogDetails[saved.blog_id];

                if (!blog) {
                  return (
                    <Card key={saved.id} className="border-destructive/20 bg-destructive/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Post no longer available</p>
                            <p className="text-xs text-muted-foreground">ID: {saved.blog_id}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSaved(saved.blog_id)}
                            className="text-destructive hover:text-destructive"
                            disabled={removingId === saved.blog_id}
                          >
                            {removingId === saved.blog_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card key={saved.id} className="group hover:shadow-card transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Blog Cover/Icon */}
                        <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                          {blog.coverImage ? (
                            <img
                              src={blog.coverImage}
                              alt={blog.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Blog Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {blog.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">{blog.author}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveSaved(saved.blog_id);
                              }}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              disabled={removingId === saved.blog_id}
                            >
                              {removingId === saved.blog_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {blog.publishedAt}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {blog.readTime}
                            </span>
                          </div>

                          {/* Timestamp and View */}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-muted-foreground">
                              Saved {formatDate(saved.created_at)}
                            </span>
                            <Button variant="ghost" size="sm" className="text-primary" asChild>
                              <Link to={`/blog/${saved.blog_id}`}>
                                Read
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SavedPosts;
