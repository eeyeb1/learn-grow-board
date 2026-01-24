import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DraftData {
  jobId: string;
  formData: {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    portfolio: string;
    coverLetter: string;
  };
  resumeFileName?: string;
  savedAt: string;
}

export interface AppliedJob {
  jobId: string;
  appliedAt: string;
  formData: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export interface FavoriteJob {
  jobId: string;
  savedAt: string;
}

// Hook for reactive updates with Supabase backend
export const useJobStorage = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteJob[]>([]);
  const [applied, setApplied] = useState<AppliedJob[]>([]);
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data from Supabase
  const refreshData = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setApplied([]);
      setDrafts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch favorites
      const { data: favData } = await supabase
        .from("favorites")
        .select("job_id, created_at")
        .eq("user_id", user.id);

      if (favData) {
        setFavorites(
          favData.map((f) => ({
            jobId: f.job_id,
            savedAt: f.created_at,
          }))
        );
      }

      // Fetch applications
      const { data: appData } = await supabase
        .from("applications")
        .select("job_id, submitted_at, form_data")
        .eq("user_id", user.id);

      if (appData) {
        setApplied(
          appData.map((a) => ({
            jobId: a.job_id,
            appliedAt: a.submitted_at,
            formData: a.form_data as AppliedJob["formData"],
          }))
        );
      }

      // Fetch drafts
      const { data: draftData } = await supabase
        .from("application_drafts")
        .select("job_id, form_data, updated_at")
        .eq("user_id", user.id);

      if (draftData) {
        setDrafts(
          draftData.map((d) => ({
            jobId: d.job_id,
            formData: d.form_data as DraftData["formData"],
            savedAt: d.updated_at,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching job storage data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleToggleFavorite = useCallback(
    async (jobId: string) => {
      if (!user) return false;

      const existingFavorite = favorites.find((f) => f.jobId === jobId);

      if (existingFavorite) {
        // Remove favorite
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);

        setFavorites((prev) => prev.filter((f) => f.jobId !== jobId));
        return false;
      } else {
        // Add favorite
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          job_id: jobId,
        });

        if (!error) {
          setFavorites((prev) => [
            ...prev,
            { jobId, savedAt: new Date().toISOString() },
          ]);
        }
        return true;
      }
    },
    [user, favorites]
  );

  const handleMarkAsApplied = useCallback(
    async (
      jobId: string,
      formData: { fullName: string; email: string; phone: string }
    ) => {
      if (!user) return;

      const { error } = await supabase.from("applications").insert({
        user_id: user.id,
        job_id: jobId,
        form_data: formData,
        status: "submitted",
      });

      if (!error) {
        setApplied((prev) => [
          ...prev,
          { jobId, appliedAt: new Date().toISOString(), formData },
        ]);

        // Delete draft if exists
        await supabase
          .from("application_drafts")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);

        setDrafts((prev) => prev.filter((d) => d.jobId !== jobId));
      }
    },
    [user]
  );

  const handleSaveDraft = useCallback(
    async (jobId: string, formData: DraftData["formData"]) => {
      if (!user) return;

      const { error } = await supabase.from("application_drafts").upsert(
        {
          user_id: user.id,
          job_id: jobId,
          form_data: formData,
        },
        { onConflict: "user_id,job_id" }
      );

      if (!error) {
        setDrafts((prev) => {
          const existing = prev.findIndex((d) => d.jobId === jobId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = {
              jobId,
              formData,
              savedAt: new Date().toISOString(),
            };
            return updated;
          }
          return [...prev, { jobId, formData, savedAt: new Date().toISOString() }];
        });
      }
    },
    [user]
  );

  const handleDeleteDraft = useCallback(
    async (jobId: string) => {
      if (!user) return;

      await supabase
        .from("application_drafts")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      setDrafts((prev) => prev.filter((d) => d.jobId !== jobId));
    },
    [user]
  );

  const handleRemoveApplied = useCallback(
    async (jobId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      if (error) {
        console.error("Error removing application:", error);
        return;
      }

      setApplied((prev) => prev.filter((a) => a.jobId !== jobId));
    },
    [user]
  );

  const handleRemoveFavorite = useCallback(
    async (jobId: string) => {
      if (!user) return;

      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      setFavorites((prev) => prev.filter((f) => f.jobId !== jobId));
    },
    [user]
  );

  return {
    favorites,
    applied,
    drafts,
    loading,
    refreshData,
    toggleFavorite: handleToggleFavorite,
    markAsApplied: handleMarkAsApplied,
    saveDraft: handleSaveDraft,
    deleteDraft: handleDeleteDraft,
    removeApplied: handleRemoveApplied,
    removeFavorite: handleRemoveFavorite,
    isFavorite: (jobId: string) => favorites.some((f) => f.jobId === jobId),
    hasApplied: (jobId: string) => applied.some((a) => a.jobId === jobId),
    getDraft: (jobId: string) => drafts.find((d) => d.jobId === jobId),
  };
};

// Legacy exports for backwards compatibility (will use localStorage as fallback when not logged in)
export const getFavorites = (): FavoriteJob[] => [];
export const isFavorite = (_jobId: string): boolean => false;
export const toggleFavorite = (_jobId: string): boolean => false;
export const getAppliedJobs = (): AppliedJob[] => [];
export const hasApplied = (_jobId: string): boolean => false;
export const markAsApplied = (
  _jobId: string,
  _formData: { fullName: string; email: string; phone: string }
): void => {};
export const getAllDrafts = (): DraftData[] => [];
export const deleteDraft = (_jobId: string): void => {};
export const removeApplied = (_jobId: string): void => {};
