import React from 'react';

const SectionHeader = ({ title, subtitle, icon: Icon, className = '' }) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-2">
        {Icon && (
          <div className="p-2 bg-accent-blue/10 text-accent-blue rounded-lg">
            <Icon size={20} />
          </div>
        )}
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-git-muted ml-[3.25rem]">{subtitle}</p>
      )}
    </div>
  );
};

export default SectionHeader;
