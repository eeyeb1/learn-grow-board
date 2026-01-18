import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, User, Clock, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

export interface BlogCardProps {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  authorAvatar?: string;
  publishedAt: string;
  readTime: string;
  category: "career-tips" | "success-stories" | "industry-insights" | "tutorials";
  tags: string[];
  comments?: number;
  coverImage?: string;
}

const BlogCard = ({
  id,
  title,
  excerpt,
  author,
  authorAvatar,
  publishedAt,
  readTime,
  category,
  tags,
  comments,
  coverImage,
}: BlogCardProps) => {
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

  return (
    <Link to={`/blog/${id}`}>
      <Card className="overflow-hidden hover:shadow-elevated transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/30 bg-card">
        {/* Cover Image */}
        {coverImage && (
          <div className="aspect-video bg-muted overflow-hidden">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        <div className="p-5">
          {/* Category Badge */}
          <Badge className={`mb-3 ${categoryColors[category]}`}>
            {categoryLabels[category]}
          </Badge>

          {/* Title */}
          <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {title}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {excerpt}
          </p>

          {/* Author & Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    alt={author}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{author}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {publishedAt}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {readTime}
              </span>
              {comments !== undefined && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {comments}
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="soft" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="soft" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default BlogCard;
