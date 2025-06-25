// Configuration for API URLs
const isDevelopment = process.env.NODE_ENV === 'development';

// Base URL for API calls
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5001/api'
  : '/api';

// SSE URL for real-time updates
export const SSE_URL = isDevelopment
  ? 'http://localhost:5001/api/scraping-updates'
  : '/api/scraping-updates';

export default {
  API_BASE_URL,
  SSE_URL,
  isDevelopment
}; 