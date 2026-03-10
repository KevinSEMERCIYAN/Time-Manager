import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const token = localStorage.getItem('tm_token');
    if (token) {
      // Récupérer les rôles depuis localStorage comme fallback
      const storedRoles = localStorage.getItem('tm_roles');
      const rolesFromStorage = storedRoles ? JSON.parse(storedRoles) : [];
      
      // Vérifier la validité du token
      authAPI
        .getMe()
        .then((data) => {
          const roles = Array.isArray(data.roles) && data.roles.length > 0 
            ? data.roles 
            : rolesFromStorage;
          setUser({
            username: data.username,
            roles: roles,
            displayName: localStorage.getItem('tm_display_name') || data.username,
            team: localStorage.getItem('tm_team') || '',
          });
          // Mettre à jour localStorage avec les rôles du serveur
          if (Array.isArray(data.roles) && data.roles.length > 0) {
            localStorage.setItem('tm_roles', JSON.stringify(data.roles));
          }
          setLoading(false);
        })
        .catch(() => {
          // Si l'API échoue, utiliser les rôles stockés comme fallback
          if (rolesFromStorage.length > 0) {
            setUser({
              username: localStorage.getItem('tm_username') || '',
              roles: rolesFromStorage,
              displayName: localStorage.getItem('tm_display_name') || '',
              team: localStorage.getItem('tm_team') || '',
            });
            setLoading(false);
          } else {
            // Token invalide, déconnexion
            authAPI.logout();
            setUser(null);
            setLoading(false);
          }
        })
        .finally(() => {
          // Le loading sera géré dans le catch ou le then
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Surveiller la connexion réseau
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      const data = await authAPI.login(username, password);
      const roles = Array.isArray(data.roles) ? data.roles : [];
      setUser({
        username: data.username,
        roles: roles,
        displayName: data.displayName || data.username,
        team: data.team || '',
      });
      // S'assurer que les rôles sont bien stockés dans localStorage
      if (roles.length > 0) {
        localStorage.setItem('tm_roles', JSON.stringify(roles));
      }
      return data;
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setError(null);
  };

  const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;
  const isManager = user?.roles?.includes('ROLE_MANAGER') || false;
  const isEmployee = user?.roles?.includes('ROLE_EMPLOYEE') || false;

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
    isManager,
    isEmployee,
    isOnline,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
