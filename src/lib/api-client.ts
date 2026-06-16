/**
 * src/lib/api-client.ts
 * 
 * Simple fetch wrapper to replace Supabase client calls
 * with requests to our new PHP API on CPanel.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = {
  async get(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(`${API_BASE_URL}/${endpoint}`, window.location.origin);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key]);
        }
    });
    
    const response = await fetch(url.toString());
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API Error: ${response.status}`);
    }
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const url = new URL(`${API_BASE_URL}/${endpoint}`, window.location.origin);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    // Read response as text first to handle non-JSON responses
    const text = await response.text();
    
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = text ? JSON.parse(text) : { error: `HTTP ${response.status}` };
      } catch {
        // If response is not JSON, show the raw response (might be HTML error page)
        errorData = { 
          error: `API Error: ${response.status}`,
          details: text.substring(0, 200) // Show first 200 chars of response
        };
      }
      throw new Error(
        errorData?.error || errorData?.message || `API Error: ${response.status}`,
      );
    }
    
    // Parse JSON response
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
  }
};
