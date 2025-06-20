## 🔧 Troubleshooting Guide

### **Issue: "🟡 Warning" or "🔴 Disconnected" Status**

**Cause**: Express API server not running on port 3000

**Solution**:
```bash
# Check if server is running
curl http://localhost:3000/api/status

# If connection refused, start server:
npm start

# Check for port conflicts:
lsof -i :3000
```

### **Issue: Agent Task Fails with Python Error**

**Cause**: Missing Python dependencies or file permissions

**Solutions**:
```bash
# Install Python dependencies
pip install openai-agents-sdk python-dotenv

# Fix sandbox permissions
mkdir -p sandbox
chmod 755 sandbox

# Test Python agent directly
echo "test task" | python mcp_agent.py
```

### **Issue: "Mock Mode" When You Want Full MCP**

**Cause**: Missing OpenAI API key or SDK

**Solutions**:
```bash
# Check .env file exists and has key
cat .env
# Should show: OPENAI_API_KEY=sk-...

# Install full SDK
pip install openai-agents-sdk

# Verify Node.js for MCP servers
node --version  # Need v16+
npx --version   # Should work
```

### **Issue: No Files Generated**

**Cause**: Permission issues or agent not completing properly

**Solutions**:
```bash
# Create sandbox with proper permissions
mkdir -p sandbox
chmod 777 sandbox  # Temporary fix

# Check agent logs in server console
# Look for "📄 Created file:" messages

# Test file creation manually
echo "test" > sandbox/test.txt
ls -la sandbox/
```

### **Issue: Long Execution Times**

**Normal Behavior**:
- **Mock Mode**: 3-5 seconds
- **Full MCP Mode**: 30-180 seconds (real web browsing takes time)

**If Hanging**:
```bash
# Check server logs for errors
# Agent has 60-second timeout
# Restart server if needed: Ctrl+C, then npm start
```

### **Issue: Browser Console Errors**

**Common Fixes**:
```bash
# Clear browser cache
# Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

# Check JavaScript console (F12)
# Look for network errors or CORS issues
```# MCP Web Agent Project

Complete web frontend and Express server for your MCP agent setup.

## 📁 Project Structure

```
mcp-web-agent/
├── package.json                 # Dependencies and scripts
├── server.js                   # Express API server
├── mcp_agent.py                # Python MCP agent (replaces old mcp_server.js)
├── public/                     # Frontend files
│   ├── index.html              # Main interface
│   ├── style.css               # Styling
│   └── script.js               # Frontend logic
├── sandbox/                    # Agent output directory (auto-created)
└── .env                        # Environment variables
```

## 🏗️ Architecture Overview

```
Web Browser (Frontend: localhost:3000)
    ↓ HTTP POST /api/agent/run
Express Server (server.js)
    ↓ spawns: python mcp_agent.py
Python MCP Agent (mcp_agent.py)
    ↓ connects to external MCP servers
MCP Servers (filesystem, browser via npx)
    ↓ performs actual work
Results flow back: MCP → Agent → Express → Browser
```

## 🚀 Quick Start Guide

### **Option 1: Full MCP Agent (Recommended)**
```bash
# 1. Install Python dependencies
pip install openai-agents-sdk python-dotenv

# 2. Install Node.js dependencies  
npm install

# 3. Set up environment
echo "OPENAI_API_KEY=your_actual_openai_key_here" > .env

# 4. Ensure Node.js tools are available
node --version  # Should be v16+
npx --version   # Should work

# 5. Start the server
npm start

# 6. Open browser to http://localhost:3000
```

### **Option 2: Quick Test (Mock Mode)**
```bash
# 1. Install basic dependencies
npm install

# 2. Start server (will run in mock mode)
npm start

# 3. Test interface at http://localhost:3000
# Mock agent will create sample files for testing
```

### **Development Setup**
```bash
# For development with file watching
npm install -g nodemon
nodemon server.js

# Or use your IDE's built-in tools
# PyCharm: Right-click server.js → Run
# VS Code: Use integrated terminal
```

## 🧪 Testing Guide

### **1. Basic Connectivity Test**
```bash
# Test API server
curl http://localhost:3000/api/status

# Expected response:
# {"status":"healthy","timestamp":"...","server":"MCP Web Agent Server","python_agent":"mcp_agent.py"}
```

