import { useState, useEffect, useCallback } from "react";
import { JobDetail } from "@/data/jobDetails";

const FAVORITES_KEY = "job_favorites";
const APPLIED_KEY = "job_applied";
const DRAFT_KEY_PREFIX = "job_application_draft_";

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

// Get all favorites
export const getFavorites = (): FavoriteJob[] => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Check if a job is favorited
export const isFavorite = (jobId: string): boolean => {
  return getFavorites().some((fav) => fav.jobId === jobId);
};

// Toggle favorite status
export const toggleFavorite = (jobId: string): boolean => {
  const favorites = getFavorites();
  const existingIndex = favorites.findIndex((fav) => fav.jobId === jobId);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return false;
  } else {
    favorites.push({ jobId, savedAt: new Date().toISOString() });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return true;
  }
};

// Get all applied jobs
export const getAppliedJobs = (): AppliedJob[] => {
  try {
    const stored = localStorage.getItem(APPLIED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Check if already applied to a job
export const hasApplied = (jobId: string): boolean => {
  return getAppliedJobs().some((app) => app.jobId === jobId);
};

// Mark job as applied
export const markAsApplied = (
  jobId: string,
  formData: { fullName: string; email: string; phone: string }
): void => {
  const applied = getAppliedJobs();
  if (!applied.some((app) => app.jobId === jobId)) {
    applied.push({
      jobId,
      appliedAt: new Date().toISOString(),
      formData,
    });
    localStorage.setItem(APPLIED_KEY, JSON.stringify(applied));
  }
};

// Get all drafts
export const getAllDrafts = (): DraftData[] => {
  const drafts: DraftData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          const jobId = key.replace(DRAFT_KEY_PREFIX, "");
          drafts.push({ ...parsed, jobId });
        }
      }
    }
  } catch {
    return [];
  }
  return drafts.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
};

// Delete a draft
export const deleteDraft = (jobId: string): void => {
  localStorage.removeItem(`${DRAFT_KEY_PREFIX}${jobId}`);
};

// Remove from applied (if needed)
export const removeApplied = (jobId: string): void => {
  const applied = getAppliedJobs();
  const filtered = applied.filter((app) => app.jobId !== jobId);
  localStorage.setItem(APPLIED_KEY, JSON.stringify(filtered));
};

// Hook for reactive updates
export const useJobStorage = () => {
  const [favorites, setFavorites] = useState<FavoriteJob[]>(getFavorites());
  const [applied, setApplied] = useState<AppliedJob[]>(getAppliedJobs());
  const [drafts, setDrafts] = useState<DraftData[]>(getAllDrafts());

  const refreshData = useCallback(() => {
    setFavorites(getFavorites());
    setApplied(getAppliedJobs());
    setDrafts(getAllDrafts());
  }, []);

  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorageChange = () => {
      refreshData();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshData]);

  const handleToggleFavorite = useCallback((jobId: string) => {
    const isFav = toggleFavorite(jobId);
    setFavorites(getFavorites());
    return isFav;
  }, []);

  const handleMarkAsApplied = useCallback(
    (jobId: string, formData: { fullName: string; email: string; phone: string }) => {
      markAsApplied(jobId, formData);
      setApplied(getAppliedJobs());
    },
    []
  );

  const handleDeleteDraft = useCallback((jobId: string) => {
    deleteDraft(jobId);
    setDrafts(getAllDrafts());
  }, []);

  const handleRemoveApplied = useCallback((jobId: string) => {
    removeApplied(jobId);
    setApplied(getAppliedJobs());
  }, []);

  const handleRemoveFavorite = useCallback((jobId: string) => {
    toggleFavorite(jobId);
    setFavorites(getFavorites());
  }, []);

  return {
    favorites,
    applied,
    drafts,
    refreshData,
    toggleFavorite: handleToggleFavorite,
    markAsApplied: handleMarkAsApplied,
    deleteDraft: handleDeleteDraft,
    removeApplied: handleRemoveApplied,
    removeFavorite: handleRemoveFavorite,
    isFavorite: (jobId: string) => favorites.some((f) => f.jobId === jobId),
    hasApplied: (jobId: string) => applied.some((a) => a.jobId === jobId),
  };
};
