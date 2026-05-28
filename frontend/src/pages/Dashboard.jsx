import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { AlertCircle, GitMerge, Users, Clock, Search, GitPullRequest, CircleDot } from 'lucide-react';
import { getRepoInfo, getIssues, getPullRequests, getContributors, getRepoAnalytics } from '../services/githubService';
import { useAuth } from '../context/AuthContext';
import SectionHeader from '../components/ui/SectionHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonCard from '../components/ui/SkeletonCard';

const Dashboard = ({ connectedRepo }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repoData, setRepoData] = useState(null);
  const [issues, setIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [backendMetrics, setBackendMetrics] = useState(null);
  
  const COLORS = ['#d73a4a', '#a2eeef', '#0075ca', '#d876e3', '#e3b341'];

  const fetchData = useCallback(async () => {
    if (!connectedRepo) return;
    setLoading(true);
    setError(null);

    try {
      const [owner, repo] = connectedRepo.split('/');
      
      const [repoInfo, repoIssues, repoAnalytics, dashboardRes] = await Promise.all([
        getRepoInfo(owner, repo),
        getIssues(owner, repo),
        getRepoAnalytics(owner, repo),
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/dashboard?owner=${owner}&repo=${repo}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!dashboardRes.ok) {
        throw new Error(`Backend dashboard request failed (${dashboardRes.status})`);
      }
      const dashboardJson = await dashboardRes.json();

      setRepoData(repoInfo);
      setIssues(repoIssues.slice(0, 5)); // Top 5 recent activity
      setAnalytics(repoAnalytics);
      setBackendMetrics(dashboardJson);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      setError(`Failed to fetch repository data. Error: "${errorMessage}".`);
    } finally {
      setLoading(false);
    }
  }, [connectedRepo, token]);

  useEffect(() => {
    if (connectedRepo) {
      fetchData();
    }
  }, [fetchData, connectedRepo]);

  if (!connectedRepo) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-git-card rounded-full flex items-center justify-center mb-6">
          <Search size={32} className="text-git-muted" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect a Repository</h2>
        <p className="text-git-muted max-w-md">
          Enter a GitHub repository in the sidebar to view backend-powered health metrics.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={2} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard lines={6} className="h-80" />
          <SkeletonCard lines={6} className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 glass-panel border-red-500/50 bg-red-500/10 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h3>
        <p className="text-git-text mb-4">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const openIssuesCount = backendMetrics?.open_issues ?? 0;
  const mergedPRsCount = backendMetrics?.merged_prs ?? 0;
  const contributorsCount = backendMetrics?.contributors ?? 0;
  const stalePRsCount = backendMetrics?.stale_prs ?? 0;
  
  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 flex flex-col group hover:-translate-y-1 transition-transform">
          <div className="flex items-center space-x-3 mb-2 text-git-muted">
            <AlertCircle size={20} className="text-red-400" />
            <h3 className="font-medium text-sm">Open Issues</h3>
          </div>
          <div className="text-3xl font-bold mt-2">{openIssuesCount}</div>
          <div className="text-sm text-git-muted mt-2 flex items-center">
            Live from backend API
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col group hover:-translate-y-1 transition-transform">
          <div className="flex items-center space-x-3 mb-2 text-git-muted">
            <GitMerge size={20} className="text-purple-400" />
            <h3 className="font-medium text-sm">PR Merge Rate</h3>
          </div>
          <div className="text-3xl font-bold mt-2">
            {mergedPRsCount}
          </div>
          <div className="text-sm text-git-muted mt-2 flex items-center">
            Live from backend API
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col group hover:-translate-y-1 transition-transform">
          <div className="flex items-center space-x-3 mb-2 text-git-muted">
            <Users size={20} className="text-accent-blue" />
            <h3 className="font-medium text-sm">Contributors</h3>
          </div>
          <div className="text-3xl font-bold mt-2">{contributorsCount}</div>
          <div className="text-sm text-git-muted mt-2">Live from backend API</div>
        </div>

        <div className="glass-panel p-6 flex flex-col group hover:-translate-y-1 transition-transform">
          <div className="flex items-center space-x-3 mb-2 text-git-muted">
            <Clock size={20} className="text-yellow-400" />
            <h3 className="font-medium text-sm">Stale PRs</h3>
          </div>
          <div className="text-3xl font-bold mt-2">{stalePRsCount}</div>
          <div className="text-sm text-yellow-400 mt-2">Open &gt; 30 days</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <CircleDot size={18} className="mr-2 text-accent-blue" />
            Weekly Issue Trends
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="week" stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} />
                <YAxis stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="issues" stroke="#58a6ff" strokeWidth={3} dot={{ r: 4, fill: '#58a6ff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <GitCommit size={18} className="mr-2 text-green-400" />
            Recent Commit Activity
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commitActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} />
                <YAxis stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }} />
                <Bar dataKey="commits" fill="#2ea043" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-5 border-b border-git-border">
          <h3 className="text-lg font-semibold">Recent Commits</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-git-dark/50 text-git-muted text-sm border-b border-git-border">
                <th className="px-6 py-4 font-semibold">SHA</th>
                <th className="px-6 py-4 font-semibold">Message</th>
                <th className="px-6 py-4 font-semibold">Author</th>
                <th className="px-6 py-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-git-border">
              {commits.map((commit) => (
                <tr key={commit.sha} className="hover:bg-git-dark/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-accent-blue">{commit.sha}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white max-w-[420px] truncate" title={commit.message}>
                    {commit.message}
                  </td>
                  <td className="px-6 py-4 text-sm text-git-muted">{commit.author}</td>
                  <td className="px-6 py-4 text-sm text-git-muted">{commit.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
