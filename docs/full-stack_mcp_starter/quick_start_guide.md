# 🚀 Quick Start Guide

Get your Full-Stack MCP application running in under 10 minutes! Choose between **Express.js** (recommended for beginners) or **FastAPI** (for Python developers).

## 📋 Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js 18+** (for local development)
- **Python 3.11+** (for FastAPI option)
- **Git** installed

## 🎯 Choose Your Backend Path

### **🟢 Path 1: Express.js Backend (Recommended)**
- **Familiar**: Build on existing Node.js knowledge
- **Fast Setup**: Get running quickly with Express
- **Complete**: Full authentication, MCP integration, database ops
- **Production Ready**: Scalable architecture with security

### **🐍 Path 2: FastAPI Backend (Python Option)**
- **Modern**: Type-safe Python API development
- **Auto-docs**: Swagger documentation generated automatically
- **Performance**: High-performance async framework
- **AI-Ready**: Better integration with Python ML libraries

---

## ⚡ 5-Minute Setup (Express.js)

### 1. Clone and Configure (Express Path)

```bash
# Create your project directory
mkdir my-mcp-app && cd my-mcp-app

# Copy the starter files (you'll create these from the artifacts above)
# Set up environment for Express
cp .env.example .env
# Edit .env - set PRIMARY_BACKEND=express (default)
```

### 2. Start Everything with Docker (Express)

```bash
# Make the startup script executable
chmod +x start-express.sh

# Start all services (Express + React + MCP + PostgreSQL)
./start-express.sh
```

Or manually:

```bash
# Start Express-based stack
docker-compose -f docker-compose.express.yml up -d

# Check status
docker-compose ps
```

### 3. Verify Express Installation

Open your browser and check:

- ✅ **Frontend**: http://localhost:3000
- ✅ **Express Backend**: http://localhost:8000
- ✅ **Express Health**: http://localhost:8000/health
- ✅ **MCP Tools**: http://localhost:3001/tools

---

## ⚡ 5-Minute Setup (FastAPI Option)

### 1. Clone and Configure (FastAPI Path)

```bash
# Create your project directory
mkdir my-mcp-app && cd my-mcp-app

# Set up environment for FastAPI
cp .env.example .env
# Edit .env - set PRIMARY_BACKEND=fastapi
```

### 2. Start Everything with Docker (FastAPI)

```bash
# Start FastAPI-based stack
docker-compose -f docker-compose.fastapi.yml up -d

# Check status
docker-compose ps
```

### 3. Verify FastAPI Installation

Open your browser and check:

- ✅ **Frontend**: http://localhost:3000
- ✅ **FastAPI Backend**: http://localhost:8000
- ✅ **API Docs**: http://localhost:8000/docs (auto-generated!)
- ✅ **MCP Tools**: http://localhost:3001/tools

---

## 🏗️ Project Structure Setup

Create this directory structure (choose your backend):

