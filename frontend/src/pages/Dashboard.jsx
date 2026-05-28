import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
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
          Enter a GitHub repository URL or name (e.g. link) in the sidebar to view its health metrics and analytics.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} className="h-32" />)}
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
        {error.includes("API rate limit") || error.includes("rate limit exceeded") ? (
          <div className="bg-git-dark p-4 rounded-lg text-left text-sm mt-4 border border-git-border">
            <p className="font-semibold text-accent-blue mb-2">How to fix the Rate Limit Error:</p>
            <ol className="list-decimal pl-5 space-y-1 text-git-muted">
              <li>Create a <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer" className="text-accent-purple hover:underline">GitHub Personal Access Token (classic)</a> with <code>public_repo</code> scope.</li>
              <li>Open the <code>.env</code> file in this project.</li>
              <li>Add a new line: <code>VITE_GITHUB_TOKEN=your_token_here</code></li>
              <li>Save the file and refresh the page!</li>
            </ol>
          </div>
        ) : null}
      </div>
    );
  }

  if (!analytics) return null;

  const openIssuesCount = backendMetrics?.open_issues ?? 0;
  const mergedPRsCount = backendMetrics?.merged_prs ?? 0;
  const contributorsCount = backendMetrics?.contributors ?? 0;
  const stalePRsCount = backendMetrics?.stale_prs ?? 0;
  
  return (
    <div className="space-y-8 pb-10">
      
      {/* Top Metrics Row */}
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
            <h3 className="font-medium text-sm">Merged PRs</h3>
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
            <h3 className="font-medium text-sm">Active Contributors</h3>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Issue Growth (Line Chart) */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <CircleDot size={18} className="mr-2 text-accent-blue" />
            Issue Growth Over Time
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.issueGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" tick={{fill: '#8b949e', fontSize: 12}} />
                <YAxis stroke="#8b949e" tick={{fill: '#8b949e', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }}
                  itemStyle={{ color: '#c9d1d9' }}
                />
                <Line type="monotone" dataKey="open" stroke="#d73a4a" strokeWidth={3} dot={{r: 4, fill: '#d73a4a'}} />
                <Line type="monotone" dataKey="closed" stroke="#2ea043" strokeWidth={3} dot={{r: 4, fill: '#2ea043'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PR Activity (Bar Chart) */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <GitPullRequest size={18} className="mr-2 text-purple-400" />
            PR Activity by Week
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.prActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" tick={{fill: '#8b949e', fontSize: 12}} />
                <YAxis stroke="#8b949e" tick={{fill: '#8b949e', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="opened" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="merged" fill="#a371f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Labels (Pie Chart) */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-6">Issue Labels Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.issueLabels}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.issueLabels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {analytics.issueLabels.map((label, idx) => (
              <div key={label.name} className="flex items-center text-sm">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: label.color }}></span>
                {label.name}
              </div>
            ))}
          </div>
        </div>

        {/* Repo Info Card */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Repository Details</h3>
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-3 bg-git-dark rounded-xl border border-git-border">
                <Search size={24} className="text-accent-blue" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{repoData?.full_name}</h4>
                <p className="text-sm text-git-muted">{repoData?.language || 'Unknown'}</p>
              </div>
            </div>
            <p className="text-git-muted text-sm leading-relaxed mb-6">
              {repoData?.description}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-git-dark p-4 rounded-lg border border-git-border">
              <div className="text-git-muted text-xs uppercase font-semibold">Stars</div>
              <div className="text-xl font-bold text-white mt-1">{repoData?.stargazers_count?.toLocaleString()}</div>
            </div>
            <div className="bg-git-dark p-4 rounded-lg border border-git-border">
              <div className="text-git-muted text-xs uppercase font-semibold">Forks</div>
              <div className="text-xl font-bold text-white mt-1">{repoData?.forks_count?.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-5 border-b border-git-border">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-git-dark/50 text-git-muted text-sm border-b border-git-border">
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Author</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-git-border">
              {issues.map((issue) => (
                <tr key={issue.number} className="hover:bg-git-dark/30 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    {issue.pull_request ? (
                      <span className="flex items-center text-purple-400"><GitPullRequest size={16} className="mr-2" /> PR</span>
                    ) : (
                      <span className="flex items-center text-green-400"><CircleDot size={16} className="mr-2" /> Issue</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white max-w-[300px] truncate" title={issue.title}>
                    {issue.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-git-muted flex items-center space-x-2">
                    <img 
                      src={issue.user?.avatar_url || `https://ui-avatars.com/api/?name=${issue.user?.login}&background=random`} 
                      alt={issue.user?.login} 
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{issue.user?.login}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={issue.state} />
                  </td>
                  <td className="px-6 py-4 text-sm text-git-muted">
                    {new Date(issue.created_at).toLocaleDateString()}
                  </td>
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
