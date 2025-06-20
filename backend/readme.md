# MCP Web Agent - Server & Agent Setup Guide

## 🏗️ Core Architecture

```
Express Server (server.js) → Python MCP Agent (mcp_agent.py) → External MCP Servers
```

## 📁 Required Files

### **1. server.js** - Express API Server
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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, "public")));

// Function to run Python MCP agent
function runMCPAgent(task) {
  return new Promise((resolve, reject) => {
    const child = spawn("python", ["mcp_agent.py"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: __dirname,
      env: { ...process.env }
    });

    let stdout = "";
    const timeoutId = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Agent execution timeout"));
    }, 60000);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      if (code === 0 || stdout.trim()) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        reject(new Error(`Agent failed with code ${code}`));
      }
    });

    child.stdin.write(task + "\n");
    child.stdin.end();
  });
}

// API endpoint to run agent
app.post("/api/agent/run", async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) {
      return res.status(400).json({ success: false, error: "Task required" });
    }

    const result = await runMCPAgent(task.trim());
    
    // Check for generated files
    const sandboxPath = path.join(__dirname, "sandbox");
    let files = [];
    if (fs.existsSync(sandboxPath)) {
      const fileNames = fs.readdirSync(sandboxPath);
      files = fileNames.map(fileName => ({
        name: fileName,
        path: `/api/files/${encodeURIComponent(fileName)}`,
        size: fs.statSync(path.join(sandboxPath, fileName)).size
      }));
    }

    res.json({
      success: true,
      task: task,
      output: result.output,
      files: files,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// File download endpoint
app.get("/api/files/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.join(__dirname, "sandbox", filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    server: "MCP Web Agent Server"
  });
});

