const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const beginGithubLogin = () => {
  window.location.href = `${API_BASE_URL}/auth/github/login`;
};

export const fetchCurrentUser = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Auth check failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.user;
};

