import { fetchApi } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  designation?: string;
  companyName?: string;
  phoneNumber?: string;
  contactEmail?: string;
  organizationId?: string;
  organizationName?: string;
}

export interface UserProfileData {
  name?: string;
  avatarUrl?: string;
  designation?: string;
  companyName?: string;
  phoneNumber?: string;
  contactEmail?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds?: number;
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; data?: LoginResponse; error?: string }> {
  try {
    const res = await fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return {
      success: true,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Invalid email or password. Access denied.',
    };
  }
}

export async function refreshSessionToken(): Promise<{ success: boolean; accessToken?: string; refreshToken?: string }> {
  try {
    const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!storedRefreshToken) return { success: false };

    const res = await fetchApi<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (res.data?.accessToken && res.data?.refreshToken) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', res.data.accessToken);
        localStorage.setItem('refresh_token', res.data.refreshToken);
      }
      return {
        success: true,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      };
    }
    return { success: false };
  } catch (err) {
    return { success: false };
  }
}

export async function getCurrentUser(token?: string): Promise<{ success: boolean; user?: User }> {
  try {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
    if (!authToken) {
      return { success: false };
    }

    let res;
    try {
      res = await fetchApi<{ user: User }>('/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    } catch (err: any) {
      // If access token is expired (401), attempt refresh token rotation
      if (err.status === 401) {
        const refreshed = await refreshSessionToken();
        if (refreshed.success && refreshed.accessToken) {
          res = await fetchApi<{ user: User }>('/auth/me', {
            headers: {
              Authorization: `Bearer ${refreshed.accessToken}`,
            },
          });
        } else {
          return { success: false };
        }
      } else {
        return { success: false };
      }
    }

    return {
      success: true,
      user: res?.data?.user,
    };
  } catch (err) {
    return { success: false };
  }
}

export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    await fetchApi('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });
  } catch (err) {
    // Ignore error on logout
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  }
  return { success: true };
}

export async function updateUserProfile(data: UserProfileData): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!authToken) return { success: false, error: 'Not authenticated' };

    const res = await fetchApi<{ user: User }>('/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (res.data?.user && typeof window !== 'undefined') {
      localStorage.setItem('user_info', JSON.stringify(res.data.user));
    }

    return {
      success: true,
      user: res.data?.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to update user profile',
    };
  }
}
