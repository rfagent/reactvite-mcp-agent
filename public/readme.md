# 🤖 MCP Web Agent

A web-based interface for running AI agents using the Model Context Protocol (MCP) with OpenAI's Agents SDK.

## 📋 Overview

This project provides a clean, modern web interface that allows users to interact with AI agents through a simple task-based system. The agent can perform various tasks like web research, content generation, and file creation.

## ✨ Features

- **Interactive Web Interface**: Clean, responsive design with gradient backgrounds and modern UI elements
- **Task Management**: Input custom tasks or select from pre-defined quick tasks
- **Real-time Status**: Live server connection status indicator
- **File Generation**: Download generated files directly from the interface
- **Error Handling**: Comprehensive error reporting with technical details
- **Loading States**: Visual feedback during task execution

## 🏗️ Architecture

### Frontend (Vanilla Web App)
- **HTML**: Semantic structure with modern form elements
- **CSS**: Modern styling with CSS Grid, Flexbox, and smooth animations
- **JavaScript**: Vanilla JS for DOM manipulation and API communication

### Backend Integration
- Communicates with a Node.js server running on `localhost:3000`
- RESTful API endpoints for agent execution and file serving
- Built on OpenAI Agents SDK + Model Context Protocol

## 📁 Project Structure

```
web_app/
├── index.html      # Main HTML structure
├── script.js       # Client-side JavaScript logic
└── style.css       # Modern CSS styling
```

## 🚀 Quick Start

### Prerequisites
- A Node.js backend server running on port 3000
- Modern web browser with JavaScript enabled

### Setup
1. Ensure your backend server is running on `http://localhost:3000`
2. Open `index.html` in your web browser
3. The interface will automatically check server connectivity

### Usage
1. **Enter a Task**: Type your request in the text area
2. **Quick Tasks**: Click pre-defined task buttons for common operations
3. **Run Agent**: Click the "🚀 Run Agent" button or press Enter
4. **View Results**: See agent output and download any generated files

## 🎯 Pre-defined Tasks

The interface includes several quick task options:

- **🍰 Find Recipe**: Search for recipes and generate markdown summaries
- **📰 AI News Summary**: Research latest AI developments and create reports
- **🐍 Python Frameworks**: Compare Python web frameworks in documentation
- **🔧 MCP Best Practices**: Document MCP server best practices

## 🛠️ Technical Details

### API Endpoints
- `GET /api/status` - Server health check
- `POST /api/agent/run` - Execute agent tasks
- `GET /files/*` - Serve generated files

### Request Format
```json
{
  "task": "Your task description here"
}
```

### Response Format
```json
{
  "success": true,
  "task": "Original task description",
  "output": "Agent execution output",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "files": [
    {
      "name": "filename.md",
      "path": "/files/filename.md",
      "size": 1024
    }
  ]
}
```

## 🎨 UI Features

### Design Elements
- **Gradient Background**: Purple-blue gradient with glassmorphism effects
- **Responsive Layout**: Mobile-friendly design with CSS Grid
- **Interactive Elements**: Hover effects and smooth transitions
- **Status Indicators**: Color-coded connection status (🟢🟡🔴)

### User Experience
- **Auto-resize Textarea**: Dynamically adjusts to content
- **Keyboard Shortcuts**: Enter to submit, Ctrl+Enter for new lines
- **Loading States**: Spinner animation during task execution
- **Smooth Scrolling**: Automatic scroll to results sections

## 🔧 Configuration

### Backend URL
Update the `API_BASE` constant in `script.js` to change the backend server URL:

```javascript
const API_BASE = 'http://localhost:3000';
```

### Styling Customization
Modify `style.css` to customize:
- Color schemes and gradients
- Layout breakpoints
- Animation timings
- Typography settings

## 📊 Status Indicators

- **🟢 Connected**: Server is responsive and ready
- **🟡 Warning**: Server responded but may have issues
- **🔴 Disconnected**: Cannot reach the server

## 🐛 Error Handling

The interface provides comprehensive error reporting:
- User-friendly error messages
- Expandable technical details
- Request/response logging in browser console
- Timestamp tracking for debugging

## 🌟 Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern mobile browsers

## 📝 Development Notes

### Code Style
- Vanilla JavaScript (no frameworks)
- Modern ES6+ features
- Async/await for API calls
- Clean separation of concerns

### File Organization
- Semantic HTML structure
- Modular CSS with clear naming
- Event-driven JavaScript architecture

## 🤝 Contributing

To extend this project:
1. Add new quick task buttons in the HTML
2. Implement corresponding handlers in JavaScript
3. Update styling in CSS as needed
4. Test across different browsers

## 📋 Todo/Future Enhancements

- [ ] Dark mode toggle
- [ ] Task history/favorites
- [ ] Drag-and-drop file uploads
- [ ] WebSocket real-time updates
- [ ] Progress bars for long-running tasks
- [ ] Export results in multiple formats

## 📄 License

This project uses the Model Context Protocol and OpenAI Agents SDK. Please refer to their respective licenses for usage terms.

---

**Powered by OpenAI Agents SDK + Model Context Protocol**