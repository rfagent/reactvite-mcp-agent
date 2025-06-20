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
app.use(express.urlencoded({ extended: true }));

console.log("🚀 Starting MCP Web Agent Server...");
console.log(`📁 Working directory: ${__dirname}`);

// Function to run Python MCP agent
function runMCPAgent(task) {
  return new Promise((resolve, reject) => {
    console.log(`\n🤖 Starting agent with task: "${task}"`);

    const child = spawn("python", ["mcp_agent.py"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: __dirname,
      env: { ...process.env }
    });

    let stdout = "";
    let stderr = "";

    // Set timeout
    const timeoutId = setTimeout(() => {
      console.log("⏰ Agent timeout (60s)");
      child.kill("SIGKILL");
      reject(new Error("Agent execution timeout"));
    }, 60000);

    // Handle stdout
    child.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      console.log(`[AGENT OUT] ${text.trim()}`);
    });

    // Handle stderr
    child.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      console.log(`[AGENT ERR] ${text.trim()}`);
    });

    // Handle process errors
    child.on("error", (err) => {
      clearTimeout(timeoutId);
      console.error(`❌ Process error: ${err.message}`);
      reject(new Error(`Process error: ${err.message}`));
    });

    // Handle process exit
    child.on("close", (code, signal) => {
      clearTimeout(timeoutId);
      console.log(`🔄 Agent process closed: code=${code}, signal=${signal}`);
      
      // Success if code 0 or if we have output
      if (code === 0 || stdout.trim()) {
        console.log("✅ Agent completed successfully");
        resolve({
          success: true,
          output: stdout.trim() || "Agent completed successfully",
          stderr: stderr.trim()
        });
      } else {
        console.log("❌ Agent failed");
        reject(new Error(`Agent failed with code ${code}: ${stderr.trim()}`));
      }
    });

    // Send task to agent
    try {
      child.stdin.write(task + "\n");
      child.stdin.end();
      console.log("📤 Task sent to agent");
    } catch (err) {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to send task: ${err.message}`));
    }
  });
}

// API endpoint to run agent
app.post("/api/agent/run", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("🎯 POST /api/agent/run");
  
  try {
    // Validate request
    const { task } = req.body;
    console.log(`📋 Received task: "${task}"`);

    if (!task || typeof task !== 'string' || task.trim() === '') {
      console.log("❌ Invalid task");
      return res.status(400).json({
        success: false,
        error: "Task is required and must be a non-empty string"
      });
    }

    // Run the agent
    console.log("🚀 Executing agent...");
    const result = await runMCPAgent(task.trim());
    
    // Check for generated files
    const sandboxPath = path.join(__dirname, "sandbox");
    let files = [];

    if (fs.existsSync(sandboxPath)) {
      try {
        const fileNames = fs.readdirSync(sandboxPath);
        files = fileNames.map(fileName => {
          const filePath = path.join(sandboxPath, fileName);
          const stats = fs.statSync(filePath);
          return {
            name: fileName,
            path: `/api/files/${encodeURIComponent(fileName)}`,
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        });
        console.log(`📁 Found ${files.length} files in sandbox`);
      } catch (err) {
        console.log(`⚠️ Error reading sandbox: ${err.message}`);
      }
    }

    // Send success response
    const response = {
      success: true,
      task: task,
      output: result.output,
      files: files,
      timestamp: new Date().toISOString()
    };

    console.log("✅ Sending success response");
    res.json(response);

  } catch (error) {
    console.error(`❌ Agent execution failed: ${error.message}`);
    
    // Send error response
    const errorResponse = {
      success: false,
      error: error.message,
      task: req.body?.task || "unknown",
      timestamp: new Date().toISOString()
    };

    res.status(500).json(errorResponse);
  }
});

// File download endpoint
app.get("/api/files/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.join(__dirname, "sandbox", filename);

  console.log(`📁 File request: ${filename}`);

  // Security check
  const normalizedPath = path.normalize(filePath);
  const sandboxPath = path.normalize(path.join(__dirname, "sandbox"));
  
  if (!normalizedPath.startsWith(sandboxPath)) {
    console.log("🚫 Security violation");
    return res.status(403).json({ error: "Access denied" });
  }

  if (fs.existsSync(filePath)) {
    console.log(`✅ Serving file: ${filename}`);
    res.sendFile(filePath);
  } else {
    console.log(`❌ File not found: ${filename}`);
    res.status(404).json({ error: "File not found" });
  }
});

// Status endpoint
app.get("/api/status", (req, res) => {
  const status = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    server: "MCP Web Agent Server",
    working_directory: __dirname,
    sandbox_exists: fs.existsSync(path.join(__dirname, "sandbox"))
  };
  
  console.log("💚 Status check");
  res.json(status);
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "MCP Web Agent API",
    version: "1.0.0",
    endpoints: [
      "GET /api/status",
      "POST /api/agent/run", 
      "GET /api/files/:filename"
    ],
    timestamp: new Date().toISOString()
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve main page
app.get("/", (req, res) => {
  console.log("🌐 Serving index.html");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Not found",
    url: req.url,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`\n🌐 Server running at http://localhost:${port}`);
  console.log(`📊 API available at http://localhost:${port}/api`);
  console.log(`📁 Sandbox: ${path.join(__dirname, "sandbox")}`);
  
  // Create sandbox if needed
  const sandboxPath = path.join(__dirname, "sandbox");
  if (!fs.existsSync(sandboxPath)) {
    fs.mkdirSync(sandboxPath, { recursive: true });
    console.log("📁 Created sandbox directory");
  }
  
  console.log("🎉 Ready to run agents!");
});