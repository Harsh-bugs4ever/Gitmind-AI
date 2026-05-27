import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Copy, FileText, Github, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, connectedRepo, setConnectedRepo }) => {
  const [repoInput, setRepoInput] = useState(connectedRepo || '');

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Duplicate Detector', path: '/duplicates', icon: Copy },
    { name: 'Release Notes', path: '/release-notes', icon: FileText },
  ];

  const handleConnect = (e) => {
    e.preventDefault();
    if (repoInput.trim()) {
      let parsedRepo = repoInput.trim();
      
      // Handle full github URLs
      if (parsedRepo.includes('github.com/')) {
        const urlParts = parsedRepo.split('github.com/')[1];
        if (urlParts) {
          const pathParts = urlParts.split('/');
          if (pathParts.length >= 2) {
            parsedRepo = `${pathParts[0]}/${pathParts[1]}`;
          }
        }
      }
      
      // Remove .git suffix if present
      if (parsedRepo.endsWith('.git')) {
        parsedRepo = parsedRepo.slice(0, -4);
      }

      setConnectedRepo(parsedRepo);
    }
  };

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-[#0d1117] border-r border-git-border transition-all duration-300 z-20 flex flex-col
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-git-border">
        <div className={`flex items-center space-x-3 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="relative flex-shrink-0">
            <Zap className="text-accent-blue animate-pulse-slow relative z-10" size={28} />
            <div className="absolute inset-0 bg-accent-blue/30 blur-md rounded-full"></div>
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-accent-purple">
              Gitmind-AI
            </span>
          )}
        </div>
      </div>

      {/* Toggle Button (Absolute middle right of sidebar) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-git-card border border-git-border text-git-muted hover:text-white rounded-full p-1 z-30 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group
              ${isActive 
                ? 'bg-accent-blue/10 text-accent-blue border-l-2 border-accent-blue' 
                : 'text-git-muted hover:bg-git-card hover:text-white border-l-2 border-transparent'
              }
              ${isCollapsed ? 'justify-center' : 'space-x-3'}
            `}
            title={isCollapsed ? item.name : ''}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Connect Repo Section */}
      <div className="p-4 border-t border-git-border bg-[#161b22]/50">
        {!isCollapsed ? (
          <form onSubmit={handleConnect} className="space-y-3">
            <label className="text-xs font-semibold text-git-muted uppercase tracking-wider flex items-center space-x-2">
              <Github size={14} />
              <span>Connect Repository</span>
            </label>
            <input 
              type="text" 
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g. vercel/next.js"
              className="input-field text-sm py-1.5"
            />
            <button type="submit" className="btn-primary w-full text-sm py-1.5">
              Connect
            </button>
          </form>
        ) : (
          <button 
            className="w-full flex justify-center text-git-muted hover:text-accent-blue transition-colors"
            title="Connect Repository"
            onClick={() => setIsCollapsed(false)}
          >
            <Github size={24} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
