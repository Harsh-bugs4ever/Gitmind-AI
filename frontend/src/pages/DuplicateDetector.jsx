import React, { useState } from 'react';
import { Copy, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { checkDuplicateIssue } from '../services/geminiService';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const DuplicateDetector = ({ connectedRepo }) => {
  const [inputTitle, setInputTitle] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState(null); // null means hasn't searched yet
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    if (!inputTitle.trim()) return;

    setIsChecking(true);
    setError(null);

    try {
      const response = await checkDuplicateIssue({
        title: inputTitle,
        description: inputDesc,
        connectedRepo,
      });
      setResults(response.matches || []);
    } catch (error) {
      console.error("Failed to detect duplicates:", error);
      setError(error.message || "Failed to check for duplicates.");
      setResults([]);
    } finally {
      setIsChecking(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-accent-blue';
  };

  if (!connectedRepo) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-git-card rounded-full flex items-center justify-center mb-6">
          <Copy size={32} className="text-git-muted" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect a Repository</h2>
        <p className="text-git-muted max-w-md">
          Enter a GitHub repository in the sidebar to scan it for duplicate issues.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      
      {/* Input Panel (40%) */}
      <div className="w-full md:w-5/12 glass-panel p-6 flex flex-col h-full">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-500/10 text-accent-purple rounded-lg">
            <Copy size={20} />
          </div>
          <h2 className="text-xl font-bold">New Issue Details</h2>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-semibold text-git-muted mb-2">Issue Title</label>
            <input
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              placeholder="e.g. Memory leak in useEffect"
              className="input-field"
            />
          </div>
          <div className="flex-1 h-[calc(100%-120px)]">
            <label className="block text-sm font-semibold text-git-muted mb-2">Description</label>
            <textarea
              value={inputDesc}
              onChange={(e) => setInputDesc(e.target.value)}
              placeholder="Paste the issue description here..."
              className="input-field h-full resize-none min-h-[200px]"
            />
          </div>
        </div>

        <button 
          onClick={handleCheck}
          disabled={isChecking || !inputTitle.trim()}
          className="btn-primary w-full mt-6 py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <>
              <LoadingSpinner size={18} className="text-white" />
              <span>Analyzing Similarity...</span>
            </>
          ) : (
            <>
              <Search size={18} />
              <span>Check for Duplicates</span>
            </>
          )}
        </button>
      </div>

      {/* Results Panel (60%) */}
      <div className="w-full md:w-7/12 flex flex-col gap-6 h-full">
        
        {/* Results Area */}
        <div className="glass-panel flex-1 p-6 overflow-y-auto">
          <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
            <span>Detection Results</span>
            {results && results.length > 0 && (
              <span className="text-sm font-normal px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                {results.length} Potential Duplicates
              </span>
            )}
          </h3>

          {!results && !isChecking && (
            <div className="h-full flex flex-col items-center justify-center text-git-muted opacity-50 space-y-4">
              <Copy size={48} className="text-git-border" />
              <p>Enter an issue on the left to check for duplicates.</p>
            </div>
          )}

          {isChecking && (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <LoadingSpinner size={48} />
                <div className="absolute inset-0 bg-accent-blue/20 blur-xl rounded-full"></div>
              </div>
              <p className="text-accent-blue animate-pulse">Scanning repository history through the backend...</p>
            </div>
          )}

          {error && !isChecking && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {results && results.length === 0 && !isChecking && (
            <div className="h-full flex flex-col items-center justify-center text-green-400 space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              <p className="font-semibold text-lg">No duplicates detected!</p>
              <p className="text-sm text-git-muted">This issue looks unique based on repository history.</p>
            </div>
          )}

          {results && results.length > 0 && !isChecking && (
            <div className="space-y-4">
              {results.map((match, idx) => (
                <div key={idx} className="bg-[#161b22] border border-git-border rounded-xl p-5 hover:border-accent-blue/50 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-git-muted text-sm">Stored issue</span>
                      </div>
                      <h4 className="font-semibold text-white group-hover:text-accent-blue transition-colors">
                        #{match.issue_id}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: match.similarity >= 0.8 ? '#f85149' : '#d29922' }}>
                        {Math.round(match.similarity * 100)}%
                      </div>
                      <div className="text-xs text-git-muted">Match Score</div>
                    </div>
                  </div>

                  {/* Similarity Progress Bar */}
                  <div className="w-full h-1.5 bg-git-dark rounded-full overflow-hidden mb-4">
                    <div 
                      className={`h-full ${getScoreColor(match.similarity * 100)}`}
                      style={{ width: `${Math.round(match.similarity * 100)}%` }}
                    ></div>
                  </div>

                  <div className="bg-git-dark p-3 rounded-lg border border-git-border">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-git-text">
                        Backend similarity search found this stored issue above the duplicate threshold.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuplicateDetector;
