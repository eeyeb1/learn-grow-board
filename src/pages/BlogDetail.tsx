import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { blogDetails } from "@/data/blogDetails";
import { sampleBlogs } from "@/data/sampleData";
import BlogCard from "@/components/BlogCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageCircle,
  User,
  Share2,
  Bookmark,
  ThumbsUp,
  Twitter,
  Linkedin,
  Facebook,
  Link as LinkIcon,
} from "lucide-react";

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const blog = id ? blogDetails[id] : null;

  if (!blog) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Post Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The blog post you're looking for doesn't exist.
          </p>
          <Link to="/blog">
            <Button variant="hero">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryLabels = {
    "career-tips": "Career Tips",
    "success-stories": "Success Stories",
    "industry-insights": "Industry Insights",
    "tutorials": "Tutorials",
  };

  const categoryColors = {
    "career-tips": "bg-primary/10 text-primary",
    "success-stories": "bg-secondary/10 text-secondary",
    "industry-insights": "bg-accent/10 text-accent-foreground",
    "tutorials": "bg-muted text-muted-foreground",
  };

  // Get related posts (same category, excluding current)
  const relatedPosts = sampleBlogs
    .filter((post) => post.category === blog.category && post.id !== blog.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-8 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link
            to="/blog"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>

          {/* Category Badge */}
          <Badge className={`mb-4 ${categoryColors[blog.category]}`}>
            {categoryLabels[blog.category]}
          </Badge>

          {/* Title */}
          <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl">
            {blog.title}
          </h1>

          {/* Excerpt */}
          <p className="text-lg text-muted-foreground max-w-3xl mb-6">
            {blog.excerpt}
          </p>

          {/* Author & Meta */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
                {blog.authorAvatar ? (
                  <img
                    src={blog.authorAvatar}
                    alt={blog.author}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">{blog.author}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {blog.publishedAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {blog.readTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="icon">
                <Bookmark className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Cover Image */}
      {blog.coverImage && (
        <section className="pb-8">
          <div className="container mx-auto px-4">
            <div className="rounded-2xl overflow-hidden max-w-4xl">
              <img
                src={blog.coverImage}
                alt={blog.title}
                className="w-full h-auto object-cover aspect-video"
              />
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_300px] gap-8 max-w-6xl">
            {/* Main Content */}
            <article className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary">
              <div
                dangerouslySetInnerHTML={{
                  __html: blog.content
                    .split("\n")
                    .map((line) => {
                      if (line.startsWith("## ")) {
                        return `<h2>${line.slice(3)}</h2>`;
                      }
                      if (line.startsWith("### ")) {
                        return `<h3>${line.slice(4)}</h3>`;
                      }
                      if (line.startsWith("- ")) {
                        return `<li>${line.slice(2)}</li>`;
                      }
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return `<p><strong>${line.slice(2, -2)}</strong></p>`;
                      }
                      if (line.match(/^\d+\. /)) {
                        return `<li>${line.slice(line.indexOf(" ") + 1)}</li>`;
                      }
                      if (line.trim() === "") {
                        return "";
                      }
                      return `<p>${line}</p>`;
                    })
                    .join(""),
                }}
              />

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-8 not-prose">
                {blog.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Author Card */}
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  About the Author
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-muted overflow-hidden">
                    {blog.authorAvatar ? (
                      <img
                        src={blog.authorAvatar}
                        alt={blog.author}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-7 h-7 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{blog.author}</p>
                    <p className="text-sm text-muted-foreground">Author</p>
                  </div>
                </div>
                {blog.authorBio && (
                  <p className="text-sm text-muted-foreground">
                    {blog.authorBio}
                  </p>
                )}
              </Card>

              {/* Share Card */}
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Share this post
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Twitter className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Linkedin className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Facebook className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              {/* Engagement Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ThumbsUp className="w-4 h-4" />
                      Like
                    </Button>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      {blog.comments} comments
                    </div>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <h2 className="font-display font-bold text-2xl text-foreground mb-6">
              Related Posts
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((post) => (
                <BlogCard key={post.id} {...post} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default BlogDetail;
