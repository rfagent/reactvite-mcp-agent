# MCP Full-Stack Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-%5E18.2.0-blue)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

A production-ready full-stack web application implementing the Model Context Protocol (MCP) with Express.js backend, React frontend, and AI agent integration.

## 🎯 Overview

This application demonstrates a complete implementation of the Model Context Protocol, featuring:

- **Modern Web Architecture**: Express.js REST API with React frontend
- **MCP Protocol Integration**: JSON-RPC server with extensible tools
- **AI Agent Support**: LangChain integration for intelligent workflows
- **Production Ready**: Docker containerization with PostgreSQL database
- **Security First**: JWT authentication, input validation, and rate limiting

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Express.js API │    │   PostgreSQL    │
│   (Port 3000)   │◄──►│   (Port 8000)   │◄──►│   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   MCP Server    │    │   AI Agents     │
                       │   (Port 3001)   │◄──►│   (Python)      │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure registration and login with JWT tokens
- **Task Management**: Complete CRUD operations for personal task tracking
- **MCP Tools Integration**: 
  - Calculator with expression evaluation
  - Database operations (SELECT, INSERT, UPDATE, DELETE)
  - AI Assistant powered by OpenAI GPT models

### Advanced Features
- **Real-time Dashboard**: Statistics and analytics visualization
- **Usage Tracking**: Monitor tool usage and performance metrics
- **Automated Workflows**: AI-powered task analysis and recommendations
- **RESTful API**: Comprehensive endpoints with OpenAPI documentation

### Security & Performance
- **Authentication**: JWT-based secure access control
- **Input Validation**: Comprehensive data sanitization
- **Rate Limiting**: DDoS protection and abuse prevention
- **CORS Protection**: Configurable cross-origin resource sharing
- **Health Monitoring**: Service health checks and metrics

## 🛠️ Technology Stack

### Backend
- **Express.js 4.18+**: Web application framework
- **PostgreSQL 15**: Primary database with ACID compliance
- **Node.js 18+**: Runtime environment
- **JWT**: Stateless authentication tokens
- **Bcrypt**: Secure password hashing

### Frontend
- **React 18**: Modern UI library with hooks
- **React Router 6**: Client-side routing
- **Tailwind CSS 3**: Utility-first styling framework
- **Axios**: HTTP client for API communication
- **React Hot Toast**: User notification system

### MCP & AI Integration
- **Custom MCP Server**: JSON-RPC 2.0 compliant tool server
- **LangChain**: AI agent framework for complex workflows
- **OpenAI API**: GPT integration for natural language processing
- **Python 3.11+**: AI agent runtime

### DevOps & Infrastructure
- **Docker & Docker Compose**: Containerization and orchestration
- **Nginx**: Reverse proxy and load balancer
- **PostgreSQL**: Persistent data storage
- **Jest**: Testing framework
- **ESLint**: Code quality enforcement

## 📋 Prerequisites

- **Docker & Docker Compose**: For containerized deployment
- **Node.js 18+**: For local development
- **Python 3.11+**: For AI agent functionality
- **PostgreSQL 15**: Database server (or use Docker)

## ⚡ Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd mcp-fullstack-app

# Configure environment
cp .env.example .env
# Edit .env file with your configuration

# Start all services
chmod +x start-express.sh
./start-express.sh

# Verify deployment
./scripts/validate-setup.sh
```

### Option 2: Manual Development Setup

```bash
# 1. Start PostgreSQL
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mcp_starter \
  -p 5432:5432 -d postgres:15

# 2. Setup and start MCP server
cd mcp-server
npm install
npm start &

# 3. Setup and start Express backend
cd ../backend-express
npm install
npm run dev &

# 4. Setup and start React frontend
cd ../frontend
npm install
npm run dev
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcp_starter
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mcp_starter

# Authentication
SECRET_KEY=your-super-secret-key-change-in-production
JWT_EXPIRATION=24h

# MCP Server
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_PORT=3001

# API Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Frontend
VITE_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
PORT=8000
```

### Database Schema

The application automatically creates the following tables:
- `users`: User accounts and authentication
- `tasks`: Personal task management
- `tool_usage`: MCP tool usage tracking
- `calculations`: Calculator tool results

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/api/auth/register` | Register new user | None |
| POST | `/api/auth/login` | User login | None |
| GET | `/api/auth/me` | Get current user | Required |
| POST | `/api/auth/refresh` | Refresh JWT token | Required |

### Task Management

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/api/tasks` | List user tasks | Required |
| POST | `/api/tasks` | Create new task | Required |
| GET | `/api/tasks/:id` | Get specific task | Required |
| PUT | `/api/tasks/:id` | Update task | Required |
| DELETE | `/api/tasks/:id` | Delete task | Required |
| GET | `/api/tasks/stats/summary` | Task statistics | Required |

### MCP Integration

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/api/mcp/call` | Execute MCP tool | Optional |
| GET | `/api/mcp/tools` | List available tools | None |
| GET | `/api/mcp/usage` | Usage history | Required |
| GET | `/api/mcp/stats` | Usage statistics | Required |

### Example API Calls

**Register a new user:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "newuser",
    "password": "SecurePass123!"
  }'
```

**Call MCP calculator tool:**
```bash
curl -X POST http://localhost:8000/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "calculator",
    "params": {
      "expression": "25 * 17 + 100"
    }
  }'
