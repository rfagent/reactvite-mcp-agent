import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);

console.log("🧪 Testing direct MCP server communication...");
console.log("📁 Project root:", projectRoot);

function sendAddRequest(a, b) {
  console.log(`🧮 Testing MCP add tool: ${a} + ${b}`);
  
  const child = spawn("node", ["mcp_server.js"], {
    stdio: ["pipe", "pipe", "inherit"],
    cwd: projectRoot  // Run from project root
  });

  // Create a valid MCP JSON-RPC 2.0 request
  const request = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "add",
      arguments: { a, b }
    }
  };

  console.log("📤 Sending request:", JSON.stringify(request, null, 2));

  let responseReceived = false;
  const timeout = setTimeout(() => {
    if (!responseReceived) {
      console.log("⏰ Timeout: No response received from MCP server");
      child.kill();
    }
  }, 5000);

  // Read response
  child.stdout.on("data", (data) => {
    try {
      const responseText = data.toString().trim();
      console.log("📥 Raw response:", responseText);
      
      // Try to parse each line as JSON (MCP server might send multiple lines)
      const lines = responseText.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line.trim());
            console.log("🧠 Parsed MCP Response:", JSON.stringify(response, null, 2));
            
            if (response.result?.content?.[0]?.text) {
              console.log("✅ Calculation Result:", response.result.content[0].text);
              responseReceived = true;
              clearTimeout(timeout);
              child.kill();
              
              // Test another calculation
              console.log("\n" + "=".repeat(50));
              testMultipleOperations();
              return;
            }
          } catch (parseErr) {
            // Continue to next line if JSON parsing fails
            continue;
          }
        }
      }
    } catch (err) {
      console.error("❌ Failed to parse response:", err);
      console.error("📥 Raw data:", data.toString());
    }
  });

  child.on("error", (err) => {
    console.error("❌ MCP process error:", err);
    clearTimeout(timeout);
  });

  child.on("exit", (code) => {
    clearTimeout(timeout);
    if (code !== 0 && code !== null) {
      console.error(`❌ MCP process exited with code ${code}`);
    }
  });

  // Send request to server
  try {
    child.stdin.write(JSON.stringify(request) + "\n");
    child.stdin.end();
  } catch (err) {
    console.error("❌ Failed to send request:", err);
    clearTimeout(timeout);
  }
}

function testMultipleOperations() {
  console.log("🔄 Testing multiple MCP operations...");
  
  const tests = [
    { a: 10, b: 5, tool: "add" },
    { a: 10, b: 3, tool: "multiply" },
    { a: 15, b: 3, tool: "divide" },
    { base: 2, exponent: 3, tool: "power" },
    { n: 5, tool: "factorial" }
  ];
  
  let currentTest = 0;
  
  function runNextTest() {
    if (currentTest >= tests.length) {
      console.log("\n✅ All MCP tests completed!");
      return;
    }
    
    const test = tests[currentTest];
    console.log(`\n🧪 Test ${currentTest + 1}: ${test.tool}`);
    
    const child = spawn("node", ["mcp_server.js"], {
      stdio: ["pipe", "pipe", "inherit"],
      cwd: projectRoot
    });
    
    const request = {
      jsonrpc: "2.0",
      id: currentTest + 10,
      method: "tools/call",
      params: {
        name: test.tool,
        arguments: test.tool === "power" ? { base: test.base, exponent: test.exponent } :
                  test.tool === "factorial" ? { n: test.n } :
                  { a: test.a, b: test.b }
      }
    };
    
    console.log("📤", JSON.stringify(request.params));
    
    const timeout = setTimeout(() => {
      console.log("⏰ Test timeout");
      child.kill();
      currentTest++;
      runNextTest();
    }, 3000);
    
    child.stdout.on("data", (data) => {
      try {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.result?.content?.[0]?.text) {
                console.log("✅ Result:", response.result.content[0].text);
                clearTimeout(timeout);
                child.kill();
                currentTest++;
                setTimeout(runNextTest, 100); // Small delay between tests
                return;
              }
            } catch (parseErr) {
              continue;
            }
          }
        }
      } catch (err) {
        console.error("❌ Parse error:", err.message);
      }
    });
    
    child.on("error", (err) => {
      console.error("❌ Process error:", err.message);
      clearTimeout(timeout);
      currentTest++;
      runNextTest();
    });
    
    try {
      child.stdin.write(JSON.stringify(request) + "\n");
      child.stdin.end();
    } catch (err) {
      console.error("❌ Send error:", err.message);
      clearTimeout(timeout);
      currentTest++;
      runNextTest();
    }
  }
  
  runNextTest();
}

// Start with a simple addition test
sendAddRequest(5, 3);