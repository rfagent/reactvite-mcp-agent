# Express + MCP Tool Demo - Project Structure

## 📁 Complete File Organization

```
express-mcp-server/
├── package.json                    # Project dependencies and scripts
├── server.js                      # Traditional Express API server (port 3000)
├── mcp_server.js                  # Enhanced MCP server with 5 tools
├── public/                        # Static frontend files (serve from anywhere)
│   ├── index.html                 # Clean HTML structure
│   ├── style.css                  # Modern CSS with animations
│   └── script.js                  # Frontend JavaScript (API calls to localhost:3000)
├── tests/                         # Testing and debugging utilities
│   ├── debug-script.js            # Enhanced debug script (works from any directory)
│   ├── test-server.js             # Minimal test server for debugging
│   ├── simple-server.js           # Ultra-basic server for troubleshooting
│   └── client-test.js             # Direct MCP server communication test
└── README.md                      # This documentation
```

## 🚀 Quick Start Guide

### **Traditional API Server Setup (Recommended)**

#### **Step 1: Start the Express API Server**
```bash
# Install dependencies (first time only)
npm install

# Start the API server
npm start
# or
node server.js

# You should see:
# 🌐 Express API Server running at http://localhost:3000
# 📊 API Documentation: http://localhost:3000/api
```

#### **Step 2: Serve Frontend from Anywhere**
Now you can serve `public/index.html` using **any method:**

**Option A: PyCharm Live Server**
```bash
# Right-click on public/index.html in PyCharm
# Select "Open in Browser" 
# Works on: http://localhost:63342/...
```

**Option B: Cursor Live Server**  
```bash
# Install Live Server extension in Cursor
# Right-click public/index.html → "Open with Live Server"
# Works on: http://localhost:5500/...
```

**Option C: VS Code Live Server**
```bash
# Install Live Server extension in VS Code  
# Right-click public/index.html → "Open with Live Server"
# Works on: http://localhost:5501/...
```

**Option D: Python HTTP Server**
```bash
cd public
python -m http.server 8000
# Works on: http://localhost:8000/
```

**Option E: Node.js HTTP Server**
```bash
npx http-server public -p 8080
# Works on: http://localhost:8080/
```

✅ **All API calls automatically work** because the frontend is configured to call `http://localhost:3000/api/...`

### **Alternative: Single Server Setup**
```bash
# If you prefer everything in one server (old way):
node tests/simple-server.js
# Visit: http://localhost:3000 (frontend + API together)
```

## 📋 Detailed File Descriptions

### **🖥️ Backend Files**

#### **server.js** - Traditional Express API Server
- **API-only server** running on **port 3000**
- **CORS enabled** - accepts requests from any frontend port
- **RESTful API endpoints:**
  - `GET /api` - API documentation
  - `GET /api/health` - Server health check
  - `GET /api/add?a=1&b=2` - Calculator (Express + MCP)
  - `GET /api/mcp/tools` - List available MCP tools
- **No static file serving** - frontend served separately
- **MCP integration** with timeout handling and error management

#### **mcp_server.js** - MCP Tool Server
- Enhanced MCP server with **5 calculator tools:**
  - `add` - Addition
  - `multiply` - Multiplication  
  - `divide` - Division (with zero-division protection)
  - `power` - Exponentiation
  - `factorial` - Factorial calculation (0-20 range)
- Uses Zod schemas for input validation
- Proper JSON-RPC 2.0 protocol implementation
- Error handling and graceful shutdown

### **🎨 Frontend Files (public/)**

#### **index.html** - Clean HTML Structure
- Semantic HTML5 markup
- External CSS and JS file references
- Calculator interface with input validation
- MCP server status monitoring section

#### **style.css** - Modern Styling
- **Design Features:**
  - Gradient backgrounds and glassmorphism effects
  - Smooth animations and hover effects
  - Responsive layout with mobile support
  - Loading spinners and state-specific styling
  - Professional color scheme with accessibility
- **CSS Techniques:**
  - CSS Grid and Flexbox layouts
  - CSS animations and transitions
  - Custom properties (CSS variables)
  - Modern pseudo-selectors

#### **script.js** - Frontend Logic
- **API Communication:** Calls `http://localhost:3000/api/...` endpoints
- **Cross-origin ready:** Works from any frontend server (CORS handled)
- **Features:**
  - Async/await with proper error handling
  - Content-type validation for responses
  - Real-time result comparison between Express and MCP
  - Loading states and user feedback
  - Keyboard shortcuts (Enter to calculate)
  - Auto-focus management

### **🔧 Development & Testing Tools (tests/)**

#### **debug-script.js** - Enhanced Diagnostics
- **Smart Directory Detection:** Automatically finds project root
- **Comprehensive Checks:** Files, dependencies, imports, port conflicts
- **Navigation Assistance:** Shows exact commands for your current location
- **Issue Detection:** Warns about common problems (port conflicts, missing files)
- **Cross-Platform:** Works on Windows, macOS, and Linux

#### **client-test.js** - Direct MCP Communication Test
- **Direct MCP Testing:** Bypasses Express server to test MCP server directly
- **JSON-RPC Protocol:** Tests proper MCP communication protocol
- **Debugging Tool:** Helps isolate MCP vs Express issues
- **Simple Usage:** `node tests/client-test.js` to test MCP server independently

#### **test-server.js & simple-server.js** - Minimal Test Servers
- Stripped-down versions for isolating issues
- Help identify if problems are with Express setup or application logic
- Useful for debugging port conflicts and basic functionality

## 🎯 Key Improvements & Features