```

## 🔧 MCP Tools Reference

### Calculator Tool
Performs mathematical calculations with safety validation.

```javascript
{
  "tool": "calculator",
  "params": {
    "expression": "2 + 3 * 4"  // Result: 14
  }
}
```

### Database Tool
Direct database operations with CRUD support.

```javascript
{
  "tool": "database",
  "params": {
    "action": "select",
    "table": "tasks",
    "where": {"status": "completed"}
  }
}
```

### AI Assistant Tool
Natural language processing using OpenAI models.

```javascript
{
  "tool": "ai-assistant",
  "params": {
    "prompt": "Explain the MCP protocol briefly",
    "model": "gpt-3.5-turbo",
    "maxTokens": 150
  }
}
```

## 🤖 AI Agent Integration

### LangChain Agent

```python
from agents.langchain_agent import MCPLangChainAgent

# Initialize agent
agent = MCPLangChainAgent()

# Execute complex queries
response = agent.chat("Calculate 25 * 17 and create a task to review the result")
print(response)
```

### Automated Workflows

```python
from agents.workflows.task_automation import TaskAutomationWorkflow

# Setup automated task analysis
workflow = TaskAutomationWorkflow()
workflow.authenticate("user@example.com", "password")

# Run daily summary
summary = await workflow.daily_summary()

# Analyze overdue tasks
analysis = await workflow.analyze_overdue_tasks()
```

## 🧪 Testing

### Running Tests

```bash
# Backend API tests
cd backend-express
npm test

# Run with coverage
npm run test:coverage

# Frontend tests
cd ../frontend
npm test

# MCP server tests
cd ../mcp-server
npm test
```

### Manual Testing

```bash
# Health check
curl http://localhost:8000/health

# API documentation
curl http://localhost:8000/api/docs

# MCP tools list
curl http://localhost:3001/tools
```

## 🚀 Production Deployment

### Docker Production Setup

```bash
# Build and deploy production containers
docker-compose -f docker-compose.prod.yml up -d

# Enable SSL/HTTPS
# 1. Add SSL certificates to docker/nginx/ssl/
# 2. Update nginx configuration
# 3. Restart nginx container
```

### Environment Configuration

For production deployment:

```env
NODE_ENV=production
SECRET_KEY=your-production-secret-key
DATABASE_URL=your-production-database-url
FRONTEND_URL=https://yourdomain.com
```

### Monitoring Setup

```bash
# Start monitoring stack
cd docker/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards:
# - Grafana: http://localhost:3001 (admin/admin)
# - Prometheus: http://localhost:9090
# - Kibana: http://localhost:5601
```

## 🔒 Security Considerations

### Authentication Security
- JWT tokens with configurable expiration
- Secure password hashing with bcrypt (12 rounds)
- Rate limiting on authentication endpoints

### API Security
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- XSS protection with security headers
- CORS configuration for allowed origins

### Production Security
- SSL/TLS encryption ready
- Security headers (HSTS, CSP, etc.)
- Database connection encryption
- Environment-based secrets management

## 📊 Monitoring & Observability

### Health Checks
- `/health` endpoint for service monitoring
- Database connectivity verification
- MCP server status validation

### Metrics Collection
- API request/response metrics
- Database performance monitoring
- Tool usage analytics
- Error rate tracking

### Logging
- Structured application logging
- Access log analysis
- Error tracking and alerting
- Performance monitoring

## 🛠️ Development Guidelines

### Project Structure
```
├── backend-express/        # Express.js API server
│   ├── routes/            # API route definitions
│   ├── middleware/        # Custom middleware
│   ├── config/           # Configuration files
│   └── tests/            # API tests
├── frontend/             # React frontend application
│   ├── src/components/   # React components
│   ├── src/pages/       # Page components
│   ├── src/contexts/    # React contexts
│   └── src/utils/       # Utility functions
├── mcp-server/          # MCP tools server
│   ├── tools/           # Individual MCP tools
│   └── server.js        # JSON-RPC server
├── agents/              # AI agents and workflows
├── docker/              # Docker configurations
├── scripts/             # Utility scripts
└── docs/               # Documentation
```

### Adding New Features

1. **New MCP Tool**: Add to `mcp-server/tools/`
2. **API Endpoint**: Add to `backend-express/routes/`
3. **Frontend Component**: Add to `frontend/src/components/`
4. **AI Workflow**: Add to `agents/workflows/`

### Code Quality
- ESLint for JavaScript code quality
- Jest for comprehensive testing
- Prettier for code formatting
- Docker for consistent environments

## 🔄 Backup & Recovery

### Automated Backups

```bash
# Create backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backup_name
```

### Manual Database Backup

```bash
# Export database
docker exec mcp_postgres pg_dump -U postgres mcp_starter > backup.sql

# Import database
docker exec -i mcp_postgres psql -U postgres mcp_starter < backup.sql
```

## 🆘 Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Find process using port
lsof -i :8000
# Kill process
kill -9 <PID>
```

**Database Connection**
```bash
# Check PostgreSQL status
docker logs mcp_postgres
# Test connection
psql -h localhost -U postgres -c "SELECT 1"
```

**MCP Server Issues**
```bash
# Check MCP server logs
docker logs mcp_server
# Test MCP endpoints
curl http://localhost:3001/tools
```

### Getting Help

1. Check the logs: `docker-compose logs [service_name]`
2. Run diagnostics: `./scripts/validate-setup.sh`
3. Review documentation in `/docs` directory
4. Check GitHub issues for known problems

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Setup development environment
./scripts/setup-development.sh

# Run in development mode
npm run dev  # (in each service directory)
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the Model Context Protocol specification
- [Express.js](https://expressjs.com/) community
- [React](https://reactjs.org/) team
- [LangChain](https://langchain.com/) developers
- Open source contributors worldwide

## 📞 Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues tab
- **Discussions**: GitHub Discussions
- **Email**: support@yourproject.com

---

**Built with ❤️ for the MCP community**

*Last updated: January 2025*