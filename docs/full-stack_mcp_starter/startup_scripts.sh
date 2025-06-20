#!/bin/bash
# start-dev.sh - Development startup script

echo "🚀 Starting Full-Stack MCP Development Environment"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copying from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env with your configuration and run again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Starting services with Docker Compose..."
docker-compose up -d postgres redis mcp-server

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "🗄️ Running database migrations..."
cd backend
python -m alembic upgrade head
cd ..

echo "🔧 Starting MCP server..."
docker-compose up -d mcp-server

echo "⚙️ Starting FastAPI backend..."
docker-compose up -d backend

echo "🎨 Starting React frontend..."
docker-compose up -d frontend

echo ""
echo "✅ All services started successfully!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   MCP Tools: http://localhost:3001/tools"
echo "   Database:  postgresql://postgres:postgres@localhost:5432/mcp_starter"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f [service_name]"
echo ""
echo "🛑 Stop all services:"
echo "   docker-compose down"