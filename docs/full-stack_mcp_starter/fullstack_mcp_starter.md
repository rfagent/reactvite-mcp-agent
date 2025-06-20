# 🚀 Full-Stack MCP Starter Project

A complete starter template combining **React + Express.js + PostgreSQL + MCP** for building AI-native applications. Includes optional FastAPI backend for learning Python web development.

## 🎯 **Choose Your Backend Path**

### **🚀 Path 1: Express.js (Recommended for Beginners)**
- **Familiar**: Build on existing Node.js knowledge
- **Fast Setup**: Get running quickly with Express
- **Complete**: Full authentication, MCP integration, database ops
- **Production Ready**: Scalable architecture with security

### **🐍 Path 2: Express + FastAPI (Learning Journey)**
- **Progressive**: Start with Express, learn FastAPI gradually
- **Comparison**: Run both backends simultaneously
- **Best of Both**: Express for tools, FastAPI for main API
- **Future-Proof**: Modern Python development skills

## 📦 Project Structure

```
fullstack-mcp-starter/
├── 🎨 frontend/                    # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── ⚙️ backend-express/             # Express.js + PostgreSQL (Primary)
│   ├── server.js                 # Main Express server
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── users.js              # User management
│   │   ├── mcp.js                # MCP integration
│   │   └── tasks.js              # Task management
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── validation.js         # Input validation
│   ├── config/
│   │   └── database.js           # PostgreSQL connection
│   ├── package.json
│   └── Dockerfile
├── ⚙️ backend-fastapi/             # FastAPI + PostgreSQL (Optional)
│   ├── app/
│   │   ├── api/                   # API routes
│   │   ├── core/                  # Config, auth, database
│   │   ├── models/                # SQLAlchemy models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── services/              # Business logic
│   │   └── main.py               # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── 🔧 mcp-server/                  # MCP Tools Server
│   ├── tools/
│   │   ├── database.js           # DB operations
│   │   ├── calculator.js         # Math operations
│   │   └── ai-assistant.js       # AI integrations
│   ├── server.js
│   └── package.json
├── 🤖 agents/                      # AI Agents & Workflows
│   ├── langchain_agent.py        # LangChain integration
│   ├── openai_agent.py           # OpenAI function calling
│   └── workflows/
├── 🐳 docker/                      # Docker configurations
│   ├── docker-compose.yml
│   ├── postgres/
│   └── nginx/
├── 📚 docs/                        # Documentation
├── 🧪 tests/                       # Test suites
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone and Setup Environment

```bash
git clone <your-repo>
cd fullstack-mcp-starter
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start with Docker (Recommended)

```bash
docker-compose up -d
```

This starts:
- ✅ PostgreSQL database (port 5432)
- ✅ Express.js backend (port 8000)
- ✅ React frontend (port 3000)
- ✅ MCP server (port 3001)
- ✅ Nginx reverse proxy (port 80)

### 3. Manual Setup - Express Backend (Development)

#### Express Backend Setup
```bash
cd backend-express
npm install
npm run dev
# Runs on http://localhost:8000
```

#### FastAPI Backend Setup (Optional)
```bash
cd backend-fastapi
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001
# Runs on http://localhost:8001
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### MCP Server Setup
```bash
cd mcp-server
npm install
npm start
```

#### Database Setup
```bash
# Using Docker
docker run --name postgres-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15

# Or install PostgreSQL locally
```

---

## 🔧 Configuration

### Environment Variables (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcp_starter
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mcp_starter

# FastAPI (Optional - for learning Python web development)
FASTAPI_PORT=8001

# Backend Choice - Express is default
PRIMARY_BACKEND=express  # Options: express, fastapi, both

# MCP Server
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_PORT=3001

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Frontend
VITE_API_URL=http://localhost:8000
VITE_MCP_URL=http://localhost:3001
```

---

## 📁 Detailed File Structure

### Frontend (`frontend/`)

```javascript
// package.json
{
  "name": "mcp-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "react-query": "^3.39.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.0.0",
    "tailwindcss": "^3.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@vitejs/plugin-react": "^3.1.0",
    "vite": "^4.1.0"
  }
}
```

