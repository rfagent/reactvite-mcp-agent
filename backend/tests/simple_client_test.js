import { spawn } from "child_process";

function sendAddRequest(a, b) {
  const child = spawn("node", ["mcp_server.js"], {
    stdio: ["pipe", "pipe", "inherit"]
  });

  // Create a valid MCP JSON-RPC 2.0 request
  const request = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "add",
      arguments: { a: 12, b: 8 }
    }
};

  // Read response
  child.stdout.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("🧠 MCP Response:", response);
      if (response.result?.content?.[0]?.text) {
        console.log("✅ Result:", response.result.content[0].text);
      }
    } catch (err) {
      console.error("Failed to parse response:", err);
    }
  });

  // Send request to server
  child.stdin.write(JSON.stringify(request) + "\n");
}

sendAddRequest(5, 3);