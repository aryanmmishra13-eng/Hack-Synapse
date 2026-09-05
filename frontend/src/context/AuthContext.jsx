import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('csh_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('csh_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('csh_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('csh_token', access_token);
    localStorage.setItem('csh_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  // Step 1 of registration: send OTP to email
  const sendOtp = async (name, email, password, skillLevel, preferredSport) => {
    const res = await api.post('/auth/send-otp', {
      name,
      email,
      password,
      skill_level: skillLevel,
      preferred_sport: preferredSport,
    });
    return res.data; // { message, expires_in_seconds }
  };

  // Step 2 of registration: verify OTP → create account
  const register = async (email, otp) => {
    const res = await api.post('/auth/register', { email, otp });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('csh_token', access_token);
    localStorage.setItem('csh_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };


  const logout = () => {
    localStorage.removeItem('csh_token');
    localStorage.removeItem('csh_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, sendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => useContext(AuthContext);
