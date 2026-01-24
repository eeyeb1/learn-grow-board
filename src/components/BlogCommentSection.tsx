import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { User, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface BlogCommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string) => Promise<unknown>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
}

const BlogCommentSection = ({
  comments,
  onAddComment,
  onDeleteComment,
}: BlogCommentSectionProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await onDeleteComment(commentId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="font-display font-semibold text-xl text-foreground">
        Comments ({comments.length})
      </h3>

      {/* Add Comment Form */}
      <Card className="p-4">
        <Textarea
          placeholder={user ? "Write a comment..." : "Sign in to comment"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={!user || submitting}
          className="mb-3 resize-none"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            variant="hero"
            size="sm"
            onClick={handleSubmit}
            disabled={!user || !newComment.trim() || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Comment"
            )}
          </Button>
        </div>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {comment.user_avatar ? (
                    <img
                      src={comment.user_avatar}
                      alt={comment.user_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-foreground">
                        {comment.user_name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BlogCommentSection;