### **🔧 Technical Enhancements**
- **Port Management:** Switched from 63342 to 3000 to avoid PyCharm conflicts
- **Express 5.x Compatibility:** Fixed path-to-regexp issues with modern Express
- **Error Handling:** Comprehensive error catching at all levels
- **Process Management:** Proper cleanup and timeout handling for MCP communication

### **🎨 User Experience**
- **Modern UI:** Glassmorphism design with smooth animations
- **Real-time Feedback:** Loading states, error messages, and success indicators
- **Comparison Features:** Side-by-side results from Express vs MCP calculations
- **Accessibility:** Keyboard navigation, focus management, and semantic markup

### **🛠️ Developer Experience**
- **Smart Debugging:** Enhanced debug scripts that work from any directory
- **Comprehensive Logging:** Detailed console output for troubleshooting
- **Modular Structure:** Clean separation between frontend, backend, and tools
- **Easy Testing:** Multiple test servers for different debugging scenarios

## 🔍 Troubleshooting Guide

### **Common Issues & Solutions**

#### **404 Errors on All Routes**
```bash
# Check if another service is using the port
lsof -i :3000

# Run debug script to verify setup
node tests/debug-script.js

# Try minimal server first
node tests/simple-server.js
```

#### **MCP Communication Failures**
```bash
# Test MCP server directly (bypasses Express)
node tests/client-test.js

# Check MCP server independently
node mcp_server.js

# Verify Node.js version compatibility
node --version  # Should be v16+ for MCP SDK
```

#### **Port Conflicts**
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port in combined-app.js
# Change: const port = 3000;
# To: const port = 8000;
```

#### **Dependency Issues**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Verify versions
npm list express @modelcontextprotocol/sdk zod
```

## 🚀 Development Workflow

### **Traditional API Development (Recommended)**

#### **Step 1: Start API Server**
```bash
# Terminal 1: Start the Express API server
npm start
# Keep this running - provides all backend functionality
```

#### **Step 2: Develop Frontend**
Choose any frontend development method:

**PyCharm Users:**
```bash
# Right-click public/index.html → "Open in Browser"
# Instant reloads for HTML/CSS changes
# All API calls work automatically via CORS
```

**Cursor/VS Code Users:**
```bash
# Use Live Server extension
# Right-click public/index.html → "Open with Live Server"
# Get instant reloads + working API calls
```

**Command Line:**
```bash
# Terminal 2: Serve frontend files
cd public && python -m http.server 8000
# or: npx http-server public -p 8080
```

### **Development Workflow by Task**

#### **🎨 Frontend Development (HTML/CSS/JS):**
1. **Start API server:** `npm start` (keep running)
2. **Use any live server** for instant HTML/CSS reloads
3. **API calls work automatically** - no setup needed
4. **Test changes** immediately in browser

#### **🔧 Backend Development (API/MCP):**
1. **Modify `server.js` or `mcp_server.js`**
2. **Restart API server:** `npm start`
3. **Frontend automatically uses new API** (no frontend restart needed)
4. **Test with:** `node tests/client-test.js` for MCP-only testing

#### **🚀 Full-Stack Testing:**
1. **Run diagnostics:** `node tests/debug-script.js`
2. **API server:** `npm start`
3. **Any frontend server** for the HTML interface
4. **Test integration** end-to-end

### **Benefits of This Architecture:**
- ✅ **True separation of concerns** - API and frontend independent
- ✅ **Use any frontend tooling** - PyCharm, Cursor, VS Code, etc.
- ✅ **CORS enabled** - no cross-origin issues
- ✅ **Production ready** - easily deployable API structure
- ✅ **Developer friendly** - choose your preferred frontend workflow

### **Adding New Features**
1. **Backend:** Add routes to `combined-app.js`
2. **MCP Tools:** Extend `mcp_server.js` with new tools
3. **Frontend:** Update `public/` files (HTML, CSS, JS)
4. **Testing:** Use debug scripts to verify functionality

### **Debugging Issues**
1. **Use debug script** to identify file/dependency problems: `node tests/debug-script.js`
2. **Test MCP directly** to isolate backend issues: `node tests/client-test.js`
3. **Check server logs** for detailed error information
4. **Test with minimal servers** to isolate issues: `node tests/simple-server.js`
5. **Verify ports and dependencies** before troubleshooting code

### **Development Environment Setup**

#### **For Live Server Users:**
If you want to use PyCharm or Cursor live server for faster frontend development:

1. **Create a development version** of `public/script.js`:
```javascript
// Add environment detection at the top
const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';

// Update all fetch calls to use API_BASE
async function calculate() {
  // ... existing code ...
  const response = await fetch(`${API_BASE}/add?a=${a}&b=${b}`);
  // ... rest of function
}

async function checkMCPStatus() {
  // ... existing code ...
  const response = await fetch(`${API_BASE}/mcp/tools`);
  // ... rest of function
}
```

2. **Development workflow:**
```bash
# Terminal 1: Keep Express API server running
node combined-app.js

# Terminal 2 or IDE: Use live server for frontend
# This gives you instant reloads for CSS/HTML changes
# while keeping full API functionality
```

#### **Port Reference:**
- **Express Server:** `http://localhost:3000` (recommended)
- **PyCharm Live Server:** `http://localhost:63342` (needs API_BASE setup)
- **Cursor Live Server:** `http://localhost:5500` (needs API_BASE setup)
- **VS Code Live Server:** `http://localhost:5501` (needs API_BASE setup)

This modular, well-documented structure makes the project easy to understand, maintain, and extend while providing robust debugging tools for development.