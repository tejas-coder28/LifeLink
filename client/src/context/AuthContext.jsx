import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('lifelink_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('lifelink_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.data && res.data.success) {
            setUser(res.data.data.user);
            setProfile(res.data.data.profile);
          }
        } catch (err) {
          console.error('Failed to load authenticated user:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data && res.data.success) {
      const userData = res.data.data;
      localStorage.setItem('lifelink_token', userData.token);
      localStorage.setItem('lifelink_user', JSON.stringify(userData));
      setToken(userData.token);
      setUser(userData);
      
      // Fetch full profile
      const meRes = await authApi.getMe();
      if (meRes.data && meRes.data.success) {
        setUser(meRes.data.data.user);
        setProfile(meRes.data.data.profile);
      }
      return userData;
    }
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    if (res.data && res.data.success) {
      const userData = res.data.data;
      localStorage.setItem('lifelink_token', userData.token);
      localStorage.setItem('lifelink_user', JSON.stringify(userData));
      setToken(userData.token);
      setUser(userData);

      const meRes = await authApi.getMe();
      if (meRes.data && meRes.data.success) {
        setUser(meRes.data.data.user);
        setProfile(meRes.data.data.profile);
      }
      return userData;
    }
  };

  const logout = () => {
    localStorage.removeItem('lifelink_token');
    localStorage.removeItem('lifelink_user');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        accountType: user?.accountType || user?.role || null,
        role: user?.accountType || user?.role || null,
        login,
        register,
        logout,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
