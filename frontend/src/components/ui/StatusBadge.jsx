import React from 'react';

const StatusBadge = ({ status }) => {
  const normalizedStatus = status?.toLowerCase();
  
  const getBadgeStyle = () => {
    switch (normalizedStatus) {
      case 'open':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'closed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'merged':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()}`}>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