### **2. Python Agent Test**
```bash
# Test Python agent directly
echo "Find information about Python programming" | python mcp_agent.py

# Should show:
# - Mode detection (Full MCP or Mock)
# - Task processing steps
# - File creation confirmation
```

### **3. Web Interface Tests**

#### **Test 1: Quick Task (Recommended First Test)**
1. **Open**: `http://localhost:3000`
2. **Click**: "🍰 Find Recipe" button
3. **Click**: "🚀 Run Agent"
4. **Expect**: Results within 30-60 seconds

#### **Test 2: Custom Task**
```
Find information about Python web frameworks and save it to frameworks.md
```

#### **Test 3: File Generation Test**
```
Create a simple "Hello World" guide for beginners and save it to hello_guide.md
```

### **4. Expected Results**

#### **Full MCP Mode (with OpenAI API key):**
- ✅ Real web browsing and research
- ✅ Detailed, accurate content
- ✅ Professional markdown files
- ✅ 1-3 minute execution time

#### **Mock Mode (testing without full setup):**
- ✅ Simulated agent behavior
- ✅ Sample content generation
- ✅ File creation testing
- ✅ 3-5 second execution time

### **5. File Output Verification**
```bash
# Check generated files
ls -la sandbox/

# View file contents
cat sandbox/python_info.md
cat sandbox/banoffee.md

# Files should be:
# - Well-formatted markdown
# - Relevant to the task
# - Include timestamps and metadata
```

