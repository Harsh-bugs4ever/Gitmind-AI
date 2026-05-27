import React from 'react';

const SkeletonCard = ({ className = '', lines = 3 }) => {
  return (
    <div className={`glass-panel p-6 animate-pulse ${className}`}>
      <div className="h-5 bg-git-border rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 bg-git-border/50 rounded w-full"></div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonCard;
