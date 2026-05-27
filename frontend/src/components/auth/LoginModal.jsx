import React, { useState } from 'react';
import { X, Mail, Lock, Github } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleEmailLogin = (e) => {
    e.preventDefault();
    if (email.trim()) {
      login({ email, name: email.split('@')[0], provider: 'email' });
      onClose();
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = () => {
    // Mocking Google Sign in
    const mockEmail = prompt("Simulating Google Sign-In: Enter your Google Email ID:");
    if (mockEmail && mockEmail.trim()) {
      login({ email: mockEmail, name: mockEmail.split('@')[0], provider: 'google' });
      onClose();
      navigate('/dashboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-git-muted hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-git-muted text-sm">Sign in to continue to <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-accent-purple font-semibold">Gitmind-AI</span></p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full mb-6 bg-white text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-gray-100 transition-colors shadow-md"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="flex items-center mb-6">
            <div className="flex-1 h-px bg-git-border"></div>
            <span className="px-3 text-sm text-git-muted">or continue with email</span>
            <div className="flex-1 h-px bg-git-border"></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-git-muted mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-git-muted">
                  <Mail size={16} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 bg-[#0d1117]" 
                  placeholder="name@company.com" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-git-muted mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-git-muted">
                  <Lock size={16} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 bg-[#0d1117]" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3 mt-2 font-semibold">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
