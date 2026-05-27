import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Github, Mail, AlertCircle } from 'lucide-react';

const Register = () => {
  const { loginWithGoogle, loginWithGithub } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to log in with Google. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGithub();
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to log in with GitHub. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="glass-panel p-10 max-w-md w-full relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-purple/10 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3" />

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Welcome to Gitmind-AI
          </h2>
          <p className="text-git-muted">Sign in to sync your repositories and access advanced analytics.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start space-x-3 text-red-400">
            <AlertCircle className="flex-shrink-0 w-5 h-5 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button 
            onClick={handleGithubLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-[#24292F] text-white font-semibold py-3 px-4 rounded-xl border border-git-border hover:bg-[#2c3137] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Github className="w-5 h-5" />
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-git-border/50 text-center text-sm text-git-muted">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
};

export default Register;
