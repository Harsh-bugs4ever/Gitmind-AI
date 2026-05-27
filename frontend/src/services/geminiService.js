import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.REACT_APP_GEMINI_API_KEY ||
  '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const backendBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export const callGemini = async (prompt, systemContext = '') => {
  try {
    if (!genAI) {
      return "Error: Gemini API key is missing. Please check your frontend environment configuration.";
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const fullPrompt = systemContext 
      ? `System Context: ${systemContext}\n\nUser Prompt: ${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Check if it's a rate limit or auth error to provide a better message
    if (error.message?.includes('429')) {
      return "Error: Gemini API rate limit exceeded. Please try again later.";
    }
    if (error.message?.includes('API key not valid')) {
      return "Error: Invalid Gemini API key. Please check your .env file.";
    }
    
    return "Error: Failed to generate response from Gemini AI. Please try again.";
  }
};

export const askRepoQuestion = async (question, connectedRepo) => {
  const [owner, repo] = (connectedRepo || '').split('/');

  if (!owner || !repo) {
    throw new Error('Connected repository must be in "owner/repo" format.');
  }

  try {
    const { data } = await axios.post(`${backendBaseUrl}/api/chat`, {
      question,
      owner,
      repo,
    });

    return data;
  } catch (error) {
    console.error('Error calling backend chat API:', error);

    const detail =
      error.response?.data?.detail ||
      error.message ||
      'Failed to generate a response from the backend.';

    throw new Error(detail);
  }
};
