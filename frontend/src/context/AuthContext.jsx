import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchCurrentUser } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Try to load auth state from local storage on mount
  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedUser = localStorage.getItem('gitmind_user');
      const storedToken = localStorage.getItem('gitmind_token');
      if (!storedToken) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(storedToken);
        setToken(storedToken);
        setUser(currentUser || (storedUser ? JSON.parse(storedUser) : null));
      } catch (error) {
        localStorage.removeItem('gitmind_user');
        localStorage.removeItem('gitmind_token');
        setUser(null);
        setToken(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = ({ user: userData, token: authToken }) => {
    if (authToken) {
      setToken(authToken);
      localStorage.setItem('gitmind_token', authToken);
    }
    setUser(userData);
    localStorage.setItem('gitmind_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('gitmind_user');
    localStorage.removeItem('gitmind_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
