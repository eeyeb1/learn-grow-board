import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BlogLike {
  id: string;
  user_id: string;
  blog_id: string;
  created_at: string;
}

interface BlogComment {
  id: string;
  user_id: string;
  blog_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface SavedBlog {
  id: string;
  user_id: string;
  blog_id: string;
  created_at: string;
}

export const useBlogInteractions = (blogId?: string) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState<BlogLike[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [savedBlogs, setSavedBlogs] = useState<SavedBlog[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all data for a specific blog
  const fetchBlogData = useCallback(async () => {
    if (!blogId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch likes count
      const { data: likesData } = await supabase
        .from("blog_likes")
        .select("*")
        .eq("blog_id", blogId);

      setLikes(likesData || []);

      // Check if current user liked
      if (user) {
        const userLiked = likesData?.some((like) => like.user_id === user.id);
        setIsLiked(userLiked || false);
      }

      // Fetch comments with user info
      const { data: commentsData } = await supabase
        .from("blog_comments")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      // Fetch user profiles for comments
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, p]) || []
        );

        const commentsWithUsers = commentsData.map((comment) => ({
          ...comment,
          user_name: profileMap.get(comment.user_id)?.full_name || "Anonymous",
          user_avatar: profileMap.get(comment.user_id)?.avatar_url || undefined,
        }));

        setComments(commentsWithUsers);
      } else {
        setComments([]);
      }

      // Check if user saved this blog
      if (user) {
        const { data: savedData } = await supabase
          .from("saved_blogs")
          .select("*")
          .eq("blog_id", blogId)
          .eq("user_id", user.id)
          .maybeSingle();

        setIsSaved(!!savedData);
      }
    } catch (error) {
      console.error("Error fetching blog data:", error);
    } finally {
      setLoading(false);
    }
  }, [blogId, user]);

  // Fetch all saved blogs for user
  const fetchUserSavedBlogs = useCallback(async () => {
    if (!user) {
      setSavedBlogs([]);
      return;
    }

    try {
      const { data } = await supabase
        .from("saved_blogs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setSavedBlogs(data || []);
    } catch (error) {
      console.error("Error fetching saved blogs:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchBlogData();
  }, [fetchBlogData]);

  useEffect(() => {
    fetchUserSavedBlogs();
  }, [fetchUserSavedBlogs]);

  // Toggle like
  const toggleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return false;
    }

    if (!blogId) return false;

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("blog_likes")
          .delete()
          .eq("blog_id", blogId)
          .eq("user_id", user.id);

        setLikes((prev) => prev.filter((like) => like.user_id !== user.id));
        setIsLiked(false);
        toast.success("Like removed");
      } else {
        // Like
        const { data, error } = await supabase
          .from("blog_likes")
          .insert({ blog_id: blogId, user_id: user.id })
          .select()
          .single();

        if (error) throw error;

        setLikes((prev) => [...prev, data]);
        setIsLiked(true);
        toast.success("Post liked!");
      }
      return true;
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
      return false;
    }
  };

  // Toggle save
  const toggleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save posts");
      return false;
    }

    if (!blogId) return false;

    try {
      if (isSaved) {
        // Unsave
        await supabase
          .from("saved_blogs")
          .delete()
          .eq("blog_id", blogId)
          .eq("user_id", user.id);

        setSavedBlogs((prev) => prev.filter((s) => s.blog_id !== blogId));
        setIsSaved(false);
        toast.success("Post removed from saved");
      } else {
        // Save
        const { data, error } = await supabase
          .from("saved_blogs")
          .insert({ blog_id: blogId, user_id: user.id })
          .select()
          .single();

        if (error) throw error;

        setSavedBlogs((prev) => [...prev, data]);
        setIsSaved(true);
        toast.success("Post saved!");
      }
      return true;
    } catch (error) {
      console.error("Error toggling save:", error);
      toast.error("Failed to save post");
      return false;
    }
  };

  // Add comment
  const addComment = async (content: string) => {
    if (!user) {
      toast.error("Please sign in to comment");
      return null;
    }

    if (!blogId) return null;

    try {
      const { data, error } = await supabase
        .from("blog_comments")
        .insert({ blog_id: blogId, user_id: user.id, content })
        .select()
        .single();

      if (error) throw error;

      // Get user profile for the new comment
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const newComment: BlogComment = {
        ...data,
        user_name: profile?.full_name || "Anonymous",
        user_avatar: profile?.avatar_url || undefined,
      };

      setComments((prev) => [newComment, ...prev]);
      toast.success("Comment added!");
      return newComment;
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
      return null;
    }
  };

  // Delete comment
  const deleteComment = async (commentId: string) => {
    if (!user) return false;

    try {
      await supabase.from("blog_comments").delete().eq("id", commentId);

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
      return true;
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
      return false;
    }
  };

  // Copy link
  const copyLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
      return true;
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
      return false;
    }
  };

  // Share functions
  const shareOnTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check out this post!");
    window.open(
      `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      "_blank"
    );
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank"
    );
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank"
    );
  };

  return {
    likes,
    comments,
    savedBlogs,
    isLiked,
    isSaved,
    loading,
    likesCount: likes.length,
    commentsCount: comments.length,
    toggleLike,
    toggleSave,
    addComment,
    deleteComment,
    copyLink,
    shareOnTwitter,
    shareOnLinkedIn,
    shareOnFacebook,
    refresh: fetchBlogData,
    refreshSavedBlogs: fetchUserSavedBlogs,
  };
};
