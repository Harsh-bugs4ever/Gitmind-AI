import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCurrentUser } from '../services/authService';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const completeLogin = async () => {
      const token = searchParams.get('token');
      if (!token) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const user = await fetchCurrentUser(token);
        login({ user, token });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('OAuth callback failed', error);
        navigate('/', { replace: true });
      }
    };

    completeLogin();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-git-dark text-white flex items-center justify-center">
      <p className="text-git-muted">Completing GitHub sign-in...</p>
    </div>
  );
};

export default AuthCallback;