### server.js (Express API Server)
```javascript
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

console.log("🚀 Starting MCP Web Agent Server...");

// Function to run Python MCP agent
function runMCPAgent(task) {
  return new Promise((resolve, reject) => {
    console.log(`🤖 Running MCP agent with task: ${task}`);
    
    // Ensure sandbox directory exists with proper permissions
    const sandboxPath = path.join(__dirname, "sandbox");
    if (!fs.existsSync(sandboxPath)) {
      fs.mkdirSync(sandboxPath, { recursive: true, mode: 0o755 });
    }
    
    const child = spawn("python", ["mcp_agent.py"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: __dirname,
      env: { ...process.env }
    });

    let output = "";
    let errorOutput = "";
    
    const timeoutId = setTimeout(() => {
      console.log("⏰ Agent timeout (60s)");
      child.kill();
      reject(new Error("Agent execution timeout"));
    }, 60000);

    child.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      console.log("📤 Agent:", text.trim());
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      if (!text.includes("✅") && !text.includes("Starting") && !text.includes("Warning")) {
        console.error("⚠️ Agent stderr:", text.trim());
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Agent process error: ${err.message}`));
    });

    child.on("exit", (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        resolve({
          success: true,
          output: output,
          error: null
        });
      } else {
        reject(new Error(`Agent exited with code ${code}: ${errorOutput}`));
      }
    });

    // Send the task to the agent
    try {
      child.stdin.write(task + "\n");
      child.stdin.end();
    } catch (err) {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to send task: ${err.message}`));
    }
  });
}

// API Routes
app.post("/api/agent/run", async (req, res) => {
  console.log("🤖 /api/agent/run called");
  
  try {
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ 
        error: "Task is required",
        success: false 
      });
    }
    
    const result = await runMCPAgent(task);
    
    // Check if any files were created in sandbox
    const sandboxPath = path.join(__dirname, "sandbox");
    let files = [];
    
    try {
      if (fs.existsSync(sandboxPath)) {
        const fileList = fs.readdirSync(sandboxPath);
        files = fileList
          .filter(file => !file.startsWith('.')) // Exclude hidden files
          .map(file => ({
            name: file,
            path: `/api/files/${file}`,
            size: fs.statSync(path.join(sandboxPath, file)).size,
            modified: fs.statSync(path.join(sandboxPath, file)).mtime
          }));
      }
    } catch (err) {
      console.log("📁 No sandbox files found");
    }
    
    res.json({
      success: true,
      task: task,
      output: result.output,
      files: files,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Agent Error:", error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/api/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "sandbox", filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

app.get("/api/status", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    server: "MCP Web Agent Server",
    python_agent: "mcp_agent.py"
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "MCP Web Agent API",
    version: "1.0.0",
    architecture: "Express → Python MCP Agent → External MCP Servers",
    endpoints: {
      "GET /api/status": "Server status",
      "POST /api/agent/run": "Run MCP agent with task",
      "GET /api/files/:filename": "Download generated files"
    }
  });
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ 
    error: "API endpoint not found", 
    path: req.url 
  });
});

app.listen(port, () => {
  console.log(`🌐 MCP Web Agent running at http://localhost:${port}`);
  console.log(`📊 API Documentation: http://localhost:${port}/api`);
  console.log(`🤖 Python Agent: mcp_agent.py`);
  console.log(`📁 File Output: ./sandbox/`);
}).on('error', (err) => {
  console.error('❌ Server startup error:', err);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP Web Agent...');
  process.exit(0);
});
```

### public/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Web Agent</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 MCP Web Agent</h1>
            <p>Model Context Protocol Agent with Web Interface</p>
        </header>

        <main>
            <div class="agent-section">
                <h2>🎯 Agent Task</h2>
                <div class="task-input">
                    <textarea 
                        id="taskInput" 
                        placeholder="Enter your task here... (e.g., 'Find a great recipe for Banoffee Pie, then summarize it in markdown to banoffee.md')"
                        rows="3"
                    ></textarea>
                    <button id="runButton" onclick="runAgent()">
                        <span id="buttonText">🚀 Run Agent</span>
                        <span id="spinner" class="spinner" style="display: none;"></span>
                    </button>
                </div>

                <div class="quick-tasks">
                    <h3>📋 Quick Tasks</h3>
                    <div class="task-buttons">
                        <button onclick="setTask('Find a great recipe for Banoffee Pie, then summarize it in markdown to banoffee.md')">
                            🍰 Find Recipe
                        </button>
                        <button onclick="setTask('Research the latest news about AI developments and create a summary report')">
                            📰 AI News Summary
                        </button>
                        <button onclick="setTask('Find information about Python web frameworks and compare them in a markdown file')">
                            🐍 Python Frameworks
                        </button>
                        <button onclick="setTask('Search for the best practices for MCP servers and document them')">
                            🔧 MCP Best Practices
                        </button>
                    </div>
                </div>
            </div>

            <div class="results-section" id="resultsSection" style="display: none;">
                <h2>📊 Results</h2>
                
                <div class="result-info">
                    <div class="info-item">
                        <strong>Task:</strong> <span id="executedTask"></span>
                    </div>
                    <div class="info-item">
                        <strong>Status:</strong> <span id="taskStatus"></span>
                    </div>
                    <div class="info-item">
                        <strong>Completed:</strong> <span id="timestamp"></span>
                    </div>
                </div>

                <div class="output-section">
                    <h3>📝 Agent Output</h3>
                    <pre id="agentOutput" class="output-text"></pre>
                </div>

                <div class="files-section" id="filesSection" style="display: none;">
                    <h3>📁 Generated Files</h3>
                    <div id="filesList" class="files-list"></div>
                </div>
            </div>

            <div class="error-section" id="errorSection" style="display: none;">
                <h2>❌ Error</h2>
                <div class="error-content">
                    <p id="errorMessage"></p>
                    <details>
                        <summary>Technical Details</summary>
                        <pre id="errorDetails"></pre>
                    </details>
                </div>
            </div>
        </main>

        <footer>
            <p>Powered by OpenAI Agents SDK + Model Context Protocol</p>
            <div class="status-indicator">
                <span id="serverStatus">🟢 Connected</span>
            </div>
        </footer>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

### public/style.css
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    margin-top: 20px;
    margin-bottom: 20px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    backdrop-filter: blur(10px);
}

header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e9ecef;
}

header h1 {
    font-size: 3em;
    background: linear-gradient(45deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 10px;
}

header p {
    color: #666;
    font-size: 1.1em;
}

.agent-section {
    background: #f8f9fa;
    padding: 30px;
    border-radius: 15px;
    margin-bottom: 20px;
    border: 2px solid #e9ecef;
}

.agent-section h2 {
    color: #2c3e50;
    margin-bottom: 20px;
    font-size: 1.5em;
}

.task-input {
    margin-bottom: 30px;
}

#taskInput {
    width: 100%;
    padding: 15px;
    border: 2px solid #dee2e6;
    border-radius: 10px;
    font-size: 16px;
    resize: vertical;
    min-height: 80px;
    margin-bottom: 15px;
    font-family: inherit;
}

#taskInput:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

#runButton {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
}

#runButton:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

#runButton:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
}

.quick-tasks h3 {
    color: #2c3e50;
    margin-bottom: 15px;
}

.task-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 10px;
}

.task-buttons button {
    background: #fff;
    border: 2px solid #e9ecef;
    padding: 12px 15px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
    font-size: 14px;
}

.task-buttons button:hover {
    border-color: #667eea;
    background: #f8f9ff;
}

.results-section, .error-section {
    background: #f8f9fa;
    padding: 30px;
    border-radius: 15px;
    margin-bottom: 20px;
    border: 2px solid #e9ecef;
}

.results-section h2 {
    color: #28a745;
    margin-bottom: 20px;
}

.error-section h2 {
    color: #dc3545;
    margin-bottom: 20px;
}

.result-info {
    background: #e8f5e8;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #4caf50;
}

.info-item {
    margin-bottom: 8px;
}

.info-item:last-child {
    margin-bottom: 0;
}

.output-section, .files-section {
    margin-top: 20px;
}

.output-section h3, .files-section h3 {
    color: #2c3e50;
    margin-bottom: 15px;
}

.output-text {
    background: #2c3e50;
    color: #fff;
    padding: 20px;
    border-radius: 8px;
    white-space: pre-wrap;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
    line-height: 1.4;
}

.files-list {
    display: grid;
    gap: 10px;
}

.file-item {
    background: #fff;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    padding: 15px;
    transition: all 0.3s ease;
}

.file-item:hover {
    border-color: #667eea;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.file-item a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    font-size: 1.1em;
}

.file-item .file-info {
    color: #666;
    font-size: 0.9em;
    margin-top: 5px;
}

.error-content {
    background: #ffe8e8;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #f44336;
}

.error-content summary {
    cursor: pointer;
    margin-top: 10px;
    color: #666;
}

.error-content pre {
    background: #2c3e50;
    color: #fff;
    padding: 15px;
    border-radius: 5px;
    margin-top: 10px;
    white-space: pre-wrap;
    max-height: 300px;
    overflow-y: auto;
}

footer {
    text-align: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid #e9ecef;
    color: #666;
}

.status-indicator {
    margin-top: 10px;
}

.spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    .container {
        margin: 10px;
        padding: 15px;
    }
    
    header h1 {
        font-size: 2em;
    }
    
    .task-buttons {
        grid-template-columns: 1fr;
    }
}
```

