import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000';

export default function About() {
  const [taskInput, setTaskInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [serverStatus, setServerStatus] = useState('🔴 Disconnected');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/status`);
      if (response.ok) {
        setServerStatus('🟢 Connected');
      } else {
        setServerStatus('🟡 Warning');
      }
    } catch (error) {
      setServerStatus('🔴 Disconnected');
    }
  };

  const setTask = (task) => {
    setTaskInput(task);
  };

  const runAgent = async () => {
    if (isRunning || !taskInput.trim()) {
      if (!taskInput.trim()) {
        alert('Please enter a task for the agent to perform.');
      }
      return;
    }

    setIsRunning(true);
    setResults(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task: taskInput })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      runAgent();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Main Card Container */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          
          {/* Header */}
          <header className="text-center mb-10 pb-8 border-b-2 border-gray-200">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-800 bg-clip-text text-transparent mb-4">
              🤖 MCP Web Agent
            </h1>
            <p className="text-gray-600 text-xl font-medium">
              Model Context Protocol Agent with Web Interface
            </p>
          </header>

          {/* Agent Task Section */}
          <div className="bg-gray-50/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-gray-200 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              🎯 Agent Task
            </h2>
            
            <div className="space-y-6">
              {/* Task Input */}
              <div className="space-y-4">
                <textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your task here... (e.g., 'Find a great recipe for Banoffee Pie, then summarize it in markdown to banoffee.md')"
                  rows="4"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl text-base resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white shadow-sm"
                />
                
                <button
                  onClick={runAgent}
                  disabled={isRunning}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
                >
                  {isRunning ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Running Agent...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Run Agent
                    </>
                  )}
                </button>
              </div>

              {/* Quick Tasks */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  📋 Quick Tasks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { emoji: '🍰', text: 'Find Recipe', task: 'Find a great recipe for Banoffee Pie, then summarize it in markdown to banoffee.md' },
                    { emoji: '📰', text: 'AI News Summary', task: 'Research the latest news about AI developments and create a summary report' },
                    { emoji: '🐍', text: 'Python Frameworks', task: 'Find information about Python web frameworks and compare them in a markdown file' },
                    { emoji: '🔧', text: 'MCP Best Practices', task: 'Search for the best practices for MCP servers and document them' }
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setTask(item.task)}
                      className="bg-white hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-300 p-4 rounded-xl text-left transition-all duration-200 shadow-sm hover:shadow-md group"
                    >
                      <span className="text-lg mr-2">{item.emoji}</span>
                      <span className="font-medium text-gray-700 group-hover:text-indigo-700">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {results && (
            <div className="bg-green-50/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-green-200 shadow-sm">
              <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center gap-3">
                📊 Results
              </h2>

              {/* Result Info */}
              <div className="bg-green-100 border border-green-300 rounded-xl p-6 mb-6">
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold">Task:</span> <span className="text-gray-700">{results.task}</span></div>
                  <div><span className="font-semibold">Status:</span> <span className="text-green-600">✅ Completed Successfully</span></div>
                  <div><span className="font-semibold">Completed:</span> <span className="text-gray-700">{new Date(results.timestamp).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Agent Output */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  📝 Agent Output
                </h3>
                <pre className="bg-gray-900 text-green-400 p-6 rounded-xl overflow-auto max-h-96 text-sm leading-relaxed font-mono border shadow-inner">
                  {results.output || 'Agent completed successfully.'}
                </pre>
              </div>

              {/* Files Section */}
              {results.files && results.files.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    📁 Generated Files
                  </h3>
                  <div className="space-y-3">
                    {results.files.map((file, index) => (
                      <div key={index} className="bg-white border-2 border-gray-200 hover:border-indigo-300 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md group">
                        <a
                          href={`${API_BASE}${file.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={file.name}
                          className="text-indigo-600 hover:text-indigo-800 no-underline font-semibold text-lg flex items-center gap-2 group-hover:gap-3 transition-all"
                        >
                          📄 {file.name}
                        </a>
                        <div className="text-gray-500 text-sm mt-1">
                          Size: {formatFileSize(file.size)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Section */}
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-red-200 shadow-sm">
              <h2 className="text-2xl font-bold text-red-700 mb-6 flex items-center gap-3">
                ❌ Error
              </h2>
              <div className="bg-red-100 border border-red-300 rounded-xl p-6">
                <p className="text-red-800 font-medium mb-4">Failed to execute task: {error}</p>
                <details className="cursor-pointer">
                  <summary className="text-red-600 hover:text-red-800 font-medium">Technical Details</summary>
                  <pre className="bg-gray-900 text-red-400 p-4 rounded-lg mt-3 text-sm overflow-auto max-h-60 font-mono">
{`Task: ${taskInput}
Error: ${error}
Timestamp: ${new Date().toISOString()}`}
                  </pre>
                </details>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="text-center pt-8 border-t-2 border-gray-200 space-y-3">
            <p className="text-gray-600 font-medium">
              Powered by OpenAI Agents SDK + Model Context Protocol
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border">
              <span className="text-sm font-medium">Server Status:</span>
              <span className="font-semibold">{serverStatus}</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}