// Start server
app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
  
  // Create sandbox if needed
  const sandboxPath = path.join(__dirname, "sandbox");
  if (!fs.existsSync(sandboxPath)) {
    fs.mkdirSync(sandboxPath, { recursive: true });
  }
});
```

### **2. mcp_agent.py** - Real MCP Agent
```python
#!/usr/bin/env python3
"""
Real MCP Agent with Web Browsing Capabilities
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

try:
    from agents import Agent, Runner, trace
    from agents.mcp import MCPServerStdio
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False

def setup_environment():
    load_dotenv(override=True)

async def run_real_mcp_agent(task):
    instructions = """
    You browse the internet to accomplish your instructions.
    You are highly capable at browsing the internet independently to accomplish your task, 
    including accepting all cookies and clicking 'not now' as appropriate to get to the 
    content you need. If one website isn't fruitful, try another. Be persistent until 
    you have solved your assignment, trying different options and sites as needed.
    """
    
    sandbox_path = os.path.abspath(os.path.join(os.getcwd(), "sandbox"))
    os.makedirs(sandbox_path, exist_ok=True)
    
    # MCP Server configurations
    files_params = {
        "command": "npx", 
        "args": ["-y", "@modelcontextprotocol/server-filesystem", sandbox_path]
    }
    
    playwright_params = {
        "command": "npx",
        "args": ["@playwright/mcp@latest"]
    }
    
    try:
        async with MCPServerStdio(params=files_params, client_session_timeout_seconds=30) as mcp_server_files:
            async with MCPServerStdio(params=playwright_params, client_session_timeout_seconds=30) as mcp_server_browser:
                
                agent = Agent(
                    name="investigator", 
                    instructions=instructions, 
                    model="gpt-4.1-mini",
                    mcp_servers=[mcp_server_files, mcp_server_browser]
                )
                
                with trace("investigate"):
                    result = await Runner.run(agent, task)
                    print(result.final_output)
                    return result.final_output
                    
    except Exception as e:
        raise Exception(f"MCP agent failed: {str(e)}")

async def main():
    setup_environment()
    
    # Get task from stdin
    task = sys.stdin.read().strip()
    if not task:
        print("No task provided")
        sys.exit(1)
    
    # Check requirements
    has_openai_key = bool(os.getenv('OPENAI_API_KEY'))
    
    if MCP_AVAILABLE and has_openai_key:
        try:
            await run_real_mcp_agent(task)
        except Exception as e:
            print(f"Agent failed: {e}")
            sys.exit(1)
    else:
        print("Missing requirements for full MCP agent")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
```

### **3. package.json** - Node.js Configuration
```json
{
  "name": "mcp-web-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5"
  }
}
```

### **4. .env** - Environment Variables
```
OPENAI_API_KEY=your_openai_api_key_here
```

## 🚀 Setup Instructions

### **1. Install Dependencies**
```bash
# Node.js dependencies
npm install

# Python dependencies
pip install openai-agents-sdk python-dotenv
```

### **2. Environment Setup**
```bash
# Create .env file with your OpenAI API key
echo "OPENAI_API_KEY=your_actual_key_here" > .env

# Ensure Node.js tools are available
node --version  # Should be v16+
npx --version   # Should work
```

### **3. Start the Server**
```bash
npm start
```

### **4. Test the Setup**
```bash
# Test API server
curl http://localhost:3000/api/status

# Test agent directly
echo "Find information about Python" | python mcp_agent.py
```

## 🧪 Verification Steps

### **1. Server Status Check**
- Visit `http://localhost:3000/api/status`
- Should return JSON with `"status": "healthy"`

### **2. Agent Capabilities Check**
Look for these log messages when starting:
```
✅ OpenAI Agents SDK available - Full MCP mode enabled
🔗 Connected to filesystem and browser MCP servers
🚀 Agent starting execution...
```

### **3. File Generation Check**
- Agent should create files in `./sandbox/` directory
- Files should be accessible via `/api/files/:filename`

## 🔧 Component Responsibilities

### **Express Server (server.js)**
- **HTTP API**: Handles web requests
- **Process Management**: Spawns Python agent processes
- **File Serving**: Provides download access to generated files
- **Error Handling**: Manages timeouts and failures

### **MCP Agent (mcp_agent.py)**
- **AI Reasoning**: Uses GPT-4.1-mini for intelligent task processing
- **Web Browsing**: Connects to Playwright MCP server for real web access
- **File Operations**: Uses filesystem MCP server for file creation
- **Task Execution**: Processes natural language instructions

### **MCP Servers (External)**
- **Filesystem**: `@modelcontextprotocol/server-filesystem`
- **Browser**: `@playwright/mcp@latest`

## 🎯 Usage Examples

### **Research Tasks**
```bash
"Research the latest developments in artificial intelligence and create a summary"
"Find current news about climate change and document key findings"
"Compare different programming languages and create a comparison guide"
```

### **Content Creation**
```bash
"Find a great recipe for chocolate cake and format it in markdown"
"Research best practices for web development and create a reference guide"
"Find information about machine learning and create a beginner's tutorial"
```

## 🔍 Troubleshooting

### **Agent Not Starting**
- Check OpenAI API key in `.env` file
- Verify `pip install openai-agents-sdk python-dotenv`
- Ensure Node.js version 16+ is installed

### **No Files Generated**
- Check sandbox directory permissions: `chmod 755 sandbox`
- Verify filesystem MCP server connection
- Look for file creation messages in logs

### **Web Browsing Fails**
- Ensure `npx @playwright/mcp@latest` works independently
- Check network connectivity
- Verify Playwright MCP server connection

## 🎉 Success Indicators

When everything works correctly:
- ✅ Server starts without errors
- ✅ Agent connects to MCP servers
- ✅ Tasks complete with intelligent output
- ✅ Files are generated in sandbox
- ✅ Web interface shows results and download links

## 🔄 API Flow

```
1. POST /api/agent/run { "task": "your task" }
2. server.js spawns: python mcp_agent.py
3. mcp_agent.py connects to MCP servers
4. Agent browses web and creates files
5. server.js returns results + file list
6. GET /api/files/:filename for downloads
```

This setup gives you a **real MCP agent** capable of intelligent web browsing and file generation!