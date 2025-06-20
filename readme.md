# MCP Web Agent

**A modern web interface for running AI agents powered by the Model Context Protocol (MCP)**

## 🏗️ Architecture

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

## 📁 Project Structure

```
mcp-web-agent/
├── README.md                   # This file
├── backend/                    # Express API + MCP Agent
│   ├── package.json
│   ├── server.js               # Express API Server
│   ├── mcp_agent.py            # Python MCP agent (core AI component)
│   ├── tests/
│   │   ├── client_test.js      # Direct MCP testing
│   │   └── debug_script.js     # Backend diagnostics
│   └── README.md               # Backend-specific docs
└── web_app/                   # Static Web Frontend
    ├── index.html              # Main interface
    ├── style.css               # Styling
    ├── script.js               # Frontend logic
    ├── package.json            # Optional dev dependencies
    └── README.md               # Frontend-specific docs
```

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

## 🚀 Quick Start

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

## 🔧 Troubleshooting

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

## 📋 Dependencies

### **Required Files**
- `package.json` - Node.js project configuration
- `server.js` - Express API server
- `mcp_agent.py` - Python MCP agent script
- `public/index.html` - Web interface
- `public/style.css` - Styling
- `public/script.js` - Frontend JavaScript

### **Node.js Dependencies**
```json
{
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5"
  }
}
```

### **Python Dependencies**
```bash
pip install openai-agents-sdk python-dotenv
```

### **Environment Variables**
```
OPENAI_API_KEY=your_openai_api_key_here
```

## 🎯 Key Concepts

### **MCP Agent vs MCP Server**
- **MCP Server** (like old mcp_server.js): Provides tools for others to use
- **MCP Agent** (current mcp_agent.py): Uses tools from external servers + AI reasoning

### **Dual Mode Operation**
- **Full Mode**: Real AI agent with web browsing capabilities
- **Mock Mode**: Testing mode that creates realistic sample content

### **Architecture Benefits**
- **Frontend/Backend Separation**: Independent development and deployment
- **Extensible**: Easy to add new MCP servers and capabilities
- **Development Friendly**: Mock mode for testing without full setup

## 🚀 Success Indicators

When everything is working correctly, you should see:

- ✅ **Browser Status**: "🟢 Connected" 
- ✅ **Agent Execution**: Spinner during processing
- ✅ **Results Display**: Agent output and file listing
- ✅ **File Downloads**: Clickable links to generated files
- ✅ **Console Logs**: Detailed execution information

## 🎉 What You've Built

This project creates a **professional-grade MCP web agent system** that combines:

- **Modern Web Interface** with real-time feedback
- **Robust Backend API** with comprehensive error handling
- **Intelligent AI Agent** capable of web browsing and file generation
- **Flexible Architecture** supporting both development and production use

The system demonstrates the power of the Model Context Protocol for creating sophisticated AI agents that can use external tools to accomplish complex tasks.

---

**Powered by OpenAI Agents SDK + Model Context Protocol**# mcp_agent
# mcp-web-agent
# reactvite-mcp-agent
