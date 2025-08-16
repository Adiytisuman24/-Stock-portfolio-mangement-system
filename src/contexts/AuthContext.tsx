import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  role: string;
}

interface UserPreferences {
  preferred_markets: string[];
  watchlist: string[];
  onboarding_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchUserData = async () => {
    try {
      const [userResponse, preferencesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/me`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/preferences`, { headers: getAuthHeaders() })
      ]);

      if (userResponse.ok && preferencesResponse.ok) {
        const userData = await userResponse.json();
        const preferencesData = await preferencesResponse.json();
        setUser(userData);
        setPreferences(preferencesData);
      } else {
        localStorage.removeItem('token');
        setUser(null);
        setPreferences(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
      setUser(null);
      setPreferences(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    
    // Fetch preferences after login
    try {
      const preferencesResponse = await fetch(`${API_BASE_URL}/preferences`, {
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (preferencesResponse.ok) {
        const preferencesData = await preferencesResponse.json();
        setPreferences(preferencesData);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const register = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 409) {
        throw new Error('Email already exists');
      }
      throw new Error('Registration failed');
    }
  };

  const updatePreferences = async (newPreferences: UserPreferences) => {
    const response = await fetch(`${API_BASE_URL}/preferences`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newPreferences),
    });

    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }

    setPreferences(newPreferences);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPreferences(null);
  };

  const value = {
    user,
    preferences,
    login,
    register,
    logout,
    updatePreferences,
    loading,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};