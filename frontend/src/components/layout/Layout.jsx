import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children, connectedRepo, setConnectedRepo }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {
    return <main className="min-h-screen bg-git-dark">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-git-dark text-git-text">
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        connectedRepo={connectedRepo}
        setConnectedRepo={setConnectedRepo}
      />
      
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        <Navbar connectedRepo={connectedRepo} />
        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
