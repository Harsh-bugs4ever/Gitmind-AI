import axios from 'axios';

const backendBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const apiClient = axios.create();
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gitmind_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const parseConnectedRepo = (connectedRepo) => {
  const [owner, repo] = (connectedRepo || '').split('/');

  if (!owner || !repo) {
    throw new Error('Connected repository must be in "owner/repo" format.');
  }

  return { owner, repo };
};

const extractBackendError = (error, fallback) => {
  return (
    error.response?.data?.detail ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
};

export const askRepoQuestion = async (question, connectedRepo) => {
  const { owner, repo } = parseConnectedRepo(connectedRepo);

  try {
    const { data } = await apiClient.post(`${backendBaseUrl}/api/chat`, {
      question,
      owner,
      repo,
    });

    return data;
  } catch (error) {
    console.error('Error calling backend chat API:', error);
    throw new Error(extractBackendError(error, 'Failed to generate a response from the backend.'));
  }
};

export const checkDuplicateIssue = async ({ title, description = '', connectedRepo }) => {
  const { owner, repo } = parseConnectedRepo(connectedRepo);
  const text = [title, description].filter(Boolean).join('\n\n');

  try {
    const { data } = await apiClient.post(`${backendBaseUrl}/api/issues/check-duplicate`, {
      text,
      owner,
      repo,
    });

    return data;
  } catch (error) {
    console.error('Error calling backend duplicate check API:', error);
    throw new Error(extractBackendError(error, 'Failed to check for duplicate issues.'));
  }
};

export const generateReleaseNotes = async (connectedRepo) => {
  const { owner, repo } = parseConnectedRepo(connectedRepo);

  try {
    const { data } = await apiClient.get(`${backendBaseUrl}/api/releases/generate`, {
      params: { owner, repo },
    });

    return data;
  } catch (error) {
    console.error('Error calling backend release notes API:', error);
    throw new Error(extractBackendError(error, 'Failed to generate release notes.'));
  }
};

export const getRepoStats = async (connectedRepo) => {
  const { owner, repo } = parseConnectedRepo(connectedRepo);

  try {
    const { data } = await apiClient.get(`${backendBaseUrl}/api/repo/stats`, {
      params: { owner, repo },
    });

    return data;
  } catch (error) {
    console.error('Error calling backend repository stats API:', error);
    throw new Error(extractBackendError(error, 'Failed to fetch repository stats.'));
  }
};

export const getRepoTrends = async (connectedRepo) => {
  const { owner, repo } = parseConnectedRepo(connectedRepo);

  try {
    const { data } = await apiClient.get(`${backendBaseUrl}/api/repo/trends`, {
      params: { owner, repo },
    });

    return data;
  } catch (error) {
    console.error('Error calling backend repository trends API:', error);
    throw new Error(extractBackendError(error, 'Failed to fetch repository trends.'));
  }
};

export const getRepoCommits = async (connectedRepo, options = {}) => {
  const { owner, repo } = parseConnectedRepo(connectedRepo);
  const { page = 1, pageSize = 10, ref = 'HEAD' } = options;

  try {
    const { data } = await apiClient.get(`${backendBaseUrl}/api/repo/commits`, {
      params: { owner, repo, page, page_size: pageSize, ref },
    });

    return data;
  } catch (error) {
    console.error('Error calling backend repository commits API:', error);
    throw new Error(extractBackendError(error, 'Failed to fetch repository commits.'));
  }
};
