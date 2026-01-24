import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { User, Trash2, Loader2, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  replies?: Comment[];
}

interface BlogCommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string, parentCommentId?: string) => Promise<unknown>;
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

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

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(replyContent.trim(), parentId);
      setReplyContent("");
      setReplyingTo(null);
      // Expand replies to show the new one
      setExpandedReplies((prev) => new Set(prev).add(parentId));
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

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
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

  // Count total comments including replies
  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  const CommentItem = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);

    return (
      <div className={isReply ? "ml-8 border-l-2 border-border pl-4" : ""}>
        <Card className={`p-4 ${isReply ? "bg-muted/30" : ""}`}>
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
                <div className="flex items-center gap-1">
                  {!isReply && user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyContent("");
                      }}
                    >
                      <Reply className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                  )}
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
              </div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {comment.content}
              </p>

              {/* Show/Hide Replies Button */}
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs text-primary"
                  onClick={() => toggleReplies(comment.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Hide {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Reply Form */}
        {replyingTo === comment.id && (
          <div className="ml-8 mt-2 border-l-2 border-primary/30 pl-4">
            <Card className="p-3 bg-muted/30">
              <Textarea
                placeholder={`Reply to ${comment.user_name}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={submitting}
                className="mb-2 resize-none text-sm"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => handleReply(comment.id)}
                  disabled={!replyContent.trim() || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Replying...
                    </>
                  ) : (
                    "Reply"
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Replies */}
        {hasReplies && isExpanded && (
          <div className="mt-2 space-y-2">
            {comment.replies!.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="font-display font-semibold text-xl text-foreground">
        Comments ({totalComments})
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
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
};

export default BlogCommentSection;
