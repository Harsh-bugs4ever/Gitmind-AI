import axios from 'axios';

const BASE_URL = 'https://api.github.com';
const token = import.meta.env.VITE_GITHUB_TOKEN;
const headers = token ? { Authorization: `Bearer ${token}` } : {};

export const getRepoInfo = async (owner, repo) => {
  try {
    const res = await axios.get(`${BASE_URL}/repos/${owner}/${repo}`, { headers });
    return res.data;
  } catch (error) {
    console.error('GitHub API error for repo info', error);
    throw error;
  }
};

export const getIssues = async (owner, repo) => {
  try {
    const res = await axios.get(`${BASE_URL}/repos/${owner}/${repo}/issues?state=all&per_page=100`, { headers });
    return res.data;
  } catch (error) {
    console.error('GitHub API error for issues', error);
    throw error;
  }
};

export const getPullRequests = async (owner, repo) => {
  try {
    const res = await axios.get(`${BASE_URL}/repos/${owner}/${repo}/pulls?state=all&per_page=100`, { headers });
    return res.data;
  } catch (error) {
    console.error('GitHub API error for PRs', error);
    throw error;
  }
};

export const getContributors = async (owner, repo) => {
  try {
    const res = await axios.get(`${BASE_URL}/repos/${owner}/${repo}/contributors?per_page=100`, { headers });
    return res.data;
  } catch (error) {
    console.error('GitHub API error for contributors', error);
    throw error;
  }
};

export const getRepoAnalytics = async (owner, repo) => {
  try {
    const [issues, prs, contributors] = await Promise.all([
      getIssues(owner, repo),
      getPullRequests(owner, repo),
      getContributors(owner, repo)
    ]);

    // Compute Issue Labels
    const labelCounts = {};
    issues.forEach(issue => {
      issue.labels.forEach(label => {
        if (!labelCounts[label.name]) {
          labelCounts[label.name] = { name: label.name, value: 0, color: `#${label.color}` };
        }
        labelCounts[label.name].value += 1;
      });
    });
    const issueLabels = Object.values(labelCounts).sort((a, b) => b.value - a.value).slice(0, 5);

    // Compute PR Activity (rough weekly grouping of the 100 PRs fetched)
    const prActivity = [
      { name: 'Week 1', merged: 0, opened: 0 },
      { name: 'Week 2', merged: 0, opened: 0 },
      { name: 'Week 3', merged: 0, opened: 0 },
      { name: 'Week 4', merged: 0, opened: 0 },
    ];
    
    const now = new Date();
    prs.forEach(pr => {
      const created = new Date(pr.created_at);
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let weekIndex = Math.floor(diffDays / 7);
      if (weekIndex > 3) weekIndex = 3; // Dump older ones in week 4 or ignore
      
      if (weekIndex < 4) {
        prActivity[3 - weekIndex].opened += 1;
        if (pr.merged_at) {
          prActivity[3 - weekIndex].merged += 1;
        }
      }
    });

    const stalePRsCount = prs.filter(pr => {
      const created = new Date(pr.created_at);
      const diffDays = Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24));
      return pr.state === 'open' && diffDays > 30;
    }).length;
    
    const activeContributorsCount = contributors ? contributors.length : 0;

    // Compute Issue Growth (fake historical derived from recent snapshot for demo)
    const openCount = issues.filter(i => i.state === 'open').length;
    const closedCount = issues.filter(i => i.state === 'closed').length;
    const issueGrowth = [
      { name: 'Month 1', open: Math.max(0, openCount - 20), closed: Math.max(0, closedCount - 30) },
      { name: 'Month 2', open: Math.max(0, openCount - 15), closed: Math.max(0, closedCount - 20) },
      { name: 'Month 3', open: Math.max(0, openCount - 10), closed: Math.max(0, closedCount - 10) },
      { name: 'Month 4', open: openCount, closed: closedCount },
    ];

    return {
      issueGrowth,
      prActivity,
      issueLabels: issueLabels.length > 0 ? issueLabels : [{ name: 'No Labels', value: 1, color: '#8b949e' }],
      stalePRsCount,
      activeContributorsCount
    };
  } catch (error) {
    console.error("Failed to compute analytics", error);
    throw error;
  }
};