### public/script.js
```javascript
const API_BASE = '';

let isRunning = false;

// Check server status on load
document.addEventListener('DOMContentLoaded', function() {
    checkServerStatus();
    document.getElementById('taskInput').focus();
});

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        if (response.ok) {
            document.getElementById('serverStatus').textContent = '🟢 Connected';
        } else {
            document.getElementById('serverStatus').textContent = '🟡 Warning';
        }
    } catch (error) {
        document.getElementById('serverStatus').textContent = '🔴 Disconnected';
    }
}

function setTask(task) {
    document.getElementById('taskInput').value = task;
    document.getElementById('taskInput').focus();
}

async function runAgent() {
    if (isRunning) return;
    
    const task = document.getElementById('taskInput').value.trim();
    if (!task) {
        alert('Please enter a task for the agent to perform.');
        return;
    }
    
    // Set loading state
    isRunning = true;
    const runButton = document.getElementById('runButton');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');
    
    runButton.disabled = true;
    buttonText.style.display = 'none';
    spinner.style.display = 'inline-block';
    
    // Hide previous results/errors
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    
    try {
        console.log('Running agent with task:', task);
        
        const response = await fetch(`${API_BASE}/api/agent/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResults(data);
        } else {
            showError(data.error, task);
        }
        
    } catch (error) {
        console.error('Agent execution error:', error);
        showError(error.message, task);
    } finally {
        // Reset button state
        isRunning = false;
        runButton.disabled = false;
        buttonText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

function showResults(data) {
    // Populate result info
    document.getElementById('executedTask').textContent = data.task;
    document.getElementById('taskStatus').textContent = '✅ Completed Successfully';
    document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString();
    
    // Show agent output
    document.getElementById('agentOutput').textContent = data.output || 'Agent completed successfully.';
    
    // Show files if any
    const filesSection = document.getElementById('filesSection');
    const filesList = document.getElementById('filesList');
    
    if (data.files && data.files.length > 0) {
        filesList.innerHTML = '';
        data.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <a href="${file.path}" target="_blank" download="${file.name}">
                    📄 ${file.name}
                </a>
                <div class="file-info">Size: ${formatFileSize(file.size)}</div>
            `;
            filesList.appendChild(fileItem);
        });
        filesSection.style.display = 'block';
    } else {
        filesSection.style.display = 'none';
    }
    
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

function showError(errorMessage, task) {
    document.getElementById('errorMessage').textContent = `Failed to execute task: ${errorMessage}`;
    document.getElementById('errorDetails').textContent = `Task: ${task}\nError: ${errorMessage}\nTimestamp: ${new Date().toISOString()}`;
    
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorSection').scrollIntoView({ behavior: 'smooth' });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Allow Enter key to run agent (Ctrl+Enter for multiline)
document.getElementById('taskInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        runAgent();
    }
});

// Auto-resize textarea
document.getElementById('taskInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});
```

### mcp_agent.py (Python MCP Agent - Core Component)
```python
#!/usr/bin/env python3
"""
MCP Agent Script for Web Interface
Connects to external MCP servers and performs AI-powered tasks
"""

import os
import sys
import asyncio
import time
from dotenv import load_dotenv

# Try to import MCP dependencies
try:
    from agents import Agent, Runner, trace
    from agents.mcp import MCPServerStdio
    MCP_AVAILABLE = True
    print("✅ OpenAI Agents SDK available - Full MCP mode")
except ImportError:
    MCP_AVAILABLE = False
    print("⚠️ OpenAI Agents SDK not available - Running in mock mode")

def setup_environment():
    """Load environment variables"""
    load_dotenv(override=True)

async def run_full_mcp_agent(task):
    """Run the full MCP agent with web browsing and file system capabilities"""
    
    instructions = """
    You browse the internet to accomplish your instructions.
    You are highly capable at browsing the internet independently to accomplish your task, 
    including accepting all cookies and clicking 'not now' as appropriate to get to the 
    content you need. If one website isn't fruitful, try another. Be persistent until 
    you have solved your assignment, trying different options and sites as needed.
    Always save your findings to appropriately named files in markdown format.
    """
    
    # Set up sandbox directory
    sandbox_path = os.path.abspath(os.path.join(os.getcwd(), "sandbox"))
    os.makedirs(sandbox_path, exist_ok=True)
    print(f"📁 Sandbox directory: {sandbox_path}")
    
    # MCP Server configurations
    files_params = {
        "command": "npx", 
        "args": ["-y", "@modelcontextprotocol/server-filesystem", sandbox_path]
    }
    
    playwright_params = {
        "command": "npx",
        "args": ["@playwright/mcp@latest"]
    }
    
    print(f"🤖 Starting Full MCP Agent for task: {task}")
    print(f"🌐 Connecting to MCP servers...")
    
    try:
        # Create and run the agent with MCP servers
        async with MCPServerStdio(params=files_params, client_session_timeout_seconds=30) as mcp_server_files:
            async with MCPServerStdio(params=playwright_params, client_session_timeout_seconds=30) as mcp_server_browser:
                
                print("🔗 Connected to filesystem and browser MCP servers")
                
                # Create the agent
                agent = Agent(
                    name="web_investigator", 
                    instructions=instructions, 
                    model="gpt-4.1-mini",
                    mcp_servers=[mcp_server_files, mcp_server_browser]
                )
                
                # Run the agent with tracing
                with trace("web_investigation"):
                    print("🚀 Agent starting execution...")
                    result = await Runner.run(agent, task)
                    
                    print("\n" + "="*60)
                    print("✅ FULL MCP AGENT COMPLETED SUCCESSFULLY")
                    print("="*60)
                    print(result.final_output)
                    print("="*60)
                    
                    return result.final_output
                    
    except Exception as e:
        error_msg = f"❌ Full MCP agent execution failed: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)

def run_mock_agent(task):
    """Mock agent for testing when full MCP dependencies aren't available"""
    
    print(f"🧪 MOCK MODE: Simulating MCP agent task")
    print(f"📋 Task: {task}")
    
    # Simulate realistic agent work
    steps = [
        "🔍 Analyzing task requirements...",
        "🌐 Simulating web search...", 
        "📊 Processing information...",
        "📝 Generating content...",
        "💾 Saving to file..."
    ]
    
    for i, step in enumerate(steps):
        print(f"Step {i+1}/5: {step}")
        time.sleep(0.8)  # Realistic timing
    
    # Create realistic output based on task content
    sandbox_path = os.path.abspath(os.path.join(os.getcwd(), "sandbox"))
    os.makedirs(sandbox_path, exist_ok=True)
    
    # Generate content based on task keywords
    task_lower = task.lower()
    
    if "python" in task_lower:
        filename = "python_info.md"
        content = f"""# Python Programming Language

## Overview
Python is a high-level, interpreted programming language known for its simplicity and readability.

## Key Features
- **Easy to Learn**: Simple, readable syntax
- **Versatile**: Web development, data science, AI, automation
- **Large Ecosystem**: Extensive library support
- **Cross-platform**: Runs on Windows, macOS, Linux

## Popular Frameworks
- **Django**: Full-featured web framework
- **Flask**: Lightweight web framework  
- **FastAPI**: Modern, fast web framework
- **Pandas**: Data manipulation and analysis
- **NumPy**: Scientific computing
- **TensorFlow/PyTorch**: Machine learning

## Use Cases
- Web development and APIs
- Data analysis and visualization
- Machine learning and AI
- Automation and scripting
- Scientific computing

## Getting Started
```python
# Hello World in Python
print("Hello, World!")
```

*Generated by MCP Web Agent Mock Mode*
*Task: {task}*
*Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}*
"""

    elif "recipe" in task_lower or "banoffee" in task_lower:
        filename = "banoffee.md"
        content = f"""# Banoffee Pie Recipe

## Description
A delicious British dessert combining bananas, toffee, and cream on a biscuit base.

## Ingredients
### For the Base:
- 200g digestive biscuits, crushed
- 100g butter, melted
- Pinch of salt

### For the Filling:
- 397g condensed milk
- 3 large bananas
- 300ml double cream
- 2 tbsp icing sugar
- Dark chocolate for grating

## Instructions

### Base:
1. Crush digestive biscuits into fine crumbs
2. Mix with melted butter and salt
3. Press firmly into 20cm pie dish
4. Chill for 30 minutes

### Toffee:
1. Place unopened condensed milk can in slow cooker
2. Cover with water and cook on high for 6 hours
3. Allow to cool before opening

### Assembly:
1. Spread toffee over biscuit base
2. Slice bananas and arrange on top
3. Whip cream with icing sugar until soft peaks form
4. Spread cream over bananas
5. Grate dark chocolate on top

## Serving
- Chill for 2 hours before serving
- Cut with sharp knife
- Serves 8-10 people

## Tips
- Use ripe but firm bananas
- Add lemon juice to banana slices to prevent browning
- Make toffee in advance for best results

*Generated by MCP Web Agent Mock Mode*
*Task: {task}*
*Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}*
"""

    elif "news" in task_lower or "ai" in task_lower:
        filename = "ai_news_summary.md"
        content = f"""# AI News Summary

## Top AI Developments

### 1. Model Context Protocol (MCP) Adoption
- Growing adoption of MCP for AI agent integration
- Major platforms implementing MCP support
- Enhanced tool connectivity for AI applications

### 2. Multimodal AI Advances  
- Improved vision-language models
- Better image and text understanding
- Real-time multimodal processing

### 3. AI Safety Initiatives
- New alignment research breakthroughs
- Industry collaboration on safety standards
- Regulatory framework developments

### 4. Open Source AI Models
- Community-driven model development
- Democratization of AI capabilities
- Reduced barriers to AI adoption

### 5. Enterprise AI Integration
- Increased business AI adoption
- Workflow automation improvements
- Cost-effective AI solutions

## Key Trends
- **Agent-based AI**: Rise of autonomous AI agents
- **Tool Integration**: Better AI-tool connectivity via protocols like MCP
- **Efficiency**: More efficient models with lower compute requirements
- **Accessibility**: AI tools becoming more user-friendly

## Future Outlook
The AI landscape continues rapid evolution with focus on:
- Enhanced safety and alignment
- Better human-AI collaboration
- More practical business applications
- Improved accessibility and usability

*Generated by MCP Web Agent Mock Mode*
*Task: {task}*
*Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}*
"""

    else:
        # Generic task response
        filename = "task_output.md"
        content = f"""# Task Results

## Task Summary
**Original Task**: {task}

## Mock Agent Response
This is a simulated response from the MCP Web Agent running in mock mode.

## What the Full Agent Would Do
1. **Web Research**: Browse multiple websites to gather information
2. **Content Analysis**: Process and synthesize findings
3. **File Creation**: Generate structured markdown documents
4. **Quality Check**: Verify information accuracy and completeness

## Mock Results
- Simulated web browsing completed
- Information gathered and processed
- Content generated in markdown format
- File saved to sandbox directory

## Next Steps
To enable full functionality:
1. Install OpenAI Agents SDK: `pip install openai-agents-sdk`
2. Set up OpenAI API key in .env file
3. Ensure Node.js is installed for MCP servers
4. Restart the agent for full web browsing capabilities

## System Information
- **Mode**: Mock/Simulation
- **Generated**: {time.strftime('%Y-%m-%d %H:%M:%S')}
- **Agent**: MCP Web Agent v1.0
- **Task**: {task}

*This is mock data for testing the web interface*
"""

    # Save the file
    output_file = os.path.join(sandbox_path, filename)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"📄 Created file: {filename}")
    print("✅ Mock agent completed successfully!")
    
    return f"Mock MCP agent completed task successfully.\n\nGenerated file: {filename}\n\nContent preview:\n{content[:200]}..."

async def run_agent_task(task):
    """Main function to run agent task (full MCP or mock mode)"""
    
    setup_environment()
    
    # Check if we can run full MCP mode
    has_openai_key = bool(os.getenv('OPENAI_API_KEY'))
    
    if MCP_AVAILABLE and has_openai_key:
        print("🚀 Running FULL MCP AGENT with web browsing")
        return await run_full_mcp_agent(task)
    else:
        if not MCP_AVAILABLE:
            print("⚠️ OpenAI Agents SDK not installed - using mock mode")
        if not has_openai_key:
            print("⚠️ OpenAI API key not found - using mock mode")
        print("🧪 Running MOCK AGENT for testing")
        return run_mock_agent(task)

if __name__ == "__main__":
    # Get task from command line arguments or stdin
    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
    else:
        # Read from stdin for web interface
        try:
            task = sys.stdin.read().strip()
        except:
            task = ""
    
    if not task:
        print("❌ No task provided")
        sys.exit(1)
    
    try:
        # Run the appropriate agent mode
        if MCP_AVAILABLE:
            result = asyncio.run(run_agent_task(task))
        else:
            result = asyncio.run(run_agent_task(task))
        
        print(f"\n🎉 FINAL RESULT:")
        print("-" * 50)
        print(result)
        print("-" * 50)
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ Agent execution error: {e}")
        sys.exit(1)
```

## 🚀 Usage Instructions

1. **Install dependencies:**
   ```bash
   npm install
   pip install openai-agents-sdk python-dotenv
   ```

2. **Setup environment:**
   - Create `.env` file with your OpenAI API key
   - Ensure Node.js is installed (for MCP servers)

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   - Visit `http://localhost:3000`
   - Enter tasks or use quick task buttons
   - View results and download generated files

## ✨ Features

### 🤖 **Intelligent MCP Agent**
- **Full Mode**: Real web browsing with OpenAI Agents SDK + MCP servers
- **Mock Mode**: Testing mode when dependencies aren't fully set up
- **Auto-detection**: Automatically chooses best available mode
- **File Generation**: Creates structured markdown output files

### 🌐 **Web Interface**
- **Real-time Execution**: See agent progress live
- **File Management**: Download generated files directly
- **Task Templates**: Quick-start buttons for common tasks
- **Error Handling**: Comprehensive error reporting with details
- **Responsive Design**: Works on desktop and mobile

### 🔧 **Architecture Benefits**
- **Separation of Concerns**: Frontend, API, and Agent are independent
- **Scalable**: Easy to extend with new MCP servers or capabilities
- **Development Friendly**: Mock mode for testing without full setup
- **Production Ready**: Robust error handling and logging
- **File Management**: Download files created by the agent
- **Quick Tasks**: Pre-defined tasks for common operations
- **Error Handling**: Comprehensive error reporting
- **Responsive Design**: Works on desktop and mobile
- **Server Status**: Connection monitoring

## 📚 Usage Examples

### **🧪 Testing & Development Tasks**
```bash
# Quick connectivity test
"Create a simple hello world message and save it to hello.md"

# File system test  
"Generate a basic markdown template and save it to template.md"

# Content generation test
"Write a short guide about getting started with programming"
```

### **🔍 Research Tasks (Full MCP Mode)**
```bash
# Technology research
"Research the latest developments in artificial intelligence and create a summary report"

# Comparative analysis
"Compare React, Vue, and Angular frameworks and document the differences"

# Current information
"Find the latest news about climate change and create a summary with key points"

# Tutorial creation
"Find best practices for Python web development and create a beginner's guide"
```

### **📝 Content Creation Tasks**
```bash
# Recipe research
"Find a great recipe for chocolate chip cookies and format it in markdown"

# Educational content
"Create a comprehensive guide about machine learning for beginners"

# Reference material
"Research REST API design patterns and create a reference document"

# How-to guides
"Find information about setting up a development environment and create a setup guide"
```

### **🏢 Business & Professional Tasks**
```bash
# Market research
"Research current trends in remote work and create an executive summary"

# Technology evaluation
"Compare different cloud hosting options and create a decision matrix"

# Documentation
"Find best practices for software documentation and create a style guide"

# Competitive analysis
"Research major players in the SaaS industry and create a competitive landscape report"
```

## 🎯 Task Writing Tips

### **✅ Good Task Structure**
```
[ACTION VERB] + [SPECIFIC TOPIC] + [OUTPUT FORMAT/FILE]

Examples:
✅ "Research Python web frameworks and save findings to frameworks.md"
✅ "Find current cryptocurrency prices and create a market report"
✅ "Compare different project management tools and document pros/cons"
```

### **❌ Avoid These**
```
❌ "Tell me about stuff" (too vague)
❌ "Research everything about AI" (too broad)
❌ "Help me" (no specific action)
❌ Tasks requiring personal/private information
```

### **🎨 Output Format Options**
- **Markdown files** (.md) - Best for most content
- **Documentation** - Structured guides and references
- **Reports** - Business or research summaries
- **Tutorials** - Step-by-step instructions
- **Comparisons** - Side-by-side analysis
- **Lists** - Organized information collections

## 🔄 Development Workflow

### **1. Start Development Server**
```bash
# Terminal 1: API Server (keep running)
npm start

# Terminal 2: Frontend development (optional)
# Use any live server for public/ folder for faster frontend development
```

### **2. Development Cycle**
1. **Modify code** (server.js, mcp_agent.py, or frontend files)
2. **Restart server** if needed (Ctrl+C, npm start)
3. **Test in browser** (http://localhost:3000)
4. **Check logs** in server terminal
5. **Iterate** based on results

### **3. Adding New Features**

#### **Backend (server.js)**
- Add new API endpoints
- Modify agent communication
- Add file handling features

#### **Agent (mcp_agent.py)**
- Add new MCP server connections
- Modify task processing logic
- Add new content generation types

#### **Frontend (public/ files)**
- Add new UI components
- Modify styling and layout
- Add new task templates

### **4. Production Deployment**
```bash
# Environment setup
export OPENAI_API_KEY=your_production_key
export NODE_ENV=production

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start server.js --name "mcp-web-agent"
```