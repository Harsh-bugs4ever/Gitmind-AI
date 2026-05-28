import React, { useState, useEffect, useRef } from 'react';
import { Bell, Github, User, LogOut, CircleDot, GitPullRequest } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getIssues } from '../../services/githubService';

const Navbar = ({ connectedRepo }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications based on connected repo
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!connectedRepo) {
        setNotifications([]);
        return;
      }
      setLoadingNotifications(true);
      try {
        const [owner, repo] = connectedRepo.split('/');
        const issues = await getIssues(owner, repo);
        // Map top 5 issues to notifications
        setNotifications(issues.slice(0, 5));
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };
    
    fetchNotifications();
  }, [connectedRepo]);

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    navigate('/');
  };

  // Get dynamic page title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Home';
      case '/dashboard': return 'Repository Health Dashboard';
      case '/chat': return 'Natural Language Chat';
      case '/duplicates': return 'Duplicate Issue Detector';
      case '/release-notes': return 'Release Notes Generator';
      default: return 'Gitmind-AI';
    }
  };

  return (
    <header className="h-16 bg-[#0d1117]/80 backdrop-blur-md border-b border-git-border flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-white">{getPageTitle()}</h1>
        
        {connectedRepo && location.pathname !== '/' && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-git-card border border-git-border text-sm text-git-muted">
            <Github size={14} />
            <span>{connectedRepo}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-6">
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              setShowNotificationDropdown(!showNotificationDropdown);
              setShowProfileDropdown(false);
            }}
            className="text-git-muted hover:text-white transition-colors relative flex items-center justify-center p-1"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-accent-blue rounded-full"></span>
            )}
          </button>

          {showNotificationDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-git-card border border-git-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-git-border bg-git-dark/50">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                <p className="text-xs text-git-muted">
                  {connectedRepo ? `Recent activity in ${connectedRepo}` : 'Connect a repo to see activity'}
                </p>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto">
                {loadingNotifications ? (
                  <div className="p-4 text-center text-git-muted text-sm">Loading activity...</div>
                ) : notifications.length > 0 ? (
                  <div className="divide-y divide-git-border">
                    {notifications.map((item) => (
                      <div key={item.id || item.number} className="p-4 hover:bg-git-dark/50 transition-colors cursor-pointer flex gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {item.pull_request ? (
                            <GitPullRequest size={16} className="text-purple-400" />
                          ) : (
                            <CircleDot size={16} className={item.state === 'open' ? 'text-green-400' : 'text-red-400'} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium line-clamp-2 leading-snug">{item.title}</p>
                          <p className="text-xs text-git-muted mt-1">
                            #{item.number} opened by {item.user?.login}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center flex flex-col items-center">
                    <Bell size={24} className="text-git-border mb-2" />
                    <p className="text-sm text-git-muted">No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotificationDropdown(false);
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-blue to-accent-purple flex items-center justify-center text-white cursor-pointer hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] transition-shadow"
          >
            <User size={16} />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-3 w-64 bg-git-card border border-git-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {user ? (
                <>
                  <div className="px-4 py-3 border-b border-git-border bg-git-dark/50">
                    <p className="text-sm text-white font-semibold truncate">{user.name || user.login || 'User'}</p>
                    <p className="text-xs text-git-muted truncate">@{user.login || 'github-user'}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-git-muted mb-3">You are not signed in.</p>
                  <button 
                    onClick={() => navigate('/')}
                    className="w-full btn-primary text-sm py-2"
                  >
                    Go to Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
