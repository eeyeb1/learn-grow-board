import { apiClient } from './client';
import { ApiResponse, Application, CreateApplicationRequest } from './types';

export const applicationsApi = {
  // GET /applications - Get all user's submitted applications
  getAll: async (): Promise<ApiResponse<Application[]>> => {
    return apiClient.get<Application[]>('/applications');
  },

  // POST /applications - Submit a new application
  create: async (request: CreateApplicationRequest): Promise<ApiResponse<Application>> => {
    return apiClient.post<Application>('/applications', request);
  },

  // Check if user has applied to a job (client-side helper)
  hasApplied: (applications: Application[], jobId: string): boolean => {
    return applications.some((app) => app.job_id === jobId);
  },

  // Get application for a specific job (client-side helper)
  getApplicationForJob: (applications: Application[], jobId: string): Application | undefined => {
    return applications.find((app) => app.job_id === jobId);
  },
};
