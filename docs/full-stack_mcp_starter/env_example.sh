# .env.example
# Copy this file to .env and update the values

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcp_starter
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mcp_starter
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# =============================================================================
# FASTAPI BACKEND CONFIGURATION
# =============================================================================
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# =============================================================================
# MCP SERVER CONFIGURATION
# =============================================================================
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_PORT=3001

# =============================================================================
# AI SERVICES API KEYS
# =============================================================================
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# =============================================================================
# FRONTEND CONFIGURATION
# =============================================================================
VITE_API_URL=http://localhost:8000
VITE_MCP_URL=http://localhost:3001

# =============================================================================
# REDIS CONFIGURATION (Optional)
# =============================================================================
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# =============================================================================
# DEVELOPMENT/PRODUCTION SETTINGS
# =============================================================================
ENVIRONMENT=development
DEBUG=true

# =============================================================================
# EMAIL CONFIGURATION (Optional)
# =============================================================================
SMTP_TLS=True
SMTP_PORT=587
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password