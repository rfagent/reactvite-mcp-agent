import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000';

export default function About() {
  const [taskInput, setTaskInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [serverStatus, setServerStatus] = useState('🔴 Disconnected');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Check server status on component mount
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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-purple-700">
      <div className="max-w-6xl mx-auto p-5">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 mt-5 mb-5">
          
          {/* Header */}
          <header className="text-center mb-8 pb-5 border-b-2 border-gray-200">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-3">
              🤖 MCP Web Agent
            </h1>
            <p className="text-gray-600 text-lg">
              Model Context Protocol Agent with Web Interface
            </p>
          </header>

          <main>
            {/* Agent Section */}
            <div className="bg-gray-50 p-8 rounded-2xl mb-5 border-2 border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-5">
                🎯 Agent Task
              </h2>
              
              <div className="mb-8">
                <textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your task here... (e.g., 'Find a great recipe for Banoffee Pie, then summarize it in markdown to banoffee.md')"
                  rows="3"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl text-base resize-none min-h-20 mb-4 font-inherit focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                
                <button
                  onClick={runAgent}
                  disabled={isRunning}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 flex items-center gap-3 hover:transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isRunning ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      🚀 Run Agent
                    </>
                  )}
                </button>
              </div>

              {/* Quick Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📋 Quick Tasks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setTask('Find a great recipe for Banoffee Pie, then summarize it in markdown to banoffee.md')}
                    className="bg-white border-2 border-gray-200 p-3 rounded-lg cursor-pointer transition-all duration-300 text-left text-sm hover:border-blue-500 hover:bg-blue-50"
                  >
                    🍰 Find Recipe
                  </button>
                  <button
                    onClick={() => setTask('Research the latest news about AI developments and create a summary report')}
                    className="bg-white border-2 border-gray-200 p-3 rounded-lg cursor-pointer transition-all duration-300 text-left text-sm hover:border-blue-500 hover:bg-blue-50"
                  >
                    📰 AI News Summary
                  </button>
                  <button
                    onClick={() => setTask('Find information about Python web frameworks and compare them in a markdown file')}
                    className="bg-white border-2 border-gray-200 p-3 rounded-lg cursor-pointer transition-all duration-300 text-left text-sm hover:border-blue-500 hover:bg-blue-50"
                  >
                    🐍 Python Frameworks
                  </button>
                  <button
                    onClick={() => setTask('Search for the best practices for MCP servers and document them')}
                    className="bg-white border-2 border-gray-200 p-3 rounded-lg cursor-pointer transition-all duration-300 text-left text-sm hover:border-blue-500 hover:bg-blue-50"
                  >
                    🔧 MCP Best Practices
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {results && (
              <div className="bg-gray-50 p-8 rounded-2xl mb-5 border-2 border-gray-200">
                <h2 className="text-2xl font-semibold text-green-600 mb-5">
                  📊 Results
                </h2>

                <div className="bg-green-50 p-4 rounded-lg mb-5 border border-green-200">
                  <div className="mb-2">
                    <strong>Task:</strong> <span>{results.task}</span>
                  </div>
                  <div className="mb-2">
                    <strong>Status:</strong> <span>✅ Completed Successfully</span>
                  </div>
                  <div>
                    <strong>Completed:</strong> <span>{new Date(results.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    📝 Agent Output
                  </h3>
                  <pre className="bg-gray-800 text-white p-5 rounded-lg whitespace-pre-wrap max-h-96 overflow-y-auto font-mono leading-relaxed">
                    {results.output || 'Agent completed successfully.'}
                  </pre>
                </div>

                {/* Files Section */}
                {results.files && results.files.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      📁 Generated Files
                    </h3>
                    <div className="space-y-3">
                      {results.files.map((file, index) => (
                        <div
                          key={index}
                          className="bg-white border-2 border-gray-200 rounded-lg p-4 transition-all duration-300 hover:border-blue-500 hover:shadow-md"
                        >
                          <a
                            href={`${API_BASE}${file.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.name}
                            className="text-blue-500 no-underline font-semibold text-lg"
                          >
                            📄 {file.name}
                          </a>
                          <div className="text-gray-600 text-sm mt-1">
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
              <div className="bg-gray-50 p-8 rounded-2xl mb-5 border-2 border-gray-200">
                <h2 className="text-2xl font-semibold text-red-600 mb-5">
                  ❌ Error
                </h2>
                <div className="bg-red-50 p-5 rounded-lg border border-red-200">
                  <p className="mb-3">Failed to execute task: {error}</p>
                  <details className="cursor-pointer">
                    <summary className="text-gray-600 mt-3">Technical Details</summary>
                    <pre className="bg-gray-800 text-white p-4 rounded-md mt-3 whitespace-pre-wrap max-h-72 overflow-y-auto">
                      Task: {taskInput}
                      Error: {error}
                      Timestamp: {new Date().toISOString()}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="text-center mt-8 pt-5 border-t-2 border-gray-200 text-gray-600">
            <p>Powered by OpenAI Agents SDK + Model Context Protocol</p>
            <div className="mt-3">
              <span>{serverStatus}</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}