```jsx
// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MCPTools from './pages/MCPTools';
import DataManagement from './pages/DataManagement';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tools" element={<MCPTools />} />
            <Route path="/data" element={<DataManagement />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
```

```jsx
// src/pages/MCPTools.jsx
import React, { useState } from 'react';
import { useMCPTools } from '../hooks/useMCPTools';

function MCPTools() {
  const [input, setInput] = useState('');
  const { callTool, loading, result, error } = useMCPTools();

  const handleCalculate = async () => {
    await callTool('calculator', { expression: input });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">MCP Tools</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Calculator Tool</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter math expression (e.g., 2 + 3 * 4)"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
        
        {result && (
          <div className="mt-4 p-4 bg-green-50 rounded-md">
            <strong>Result:</strong> {result}
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-md text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default MCPTools;
```

```javascript
// src/hooks/useMCPTools.js
import { useState } from 'react';
import axios from 'axios';

export function useMCPTools() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const callTool = async (toolName, params) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/mcp/call', {
        tool: toolName,
        params
      });
      setResult(response.data.result);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { callTool, loading, result, error };
}
```

### Backend (`backend-express/`)

```javascript
// package.json
{
  "name": "mcp-express-backend",
  "private": true,
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "axios": "^1.6.0",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

```javascript
// server.js - Main Express Server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userResult = await pool.query(
      'SELECT id, email, username FROM users WHERE id = $1',
      [decoded.userId]
    );
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    const isValid = await bcrypt.compare(password, user.hashed_password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);
    
    res.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// MCP Integration
app.post('/api/mcp/call', async (req, res) => {
  try {
    const { tool, params } = req.body;
    
    const mcpResponse = await axios.post(
      process.env.MCP_SERVER_URL || 'http://localhost:3001',
      {
        jsonrpc: "2.0",
        id: "1",
        method: tool,
        params
      }
    );
    
    res.json({
      success: true,
      result: mcpResponse.data.result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(8000, () => {
  console.log('🚀 Express server running on http://localhost:8000');
});
```

### MCP Server (`mcp-server/`)

```javascript
// server.js
const http = require('http');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'mcp_starter',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
});

// Available tools
const tools = {
  calculator: require('./tools/calculator'),
  database: require('./tools/database'),
  'ai-assistant': require('./tools/ai-assistant')
};

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools: Object.keys(tools) }));
    return;
  }

  if (req.method === 'POST') {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', async () => {
      try {
        const { id, method, params } = JSON.parse(data);
        
        if (!tools[method]) {
          throw new Error(`Unknown tool: ${method}`);
        }

        const result = await tools[method](params, pool);
        
        const response = {
          jsonrpc: "2.0",
          id,
          result
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        const response = {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: error.message
          }
        };

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      }
    });
  }
});

