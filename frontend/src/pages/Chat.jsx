import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Github, MessageSquare, Terminal } from 'lucide-react';
import { callGemini } from '../services/geminiService';
import { getIssues, getPullRequests, getContributors } from '../services/githubService';
import SectionHeader from '../components/ui/SectionHeader';

const EXAMPLE_QUESTIONS = [
  "What bugs were fixed last week?",
  "Who is the most active contributor?",
  "What PRs are stale?",
  "Show me all open issues assigned to no one",
  "How many PRs were merged this month?"
];

const Chat = ({ connectedRepo }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', content: `Hello! I'm Gitmind-AI. I can help you analyze the \`${connectedRepo}\` repository. Ask me anything!` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [repoContextStr, setRepoContextStr] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (!connectedRepo) return;
    const fetchContext = async () => {
      try {
        const [owner, repo] = connectedRepo.split('/');
        const [issues, prs, contributors] = await Promise.all([
          getIssues(owner, repo),
          getPullRequests(owner, repo),
          getContributors(owner, repo)
        ]);

        const openIssues = issues.filter(i => i.state === 'open').slice(0, 10).map(i => `#${i.number} ${i.title}`).join(', ');
        const recentPRs = prs.slice(0, 10).map(p => `#${p.number} ${p.title} (Status: ${p.state})`).join(', ');
        const topContributors = contributors ? contributors.slice(0, 5).map(c => c.login).join(', ') : 'None';

        const contextStr = `
          Repository: ${connectedRepo}
          Active Contributors (${contributors ? contributors.length : 0} total): ${topContributors}
          Recent Open Issues: ${openIssues || 'None'}
          Recent PRs: ${recentPRs || 'None'}
          Total open issues count: ${issues.filter(i => i.state === 'open').length}
          Total PRs count: ${prs.length}
        `;
        setRepoContextStr(contextStr);
      } catch (e) {
        console.error("Failed to load repo context for chat", e);
      }
    };
    fetchContext();
  }, [connectedRepo]);

  const handleSend = async (text) => {
    if (!connectedRepo) return;
    const userText = text || input;
    if (!userText.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setIsLoading(true);

    const systemContext = `You are a GitHub repository analyst for ${connectedRepo}. Here is the real-time data context for the repository:
${repoContextStr}
Use this live data to answer the user's questions accurately. If they ask about contributors, PRs, or issues, use the provided context. Convert complex queries into explanations and simulate what SQL query would be used if requested. If providing SQL, wrap it in \`\`\`sql\n ... \n\`\`\` block.`;

    try {
      const aiResponseText = await callGemini(userText, systemContext);
      setMessages(prev => [...prev, { role: 'ai', content: aiResponseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse SQL code blocks and regular text
  const renderMessageContent = (content) => {
    const parts = content.split(/(```sql[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```sql') && part.endsWith('```')) {
        const sqlCode = part.replace(/```sql\n?/, '').replace(/```$/, '').trim();
        return (
          <div key={index} className="mt-4 mb-2 overflow-hidden rounded-lg border border-git-border bg-git-dark">
            <div className="flex items-center px-4 py-2 bg-[#161b22] border-b border-git-border text-xs font-mono text-git-muted">
              <Terminal size={14} className="mr-2" />
              SQL Generated
            </div>
            <pre className="p-4 text-sm font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap">
              {sqlCode}
            </pre>
          </div>
        );
      }
      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed text-sm">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">

      {/* Left Panel - Repo Context & Examples */}
      <div className="hidden lg:flex w-1/3 flex-col gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold text-git-muted uppercase tracking-wider mb-4">Connected Repository</h3>
          <div className="flex items-center space-x-3 p-3 bg-git-dark border border-git-border rounded-lg">
            <Github size={24} className={connectedRepo ? "text-accent-blue" : "text-git-muted"} />
            <span className={connectedRepo ? "font-medium" : "text-git-muted italic"}>
              {connectedRepo || 'No repository connected'}
            </span>
          </div>
        </div>

        <div className="glass-panel p-6 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-git-muted uppercase tracking-wider mb-4 flex items-center">
            <MessageSquare size={16} className="mr-2" />
            Example Queries
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {EXAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="w-full text-left p-3 rounded-lg border border-git-border hover:border-accent-blue hover:bg-accent-blue/10 text-sm transition-all duration-200 group"
              >
                <span className="text-git-muted group-hover:text-white transition-colors">"{q}"</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="flex-1 glass-panel flex flex-col overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-git-border bg-[#161b22]/80 backdrop-blur-md z-10 flex items-center">
          <Bot className="text-accent-blue mr-3" size={24} />
          <div>
            <h2 className="font-semibold text-white">Gitmind-AI Assistant</h2>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className="flex-shrink-0 mx-3">
                  {msg.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-blue to-accent-purple flex items-center justify-center text-white">
                      <User size={16} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-git-dark border border-git-border flex items-center justify-center text-accent-blue shadow-[0_0_10px_rgba(88,166,255,0.3)]">
                      <Bot size={16} />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl ${msg.role === 'user'
                  ? 'bg-accent-blue text-white rounded-tr-sm shadow-md'
                  : 'bg-[#1c2128] border border-git-border text-git-text rounded-tl-sm shadow-md'
                  }`}>
                  {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%]">
                <div className="flex-shrink-0 mx-3">
                  <div className="w-8 h-8 rounded-full bg-git-dark border border-git-border flex items-center justify-center text-accent-blue shadow-[0_0_10px_rgba(88,166,255,0.3)]">
                    <Bot size={16} />
                  </div>
                </div>
                <div className="p-4 rounded-2xl rounded-tl-sm bg-[#1c2128] border border-git-border flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="text-sm text-git-muted ml-2">Gitmind-AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#161b22] border-t border-git-border">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center space-x-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={connectedRepo ? `Ask something about ${connectedRepo}...` : "Connect a repository first to ask questions"}
              className="flex-1 bg-git-dark border border-git-border rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all shadow-inner"
              disabled={isLoading || !connectedRepo}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !connectedRepo}
              className="p-3.5 bg-accent-blue hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(88,166,255,0.3)]"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
