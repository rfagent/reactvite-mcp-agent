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

console.log("🚀 Minimal Test Server Starting...");

// Simple agent runner
function runAgent(task) {
  return new Promise((resolve, reject) => {
    console.log(`\n🤖 Running agent: "${task}"`);

    const child = spawn("python", ["mcp_agent.py"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: __dirname
    });

    let output = "";
    let error = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      console.log(`STDOUT: ${text.trim()}`);
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      error += text;
      console.log(`STDERR: ${text.trim()}`);
    });

    child.on("close", (code) => {
      console.log(`Agent finished with code: ${code}`);
      
      if (code === 0 || output.includes("completed successfully")) {
        resolve({ output: output.trim() });
      } else {
        reject(new Error(`Agent failed: ${error.trim()}`));
      }
    });

    child.on("error", (err) => {
      console.error(`Process error: ${err.message}`);
      reject(err);
    });

    // Send task
    child.stdin.write(task + "\n");
    child.stdin.end();
  });
}

// Main API endpoint
app.post("/api/agent/run", async (req, res) => {
  console.log("\n=== AGENT RUN REQUEST ===");
  
  try {
    const { task } = req.body;
    console.log(`Task: ${task}`);

    if (!task) {
      console.log("No task provided");
      return res.status(400).json({ 
        success: false, 
        error: "No task provided" 
      });
    }

    // Run agent
    const result = await runAgent(task);
    
    // Get files
    const sandboxPath = path.join(__dirname, "sandbox");
    let files = [];
    
    if (fs.existsSync(sandboxPath)) {
      files = fs.readdirSync(sandboxPath).map(f => ({
        name: f,
        path: `/api/files/${f}`,
        size: fs.statSync(path.join(sandboxPath, f)).size
      }));
    }

    // Success response
    const response = {
      success: true,
      task: task,
      output: result.output,
      files: files,
      timestamp: new Date().toISOString()
    };

    console.log("✅ Sending success response");
    console.log(`Files found: ${files.length}`);
    
    res.json(response);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// File endpoint
app.get("/api/files/:filename", (req, res) => {
  const filename = req.params.filename;
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
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
  
  // Create sandbox
  const sandboxPath = path.join(__dirname, "sandbox");
  if (!fs.existsSync(sandboxPath)) {
    fs.mkdirSync(sandboxPath);
    console.log("📁 Created sandbox");
  }
});