const PORT = process.env.MCP_SERVER_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔧 MCP Server running on http://localhost:${PORT}`);
});
```

```javascript
// tools/calculator.js
module.exports = function calculator(params) {
  const { expression } = params;
  
  // Basic safety check - only allow numbers, operators, and parentheses
  if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
    throw new Error('Invalid expression: only numbers and basic operators allowed');
  }
  
  try {
    // Use Function constructor for safer evaluation
    const result = Function(`"use strict"; return (${expression})`)();
    return { result, expression };
  } catch (error) {
    throw new Error(`Calculation error: ${error.message}`);
  }
};
```

```javascript
// tools/database.js
module.exports = async function database(params, pool) {
  const { action, table, data, query } = params;
  
  switch (action) {
    case 'select':
      const selectResult = await pool.query(query || `SELECT * FROM ${table}`);
      return { rows: selectResult.rows, count: selectResult.rowCount };
      
    case 'insert':
      const columns = Object.keys(data).join(', ');
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const insertResult = await pool.query(
        `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return { inserted: insertResult.rows[0] };
      
    case 'update':
      const { id, ...updateData } = data;
      const updateColumns = Object.keys(updateData)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(', ');
      
      const updateResult = await pool.query(
        `UPDATE ${table} SET ${updateColumns} WHERE id = $1 RETURNING *`,
        [id, ...Object.values(updateData)]
      );
      return { updated: updateResult.rows[0] };
      
    case 'delete':
      const deleteResult = await pool.query(
        `DELETE FROM ${table} WHERE id = $1 RETURNING *`,
        [data.id]
      );
      return { deleted: deleteResult.rows[0] };
      
    default:
      throw new Error(`Unknown database action: ${action}`);
  }
};
```

```json
// package.json
{
  "name": "mcp-server",
  "version": "1.0.0",
  "description": "MCP Tools Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### Docker Setup (`docker/`)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mcp_starter
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  # FastAPI Backend
  backend:
    build: 
      context: ../backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/mcp_starter
      MCP_SERVER_URL: http://mcp-server:3001
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - mcp-server
    volumes:
      - ../backend:/app

  # MCP Server
  mcp-server:
    build:
      context: ../mcp-server
      dockerfile: Dockerfile
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mcp_starter
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  # React Frontend
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: http://localhost:8000
      VITE_MCP_URL: http://localhost:3001
    ports:
      - "3000:3000"
    volumes:
      - ../frontend:/app
      - /app/node_modules

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
```

### AI Agents (`agents/`)

```python
# langchain_agent.py
from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
import requests
import os

class MCPLangChainAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4", temperature=0)
        self.mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:3001")
        self.tools = self._create_tools()
        self.agent = initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=True
        )

    def _create_tools(self):
        def call_calculator(expression: str) -> str:
            """Calculate mathematical expressions."""
            response = requests.post(
                self.mcp_url,
                json={
                    "jsonrpc": "2.0",
                    "id": "1",
                    "method": "calculator",
                    "params": {"expression": expression}
                }
            )
            result = response.json()
            return f"Result: {result['result']['result']}"

        def query_database(query: str) -> str:
            """Query the database."""
            response = requests.post(
                self.mcp_url,
                json={
                    "jsonrpc": "2.0",
                    "id": "1",
                    "method": "database",
                    "params": {
                        "action": "select",
                        "query": query
                    }
                }
            )
            result = response.json()
            return f"Query result: {result['result']}"

        return [
            Tool(
                name="calculator",
                func=call_calculator,
                description="Calculate mathematical expressions"
            ),
            Tool(
                name="database",
                func=query_database,
                description="Query the database with SQL"
            )
        ]

    def chat(self, message: str):
        return self.agent.invoke(message)

# Usage
if __name__ == "__main__":
    agent = MCPLangChainAgent()
    response = agent.chat("What is 25 * 17?")
    print(response)
```

---

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# MCP server tests
cd mcp-server
npm test
```

### Example Test Files

```python
# backend/tests/test_mcp.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_mcp_calculator():
    response = client.post(
        "/api/mcp/call",
        json={"tool": "calculator", "params": {"expression": "2 + 3"}}
    )
    assert response.status_code == 200
    assert response.json()["success"] == True
    assert response.json()["result"]["result"] == 5
```

---

## 📚 Learning Path

### 1. **Beginner**: Start with Express
- ✅ Set up Express backend with PostgreSQL
- ✅ Create a simple calculator tool  
- ✅ Build a basic React interface
- ✅ Learn MCP protocol fundamentals

### 2. **Intermediate**: Add Features
- ✅ Implement user authentication with JWT
- ✅ Add database operations via MCP
- ✅ Create task management system
- ✅ Build AI agents with LangChain

### 3. **Advanced**: Scale and Learn FastAPI
- ✅ Add FastAPI backend alongside Express
- ✅ Compare Express vs FastAPI approaches
- ✅ Implement complex workflows
- ✅ Deploy to production with Docker

---

## 🔍 Key Concepts

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Frontend** | User interface | React + Vite + Tailwind |
| **Backend** | API & business logic | Express.js + PostgreSQL |
| **MCP Server** | Tool execution | Node.js + JSON-RPC |
| **AI Agents** | Intelligent automation | LangChain + OpenAI |
| **Database** | Data persistence | PostgreSQL |
| **Optional** | Python API learning | FastAPI + SQLAlchemy |

---

## 🚀 Next Steps

1. **Clone this structure** into your project
2. **Customize the tools** for your specific use case
3. **Add authentication** and user management
4. **Implement real AI workflows** with your domain logic
5. **Deploy to production** using Docker containers

This starter gives you a solid foundation for building modern AI-native applications with the flexibility to add your own tools and workflows!