import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SemanticSearchResult {
  matchingJobIds: string[];
  error?: string;
}

export const useSemanticSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchJobs = useCallback(async (query: string, location?: string): Promise<string[]> => {
    if (!query.trim()) {
      return [];
    }

    // Check if user is authenticated - semantic search requires auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("Semantic search requires authentication, falling back to standard search");
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<SemanticSearchResult>(
        "semantic-job-search",
        {
          body: { query, location },
        }
      );

      if (fnError) {
        console.error("Semantic search error:", fnError);
        setError(fnError.message);
        return [];
      }

      return data?.matchingJobIds || [];
    } catch (err) {
      console.error("Semantic search failed:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchJobs,
    loading,
    error,
  };
};
