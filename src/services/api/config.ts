// API Configuration
// Update this with your backend URL when ready

export const API_CONFIG = {
  // Base URL for your API (update this when you deploy your backend)
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  
  // Request timeout in milliseconds
  timeout: 30000,
};

// Helper to get auth token (implement based on your auth system)
export const getAuthToken = (): string | null => {
  // Replace with your auth token retrieval logic
  // e.g., from localStorage, cookie, or auth context
  return localStorage.getItem('auth_token');
};
