# 🔄 Express → FastAPI Migration Examples

Side-by-side comparison to help you transition from Express to FastAPI.

## 🔐 **Authentication Endpoint**

### **Express Version**
```javascript
// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, username, hashed_password, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.hashed_password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY, { expiresIn: '24h' });

    res.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username },
      token
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### **FastAPI Version**
```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import bcrypt
import jwt

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    success: bool
    user: dict
    token: str

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password
    if not bcrypt.checkpw(request.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    token = jwt.encode({"userId": user.id}, settings.SECRET_KEY, algorithm="HS256")
    
    return LoginResponse(
        success=True,
        user={"id": user.id, "email": user.email, "username": user.username},
        token=token
    )
```

**🎯 Key Differences:**
- **Validation**: FastAPI automatically validates email format
- **Type Safety**: Request/response models ensure data structure
- **Documentation**: FastAPI auto-generates interactive docs
- **Error Handling**: HTTPException vs manual status codes

---

## 🔧 **MCP Tool Integration**

### **Express Version**
```javascript
// POST /api/mcp/call
app.post('/api/mcp/call', async (req, res) => {
  try {
    const { tool, params } = req.body;
    const userId = req.user?.id || null;

    if (!tool || !params) {
      return res.status(400).json({ 
        error: 'Tool name and parameters are required' 
      });
    }

    const startTime = Date.now();

    // Call MCP server
    const mcpResponse = await axios.post(process.env.MCP_SERVER_URL, {
      jsonrpc: "2.0",
      id: `mcp_${Date.now()}`,
      method: tool,
      params
    });

    const executionTime = Date.now() - startTime;

    // Log tool usage
    await pool.query(
      'INSERT INTO tool_usage (tool_name, parameters, result, user_id, execution_time_ms, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [tool, JSON.stringify(params), JSON.stringify(mcpResponse.data.result), userId, executionTime, 'success']
    );

    res.json({
      success: true,
      result: mcpResponse.data.result,
      executionTime
    });

  } catch (error) {
    res.status(400).json({ 
      error: error.response?.data?.error?.message || 'MCP call failed'
    });
  }
});
```

### **FastAPI Version**
```python
from typing import Dict, Any, Optional
import httpx
import time

class MCPCallRequest(BaseModel):
    tool: str
    params: Dict[str, Any]

class MCPCallResponse(BaseModel):
    success: bool
    result: Any
    execution_time: int

@app.post("/api/mcp/call", response_model=MCPCallResponse)
async def call_mcp_tool(
    request: MCPCallRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.MCP_SERVER_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": f"mcp_{int(time.time())}",
                    "method": request.tool,
                    "params": request.params
                }
            )
            
        execution_time = int((time.time() - start_time) * 1000)
        
        # Log tool usage
        tool_usage = ToolUsage(
            tool_name=request.tool,
            parameters=request.params,
            result=response.json()["result"],
            user_id=current_user.id,
            execution_time_ms=execution_time,
            status="success"
        )
        db.add(tool_usage)
        db.commit()
        
        return MCPCallResponse(
            success=True,
            result=response.json()["result"],
            execution_time=execution_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**🎯 Key Differences:**
- **Type Hints**: Clear parameter and return types
- **Dependency Injection**: `Depends()` for user auth and database
- **Async HTTP**: `httpx` instead of `axios`
- **ORM Models**: SQLAlchemy models vs raw SQL

---

## 📊 **Database Operations**

### **Express Version**
```javascript
// GET /api/tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    let params = [req.user.id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      tasks: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### **FastAPI Version**
```python
from typing import Optional, List
from fastapi import Query

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

class TaskListResponse(BaseModel):
    success: bool
    tasks: List[TaskResponse]
    count: int

@app.get("/api/tasks", response_model=TaskListResponse)
async def get_tasks(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.user_id == current_user.id)
    
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    
    return TaskListResponse(
        success=True,
        tasks=tasks,
        count=len(tasks)
    )
```

**🎯 Key Differences:**
- **Query Validation**: Automatic validation of query parameters
- **ORM**: SQLAlchemy queries vs raw SQL
- **Response Models**: Automatic serialization and validation
- **Type Safety**: Return types guaranteed at compile time

---

## 🚀 **Migration Strategy**

### **Week 1-2: Master Express**
```javascript
// Focus on understanding these Express patterns:
- Middleware for authentication
- Error handling with try/catch
- Database queries with pg
- MCP integration with axios
- JWT token management
```

### **Week 3-4: Learn FastAPI Basics**
```python
# Parallel implementation - same endpoints, FastAPI syntax:
- Pydantic models for validation
- Dependency injection system
- SQLAlchemy ORM usage
- Async/await patterns
- HTTPException handling
```

### **Week 5-6: Advanced Features**
```python
# Add FastAPI-specific features:
- Automatic API documentation
- Background tasks
- WebSocket support
- Advanced dependency injection
- Better testing with pytest
```

### **Week 7+: Production Ready**
```python
# Production concerns:
- Database migrations with Alembic
- Logging and monitoring
- Security best practices
- Performance optimization
- Docker deployment
```

---

## 💡 **Learning Tips**

### **1. Run Both Simultaneously**
```yaml
# docker-compose.yml
services:
  express-backend:
    ports: ["8000:8000"]
  fastapi-backend:
    ports: ["8001:8000"]
```

Test the same endpoint on both:
- Express: `http://localhost:8000/api/auth/login`
- FastAPI: `http://localhost:8001/api/auth/login`

### **2. Compare API Documentation**
- **Express**: Manual documentation
- **FastAPI**: Auto-generated at `http://localhost:8001/docs`

### **3. Error Handling Comparison**
```javascript
// Express - Manual error responses
if (!email) {
  return res.status(400).json({ error: 'Email required' });
}
```

```python
# FastAPI - Automatic validation
class LoginRequest(BaseModel):
    email: EmailStr  # Automatically validates email format
    password: str
```

### **4. Database Patterns**
```javascript
// Express - Raw SQL
const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
```

```python
# FastAPI - ORM
user = db.query(User).filter(User.id == id).first()
```

---

## 🎯 **Why Both Are Valuable**

### **Express Strengths**
- ✅ **Speed**: Fast development for simple APIs
- ✅ **Flexibility**: Minimal opinions, maximum freedom
- ✅ **Ecosystem**: Huge npm package ecosystem
- ✅ **Real-time**: Excellent WebSocket support
- ✅ **Tools**: Perfect for MCP tool execution

### **FastAPI Strengths**
- ✅ **Type Safety**: Catch errors at development time
- ✅ **Documentation**: Auto-generated, always up-to-date
- ✅ **Validation**: Automatic request/response validation
- ✅ **Performance**: Comparable to Node.js performance
- ✅ **AI Ecosystem**: Better Python ML/AI library integration

### **Ideal Architecture**
```
Frontend (React)
    ↓
FastAPI (Main Business Logic)  ←→  Express (MCP Tools & Real-time)
    ↓                                    ↓
PostgreSQL                    ←→  Tool Execution & WebSockets
```

This gives you the **best of both worlds**!