```
my-mcp-app/
├── .env                           # Environment config
├── .env.example                   # Environment template
├── docker-compose.express.yml     # Express + Docker setup
├── docker-compose.fastapi.yml     # FastAPI + Docker setup
├── start-express.sh               # Express startup script
├── start-fastapi.sh               # FastAPI startup script
├── README.md
├── 
├── 🎨 frontend/                    # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.jsx      # Main navigation
│   │   │   └── ProtectedRoute.jsx  # Route protection
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Main dashboard
│   │   │   ├── Login.jsx           # Login form
│   │   │   ├── Register.jsx        # Registration form
│   │   │   ├── Tasks.jsx           # Task management
│   │   │   ├── MCPTools.jsx        # MCP tools interface
│   │   │   └── Profile.jsx         # User profile
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx     # Authentication state
│   │   ├── utils/
│   │   │   └── api.js              # API client
│   │   ├── App.jsx                 # Main app component
│   │   └── main.jsx               # React entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── 
├── ⚙️ backend-express/             # Express.js Backend (Path 1)
│   ├── server.js                   # Main Express server
│   ├── routes/
│   │   ├── auth.js                 # Authentication endpoints
│   │   ├── users.js                # User management
│   │   ├── tasks.js                # Task operations
│   │   └── mcp.js                  # MCP integration
│   ├── middleware/
│   │   ├── auth.js                 # JWT authentication
│   │   ├── validation.js           # Input validation
│   │   └── rateLimiting.js         # Rate limiting
│   ├── config/
│   │   └── database.js             # PostgreSQL connection
│   ├── tests/
│   │   ├── auth.test.js            # Authentication tests
│   │   ├── tasks.test.js           # Task management tests
│   │   └── mcp.test.js             # MCP integration tests
│   ├── package.json
│   └── Dockerfile
├── 
├── 🐍 backend-fastapi/             # FastAPI Backend (Path 2 - Optional)
│   ├── app/
│   │   ├── api/                    # API routes
│   │   ├── core/                   # Config, auth, database
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/               # Business logic
│   │   └── main.py                # FastAPI app
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
├── 
├── 🔧 mcp-server/                  # MCP Tools Server (Node.js)
│   ├── tools/
│   │   ├── calculator.js           # Math operations
│   │   ├── database.js             # Database operations
│   │   └── ai-assistant.js         # AI integrations
│   ├── server.js                   # JSON-RPC server
│   ├── package.json
│   └── Dockerfile
├── 
├── 🤖 agents/                      # AI Agents & Workflows
│   ├── langchain_agent.py          # LangChain integration
│   ├── openai_agent.py             # OpenAI function calling
│   ├── workflows/
│   │   └── task_automation.py      # Task automation
│   └── requirements.txt
├── 
├── 🐳 docker/                      # Docker configurations
│   ├── postgres/
│   │   ├── init.sql                # Database schema
│   │   └── docker-entrypoint-initdb.d/
│   ├── nginx/                      # Nginx configuration
│   │   ├── nginx.conf              # Development config
│   │   └── nginx.prod.conf         # Production config
│   └── monitoring/                 # Monitoring setup
├── 
├── 📚 scripts/                     # Utility scripts
│   ├── setup-development.sh       # Development setup
│   ├── validate-setup.sh          # Setup validation
│   ├── backup.sh                  # Database backup
│   └── restore.sh                 # Database restore
├── 
└── 📄 docs/                        # Documentation
```

---

## 🔧 Configuration

### Environment Variables (.env)
```env
# ===== BACKEND CHOICE =====
PRIMARY_BACKEND=express           # Options: express, fastapi, both

# ===== DATABASE CONFIGURATION =====
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcp_starter
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mcp_starter
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# ===== EXPRESS.JS CONFIGURATION =====
# JWT and security
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
PORT=8000

# CORS and security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# ===== FASTAPI CONFIGURATION (Optional) =====
FASTAPI_PORT=8001                 # Different port if running both
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ===== MCP SERVER CONFIGURATION =====
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_PORT=3001

# ===== FRONTEND CONFIGURATION =====
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:8000
VITE_MCP_URL=http://localhost:3001

# ===== AI SERVICES (Optional) =====
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# ===== REDIS CONFIGURATION (Optional) =====
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# ===== EMAIL CONFIGURATION (Optional) =====
SMTP_TLS=True
SMTP_PORT=587
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 🛠️ Development Workflow

### Express.js Development (Recommended Path)

#### 1. Database Setup
```bash
# Option A: Docker (Recommended)
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mcp_starter \
  -p 5432:5432 -d postgres:15

# Option B: Local PostgreSQL installation
createdb mcp_starter
psql mcp_starter < docker/postgres/init.sql
```

#### 2. Express Backend Setup
```bash
cd backend-express
npm install
npm run dev
# Server runs on http://localhost:8000
```

#### 3. MCP Server Setup
```bash
cd mcp-server
npm install
npm start
# MCP server runs on http://localhost:3001
```

#### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### FastAPI Development (Alternative Path)

#### 1. FastAPI Backend Setup
```bash
cd backend-fastapi
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
# API runs on http://localhost:8000
# Docs at http://localhost:8000/docs
```

#### 2. Continue with MCP Server and Frontend (same as Express path)

---

## 🧪 Test Your Setup

### 1. Test MCP Tools (Both Backends)
```bash
# Test calculator tool directly
curl -X POST http://localhost:3001 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"calculator","params":{"expression":"2+3*4"}}'

# Expected response: {"jsonrpc":"2.0","id":"1","result":{"result":14,"expression":"2+3*4"}}
```

### 2. Test Express Backend
```bash
# Check health
curl http://localhost:8000/health

# Test authentication (register)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Test123!"}'

