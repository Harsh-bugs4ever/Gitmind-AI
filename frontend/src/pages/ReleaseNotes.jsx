import React, { useState } from 'react';
import { FileText, Download, Copy, Calendar, Github, Sparkles } from 'lucide-react';
import { generateReleaseNotes } from '../services/geminiService';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const formatReleaseNotes = (tag, repo, notes) => {
  if (
    notes.raw &&
    !notes.features?.length &&
    !notes.bug_fixes?.length &&
    !notes.performance?.length &&
    !notes.breaking_changes?.length
  ) {
    return `# ${repo} ${tag}\n\n${notes.raw}`;
  }

  const sections = [
    ['New Features', notes.features || []],
    ['Bug Fixes', notes.bug_fixes || []],
    ['Performance Improvements', notes.performance || []],
    ['Breaking Changes', notes.breaking_changes || []],
  ];

  const body = sections
    .filter(([, items]) => items.length > 0)
    .map(([heading, items]) => `### ${heading}\n${items.map(item => `- ${item}`).join('\n')}`)
    .join('\n\n');

  return `# ${repo} ${tag}\n\n${body || 'No merged PRs found for release notes.'}`;
};

const ReleaseNotes = ({ connectedRepo }) => {
  const [version, setVersion] = useState('v18.3.0');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!connectedRepo || !version.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateReleaseNotes(connectedRepo);
      setGeneratedNotes(formatReleaseNotes(version, connectedRepo, response));
    } catch (error) {
      console.error('Failed to generate release notes:', error);
      setError(error.message || 'Error generating release notes. Please try again.');
      setGeneratedNotes(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedNotes) {
      navigator.clipboard.writeText(generatedNotes);
      alert('Copied to clipboard!');
    }
  };

  const downloadFile = () => {
    if (generatedNotes) {
      const element = document.createElement('a');
      const file = new Blob([generatedNotes], { type: 'text/markdown' });
      element.href = URL.createObjectURL(file);
      element.download = `release-notes-${version}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold mb-6 mt-4 text-white">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold mb-4 mt-6 text-white border-b border-git-border pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold mb-3 mt-5 text-accent-blue flex items-center">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={index} className="ml-6 mb-2 text-git-text list-disc list-inside">
            {line.substring(2)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="mb-2 text-git-text">{line}</p>;
    });
  };

  if (!connectedRepo) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-git-card rounded-full flex items-center justify-center mb-6">
          <FileText size={32} className="text-git-muted" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect a Repository</h2>
        <p className="text-git-muted max-w-md">
          Enter a GitHub repository in the sidebar to generate release notes through the backend.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-5/12 glass-panel p-6 flex flex-col h-full">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <h2 className="text-xl font-bold">Release Details</h2>
        </div>

        <div className="space-y-5 flex-1 flex flex-col">
          <div>
            <label className="block text-sm font-semibold text-git-muted mb-2 flex items-center">
              <Github size={14} className="mr-2" /> Repository
            </label>
            <input type="text" value={connectedRepo} readOnly className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-git-muted mb-2 flex items-center">
              <FileText size={14} className="mr-2" /> Version Tag
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. v2.1.0"
              className="input-field"
            />
          </div>

          <div className="flex-1 rounded-lg border border-git-border bg-git-dark p-4 text-sm text-git-muted leading-relaxed">
            Release notes are generated by the backend from merged PRs fetched through Coral.
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !connectedRepo}
          className="btn-primary w-full mt-6 py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner size={18} className="text-white" />
              <span>Generating Notes...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Generate Release Notes</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full md:w-7/12 flex flex-col gap-4 h-full">
        <div className="glass-panel flex-1 p-0 overflow-hidden flex flex-col relative">
          <div className="p-4 border-b border-git-border bg-[#161b22]/80 backdrop-blur-md z-10 flex justify-between items-center">
            <div className="flex items-center space-x-2 text-git-muted text-sm">
              <Calendar size={16} />
              <span>{new Date().toLocaleDateString()}</span>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={copyToClipboard}
                disabled={!generatedNotes}
                className="btn-secondary text-sm flex items-center py-1.5 disabled:opacity-50"
                title="Copy Markdown"
              >
                <Copy size={16} className="mr-2" /> Copy
              </button>
              <button
                onClick={downloadFile}
                disabled={!generatedNotes}
                className="btn-secondary text-sm flex items-center py-1.5 disabled:opacity-50"
                title="Download .md"
              >
                <Download size={16} className="mr-2" /> Download
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {!generatedNotes && !isGenerating && !error && (
              <div className="h-full flex flex-col items-center justify-center text-git-muted opacity-50 space-y-4">
                <FileText size={48} className="text-git-border" />
                <p>Generated release notes will appear here.</p>
              </div>
            )}

            {error && !isGenerating && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm">
                {error}
              </div>
            )}

            {isGenerating && (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="w-full max-w-md space-y-4 animate-pulse">
                  <div className="h-8 bg-git-border rounded w-1/3 mb-8"></div>
                  <div className="h-6 bg-git-border/70 rounded w-1/4"></div>
                  <div className="h-4 bg-git-border/40 rounded w-full"></div>
                  <div className="h-4 bg-git-border/40 rounded w-5/6"></div>
                  <div className="h-4 bg-git-border/40 rounded w-4/5 mb-6"></div>
                  <div className="h-6 bg-git-border/70 rounded w-1/4"></div>
                  <div className="h-4 bg-git-border/40 rounded w-11/12"></div>
                  <div className="h-4 bg-git-border/40 rounded w-full"></div>
                </div>
              </div>
            )}

            {generatedNotes && !isGenerating && (
              <div className="markdown-preview max-w-3xl mx-auto">
                <div className="bg-git-dark border border-git-border rounded-xl p-8 shadow-inner">
                  {renderMarkdown(generatedNotes)}

                  <div className="mt-12 pt-6 border-t border-git-border text-center">
                    <p className="text-xs text-git-muted italic flex items-center justify-center">
                      Generated by Gitmind-AI <Sparkles size={12} className="ml-1 text-accent-blue" />
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleaseNotes;
