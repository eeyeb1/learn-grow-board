import { apiClient } from './client';
import { ApiResponse, ApplicationDraft, CreateOrUpdateDraftRequest } from './types';

export const draftsApi = {
  // GET /drafts - Get all user's drafts
  getAll: async (): Promise<ApiResponse<ApplicationDraft[]>> => {
    return apiClient.get<ApplicationDraft[]>('/drafts');
  },

  // GET /drafts/:jobId - Get a specific draft by job ID
  getByJobId: async (jobId: string): Promise<ApiResponse<ApplicationDraft>> => {
    return apiClient.get<ApplicationDraft>(`/drafts/${jobId}`);
  },

  // POST /drafts - Create or update a draft
  createOrUpdate: async (request: CreateOrUpdateDraftRequest): Promise<ApiResponse<ApplicationDraft>> => {
    return apiClient.post<ApplicationDraft>('/drafts', request);
  },

  // DELETE /drafts/:jobId - Delete a draft
  delete: async (jobId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/drafts/${jobId}`);
  },

  // Check if a draft exists for a job (client-side helper)
  hasDraft: (drafts: ApplicationDraft[], jobId: string): boolean => {
    return drafts.some((draft) => draft.job_id === jobId);
  },

  // Get draft for a specific job (client-side helper)
  getDraftForJob: (drafts: ApplicationDraft[], jobId: string): ApplicationDraft | undefined => {
    return drafts.find((draft) => draft.job_id === jobId);
  },
};
