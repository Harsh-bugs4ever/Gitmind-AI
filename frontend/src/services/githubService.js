const GITHUB_API_URL = 'https://api.github.com';

async function fetchFromGitHub(endpoint) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };
  // If you need auth, you could get the token from localStorage or pass it in
  // const token = localStorage.getItem('github_token');
  // if (token) headers['Authorization'] = `token ${token}`;
  
  const response = await fetch(`${GITHUB_API_URL}${endpoint}`, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getRepoInfo(owner, repo) {
  return fetchFromGitHub(`/repos/${owner}/${repo}`);
}

export async function getIssues(owner, repo) {
  return fetchFromGitHub(`/repos/${owner}/${repo}/issues?state=all&per_page=10`);
}

export async function getPullRequests(owner, repo) {
  return fetchFromGitHub(`/repos/${owner}/${repo}/pulls?state=all&per_page=10`);
}

export async function getContributors(owner, repo) {
  return fetchFromGitHub(`/repos/${owner}/${repo}/contributors`);
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function getRepoAnalytics(owner, repo, token) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Fetch commits and trends from the backend in parallel
  const [commitsRes, trendsRes] = await Promise.all([
    fetch(`${API_BASE}/api/repo/commits?owner=${owner}&repo=${repo}&page=1&page_size=30&ref=HEAD`, { headers }),
    fetch(`${API_BASE}/api/repo/trends?owner=${owner}&repo=${repo}`, { headers }),
  ]);

  // --- commits ---
  let commits = [];
  if (commitsRes.ok) {
    const commitsJson = await commitsRes.json();
    commits = (commitsJson.commits || []).map((c) => ({
      sha: c.sha,
      message: c.message,
      author: c.author,
      date: c.date,
    }));
  }

  // --- commitActivity bar-chart: group by day-of-week ---
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  commits.forEach((c) => {
    const day = DAY_NAMES[new Date(c.date).getUTCDay()];
    if (day) dayCounts[day]++;
  });
  // Present Mon→Sun so the chart reads naturally
  const commitActivity = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => ({
    name,
    commits: dayCounts[name],
  }));

  // --- trends ---
  let trends = [];
  if (trendsRes.ok) {
    const trendsJson = await trendsRes.json();
    trends = (trendsJson.trends || []).map((t) => ({
      week: t.week,
      issues: t.issue_count,
    }));
  }

  return { trends, commitActivity, commits, stats: {} };
}
