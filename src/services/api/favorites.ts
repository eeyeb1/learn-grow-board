import { apiClient } from './client';
import { ApiResponse, Favorite, CreateFavoriteRequest } from './types';

export const favoritesApi = {
  // GET /favorites - Get all user's favorites
  getAll: async (): Promise<ApiResponse<Favorite[]>> => {
    return apiClient.get<Favorite[]>('/favorites');
  },

  // POST /favorites - Add a job to favorites
  create: async (request: CreateFavoriteRequest): Promise<ApiResponse<Favorite>> => {
    return apiClient.post<Favorite>('/favorites', request);
  },

  // DELETE /favorites/:jobId - Remove a job from favorites
  delete: async (jobId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/favorites/${jobId}`);
  },

  // Check if a job is favorited (client-side helper)
  isFavorited: (favorites: Favorite[], jobId: string): boolean => {
    return favorites.some((fav) => fav.job_id === jobId);
  },
};
