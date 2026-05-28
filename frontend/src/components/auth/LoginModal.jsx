import React from 'react';
import { X, Github } from 'lucide-react';
import { beginGithubLogin } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

const LoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGithubLogin = () => {
    onClose();
    navigate('/');
    beginGithubLogin();
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
            onClick={handleGithubLogin}
            className="w-full bg-[#24292f] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-[#2f363d] transition-colors shadow-md border border-git-border"
          >
            <Github size={20} />
            <span>Sign in with GitHub</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