# Test MCP integration via Express
curl -X POST http://localhost:8000/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool":"calculator","params":{"expression":"5*7"}}'
```

### 3. Test FastAPI Backend (if using FastAPI)
```bash
# Check health
curl http://localhost:8000/health

# View auto-generated docs
open http://localhost:8000/docs

# Test MCP integration via FastAPI
curl -X POST http://localhost:8000/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool":"calculator","params":{"expression":"5*7"}}'
```

### 4. Test Frontend
- Open http://localhost:3000
- Try user registration/login
- Test the calculator interface
- Check the network tab for API calls

---

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000  # or :8000, :3001, :5432

# Kill the process
kill -9 <PID>
```

**Database Connection Issues**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs mcp_postgres

# Test connection
psql -h localhost -U postgres -c "SELECT 1"
```

**Express Server Not Starting**
```bash
# Check Express logs
cd backend-express
npm run dev

# Check for missing dependencies
npm install

# Check environment variables
cat .env
```

**MCP Server Not Responding**
```bash
# Check MCP server logs
docker logs mcp_server

# Test direct connection
curl http://localhost:3001/tools

# Restart MCP server
cd mcp-server
npm start
```

**Frontend Build Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check environment variables
cat .env | grep VITE
```

**FastAPI Issues** (if using FastAPI)
```bash
# Check Python version
python --version  # Should be 3.11+

# Activate virtual environment
source venv/bin/activate

# Check dependencies
pip list

# Run migrations
alembic upgrade head
```

---

## 📚 Next Steps

### 🟢 Express.js Learning Path
1. **Master Express Basics**: Authentication, middleware, error handling
2. **Customize MCP Tools**: Edit `mcp-server/tools/` to add your own tools
3. **Add Advanced Features**: Real-time updates, file uploads, caching
4. **Scale with Docker**: Production deployment and monitoring

### 🐍 FastAPI Learning Path (Optional)
1. **Learn FastAPI Basics**: Pydantic models, dependency injection
2. **Compare with Express**: Run both backends simultaneously
3. **Add Python ML Features**: Integrate scikit-learn, pandas, etc.
4. **Advanced FastAPI**: Background tasks, WebSockets, testing

### 🔄 Migration Path (Express → FastAPI)
1. **Week 1-2**: Master Express setup and MCP integration
2. **Week 3-4**: Learn FastAPI basics alongside Express
3. **Week 5-6**: Migrate specific features to FastAPI
4. **Week 7+**: Choose optimal architecture for your needs

---

## 🔗 Useful Commands

### Express Development
```bash
# View Express logs
cd backend-express
npm run dev

# Run Express tests
npm test

# Check Express routes
curl http://localhost:8000/api/health
```

### FastAPI Development
```bash
# Start FastAPI with reload
uvicorn app.main:app --reload

# Run FastAPI tests
pytest

# Generate new migration
alembic revision --autogenerate -m "description"
```

### Docker Commands
```bash
# View all running services
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart a service
docker-compose restart [service_name]

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# Access database directly
docker exec -it mcp_postgres psql -U postgres -d mcp_starter
```

---

## 🎯 Key Features to Explore

### Express.js Features
- **JWT Authentication** with secure password handling
- **Rate Limiting** and CORS protection
- **Input Validation** with express-validator
- **Database Operations** with PostgreSQL
- **MCP Integration** for tool execution
- **Error Handling** and logging

### FastAPI Features (if using)
- **Type Safety** with Pydantic models
- **Auto-Generated Docs** at `/docs`
- **Dependency Injection** system
- **SQLAlchemy ORM** integration
- **Background Tasks** and WebSockets
- **Testing** with pytest

### Common Features (Both Backends)
- **Calculator Tool**: Basic math operations via MCP
- **Database Operations**: CRUD operations through MCP tools
- **AI Agent Integration**: LangChain + OpenAI function calling
- **Task Management**: Complete task CRUD with categories
- **User Management**: Registration, authentication, profiles
- **Real-time Updates**: WebSocket support for live data

---

## 🚀 Default Login Credentials

After setup, you can login with:
- **Email**: admin@example.com
- **Password**: admin123!

Or register a new account through the frontend interface.

---

You're now ready to build your own AI-native applications! 🚀

**Choose Express.js** for familiar Node.js development and fast setup.
**Choose FastAPI** for modern Python development and advanced type safety.
**Use Both** for learning and comparison purposes.
