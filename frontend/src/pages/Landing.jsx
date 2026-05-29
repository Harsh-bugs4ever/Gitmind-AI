import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, MessageSquare, Copy, FileText, ArrowRight, Zap, BarChart2 } from 'lucide-react';
import LoginModal from '../components/auth/LoginModal';
import Hero3D from '../components/Hero3D';

const Landing = () => {
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
      <Hero3D />
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-purple/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Navbar Minimal */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto pointer-events-none">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <img src="/logo.png" alt="Gitmind-AI Logo" className="w-20 h-20 object-contain brightness-125" />
          <span className="font-bold text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-accent-purple">Gitmind-AI</span>
        </div>
        <div className="flex items-center space-x-4 pointer-events-auto">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="text-git-muted hover:text-white font-medium transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue hover:text-white border border-accent-blue/20 rounded-lg font-medium transition-all duration-300 shadow-[0_0_15px_rgba(88,166,255,0.15)] hover:shadow-[0_0_25px_rgba(88,166,255,0.3)]"
          >
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 text-center pointer-events-none">
        <div className="inline-flex items-center px-4 py-2 rounded-full glass-panel text-sm text-accent-blue mb-8 border border-accent-blue/30 shadow-[0_0_15px_rgba(88,166,255,0.15)] pointer-events-auto opacity-0 animate-fade-in-up">
          <span className="flex h-2 w-2 rounded-full bg-accent-blue mr-3 animate-pulse"></span>
          Powered by HPSA
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight pointer-events-auto opacity-0 animate-fade-in-up-delay-1">
          Understand your GitHub <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue via-accent-purple to-accent-blue animate-gradient-x">
            repos with AI
          </span>
        </h1>

        <p className="text-xl text-git-muted max-w-2xl mx-auto mb-12 pointer-events-auto opacity-0 animate-fade-in-up-delay-2">
          Ask questions, detect duplicate issues, auto-generate release notes, and monitor repo health — all natively integrated with your workflow.
        </p>

        <button
          onClick={() => setIsLoginModalOpen(true)}
          className="px-8 py-4 bg-accent-blue hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(88,166,255,0.4)] hover:shadow-[0_0_50px_rgba(88,166,255,0.6)] flex items-center space-x-3 mx-auto group hover:-translate-y-1 pointer-events-auto opacity-0 animate-fade-in-up-delay-2"
        >
          <span>Get Started</span>
          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
        </button>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 text-left pointer-events-auto opacity-0 animate-fade-in-up-delay-3">
          <div className="glass-panel p-8 hover:-translate-y-2 transition-transform duration-300 group cursor-default">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-accent-blue mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Natural Language Chat</h3>
            <p className="text-git-muted leading-relaxed">
              Query your repository history, bugs, and contributor stats using natural language, converted instantly to data queries.
            </p>
          </div>

          <div className="glass-panel p-8 hover:-translate-y-2 transition-transform duration-300 group cursor-default">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-accent-purple mb-6 group-hover:scale-110 transition-transform">
              <Copy size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Duplicate Detection</h3>
            <p className="text-git-muted leading-relaxed">
              Automatically identify semantically similar issues before they pollute your backlog using Gemini's advanced embedding analysis.
            </p>
          </div>

          <div className="glass-panel p-8 hover:-translate-y-2 transition-transform duration-300 group cursor-default">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">AI Release Notes</h3>
            <p className="text-git-muted leading-relaxed">
              Generate perfectly categorized, professional release notes from merged PR titles in seconds.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-git-border py-8 text-center text-git-muted pointer-events-none">
        <p className="flex items-center justify-center space-x-2">
          <span>Built for Developers 2026</span>
          <span className="w-1 h-1 rounded-full bg-git-muted"></span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-accent-purple font-semibold">Gitmind-AI</span>
        </p>
      </footer>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};

export default Landing;
