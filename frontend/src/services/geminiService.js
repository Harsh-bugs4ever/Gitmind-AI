import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API client. In a real app, ensure this key is not exposed to the client in production,
// but for a hackathon/frontend-only requirement, we use the env variable.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.REACT_APP_GEMINI_API_KEY || 'dummy_key';
const genAI = new GoogleGenerativeAI(apiKey);

export const callGemini = async (prompt, systemContext = '') => {
  try {
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
