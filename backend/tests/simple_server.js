import express from "express";

const app = express();
const port = 3000;

console.log("🔧 Starting ultra-simple server...");

app.get("/", (req, res) => {
  console.log("🏠 Root route accessed");
  res.send(`
    <html>
      <body>
        <h1>🚀 Server is Working!</h1>
        <p>Time: ${new Date().toISOString()}</p>
        <ul>
          <li><a href="/test">Test JSON endpoint</a></li>
          <li><a href="/add?a=5&b=3">Test calculator</a></li>
        </ul>
      </body>
    </html>
  `);
});

app.get("/test", (req, res) => {
  console.log("🧪 Test endpoint accessed");
  res.json({ 
    status: "working", 
    timestamp: new Date().toISOString(),
    message: "JSON endpoint is functional"
  });
});

app.get("/add", (req, res) => {
  console.log("🧮 Calculator endpoint accessed with:", req.query);
  const a = Number(req.query.a) || 0;
  const b = Number(req.query.b) || 0;
  const result = a + b;
  
  res.json({ 
    operation: "addition",
    a: a,
    b: b,
    result: result,
    timestamp: new Date().toISOString()
  });
});

// Start server
try {
  app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
    console.log("📋 Test URLs:");
    console.log(`   http://localhost:${port}/`);
    console.log(`   http://localhost:${port}/test`);
    console.log(`   http://localhost:${port}/add?a=5&b=3`);
  });
} catch (error) {
  console.error("❌ Failed to start server:", error);
}