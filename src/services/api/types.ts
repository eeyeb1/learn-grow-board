// API Response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// User Profile
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Favorites
export interface Favorite {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
}

export interface CreateFavoriteRequest {
  job_id: string;
}

// Application Drafts
export interface ApplicationDraft {
  id: string;
  user_id: string;
  job_id: string;
  form_data: DraftFormData;
  resume_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftFormData {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  coverLetter: string;
}

export interface CreateOrUpdateDraftRequest {
  job_id: string;
  form_data: DraftFormData;
  resume_file_name?: string;
}

// Applications (Submitted)
export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  form_data: ApplicationFormData;
  created_at: string;
}

export interface ApplicationFormData {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  coverLetter: string;
}

export interface CreateApplicationRequest {
  job_id: string;
  form_data: ApplicationFormData;
}
