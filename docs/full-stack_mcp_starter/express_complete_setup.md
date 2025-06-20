#### MCP Integration Route (routes/mcp.js)
```javascript
const express = require('express');
const axios = require('axios');
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// MCP Server configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
const MCP_TIMEOUT = 30000; // 30 seconds

// Validation rules
const mcpCallValidation = [
  body('tool').trim().isLength({ min: 1, max: 50 }).withMessage('Tool name is required and must be 1-50 characters'),
  body('params').isObject().withMessage('Parameters must be an object')
];

const usageQueryValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('tool_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Tool name must be 1-50 characters'),
  query('status').optional().isIn(['success', 'error']).withMessage('Status must be success or error')
];

// Helper function to call MCP server
async function callMCPServer(method, params) {
  const requestData = {
    jsonrpc: "2.0",
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    method,
    params: params || {}
  };

  try {
    const response = await axios.post(MCP_SERVER_URL, requestData, {
      timeout: MCP_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.error) {
      throw new Error(response.data.error.message || 'MCP server error');
    }

    return response.data.result;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('MCP server is not available. Please check if the MCP server is running.');
    }
    if (error.code === 'ETIMEDOUT') {
      throw new Error('MCP server request timed out. Please try again.');
    }
    throw error;
  }
}

// Helper function to log tool usage
async function logToolUsage(userId, toolName, parameters, result, status, executionTime, error = null) {
  try {
    await pool.query(
      `INSERT INTO tool_usage 
       (user_id, tool_name, parameters, result, status, execution_time_ms, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        userId, 
        toolName, 
        JSON.stringify(parameters), 
        JSON.stringify(result), 
        status, 
        executionTime,
        error
      ]
    );
  } catch (logError) {
    console.error('Failed to log tool usage:', logError);
    // Don't throw here as this is just logging
  }
}

// Get available MCP tools
router.get('/tools', optionalAuth, async (req, res) => {
  try {
    const response = await axios.get(`${MCP_SERVER_URL}/tools`, {
      timeout: 10000
    });

    res.json({
      success: true,
      tools: response.data.tools || [],
      server_url: MCP_SERVER_URL
    });

  } catch (error) {
    console.error('Get MCP tools error:', error);
    res.status(503).json({ 
      error: 'MCP server is not available',
      code: 'MCP_SERVER_UNAVAILABLE',
      details: error.message
    });
  }
});

// Call MCP tool
router.post('/call', authenticateToken, mcpCallValidation, async (req, res) => {
  const startTime = Date.now();
  let toolResult = null;
  let executionTime = 0;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { tool, params } = req.body;

    // Validate tool name (security check)
    const allowedTools = ['calculator', 'database', 'ai-assistant'];
    if (!allowedTools.includes(tool)) {
      return res.status(400).json({
        error: 'Tool not allowed',
        code: 'TOOL_NOT_ALLOWED',
        allowed_tools: allowedTools
      });
    }

    // Call MCP server
    toolResult = await callMCPServer(tool, params);
    executionTime = Date.now() - startTime;

    // Log successful usage
    await logToolUsage(
      req.user.id, 
      tool, 
      params, 
      toolResult, 
      'success', 
      executionTime
    );

    console.log(`✅ MCP tool called: ${tool} by user ${req.user.id} (${executionTime}ms)`);

    res.json({
      success: true,
      tool,
      result: toolResult,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    executionTime = Date.now() - startTime;

    // Log failed usage
    await logToolUsage(
      req.user.id, 
      req.body.tool, 
      req.body.params, 
      null, 
      'error', 
      executionTime,
      error.message
    );

    console.error('MCP tool call error:', error);

    res.status(400).json({ 
      error: error.message || 'MCP tool call failed',
      code: 'MCP_CALL_ERROR',
      tool: req.body.tool,
      execution_time_ms: executionTime
    });
  }
});

// Get MCP usage history
router.get('/usage', authenticateToken, usageQueryValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { 
      limit = 20, 
      offset = 0, 
      tool_name, 
      status 
    } = req.query;

    // Build WHERE clause
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (tool_name) {
      paramCount++;
      whereClause += ` AND tool_name = ${paramCount}`;
      queryParams.push(tool_name);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = ${paramCount}`;
      queryParams.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM tool_usage ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get usage records
    const usageQuery = `
      SELECT 
        id, tool_name, parameters, result, status, 
        execution_time_ms, error_message, created_at
      FROM tool_usage 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${paramCount + 1} OFFSET ${paramCount + 2}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    const usageResult = await pool.query(usageQuery, queryParams);

    res.json({
      success: true,
      usage: usageResult.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get MCP usage error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve MCP usage history',
      code: 'GET_USAGE_ERROR'
    });
  }
});

// Get MCP usage statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        tool_name,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_calls,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_calls,
        AVG(execution_time_ms) as avg_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        MIN(execution_time_ms) as min_execution_time,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as calls_last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as calls_last_7d
      FROM tool_usage 
      WHERE user_id = $1
      GROUP BY tool_name
      ORDER BY total_calls DESC
    `;

    const statsResult = await pool.query(statsQuery, [req.user.id]);

    // Overall statistics
    const overallQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_calls,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_calls,
        AVG(execution_time_ms) as avg_execution_time
      FROM tool_usage 
      WHERE user_id = $1
    `;

    const overallResult = await pool.query(overallQuery, [req.user.id]);
    const overall = overallResult.rows[0];

    // Calculate success rate
    const successRate = overall.total_calls > 0 
      ? Math.round((overall.successful_calls / overall.total_calls) * 100) 
      : 0;

    res.json({
      success: true,
      stats: {
        overall: {
          total_calls: parseInt(overall.total_calls),
          successful_calls: parseInt(overall.successful_calls),
          failed_calls: parseInt(overall.failed_calls),
          success_rate: successRate,
          avg_execution_time: Math.round(parseFloat(overall.avg_execution_time) || 0)
        },
        by_tool: statsResult.rows.map(row => ({
          tool_name: row.tool_name,
          total_calls: parseInt(row.total_calls),
          successful_calls: parseInt(row.successful_calls),
          failed_calls: parseInt(row.failed_calls),
          success_rate: Math.round((row.successful_calls / row.total_calls) * 100),
          avg_execution_time: Math.round(parseFloat(row.avg_execution_time)),
          max_execution_time: parseInt(row.max_execution_time),
          min_execution_time: parseInt(row.min_execution_time),
          calls_last_24h: parseInt(row.calls_last_24h),
          calls_last_7d: parseInt(row.calls_last_7d)
        }))
      }
    });

  } catch (error) {
    console.error('Get MCP stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get MCP statistics',
      code: 'GET_STATS_ERROR'
    });
  }
});

module.exports = router;
```

#### User Management Route (routes/users.js)
```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Validation rules
const updateUserValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid user ID required'),
  body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('is_active').optional().isBoolean().withMessage('Active status must be boolean')
];

const getUsersValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('search').optional().trim().isLength({ max: 50 }).withMessage('Search term too long'),
  query('is_active').optional().isBoolean().withMessage('Active filter must be boolean')
];

// Get all users (with pagination and search)
router.get('/', getUsersValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { 
      limit = 20, 
      offset = 0, 
      search, 
      is_active 
    } = req.query;

    // Build WHERE clause
    let whereClause = '';
    const queryParams = [];
    let paramCount = 0;

    const conditions = [];

    if (search) {
      paramCount++;
      conditions.push(`(username ILIKE ${paramCount} OR email ILIKE ${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    if (is_active !== undefined) {
      paramCount++;
      conditions.push(`is_active = ${paramCount}`);
      queryParams.push(is_active === 'true');
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get users with pagination
    const usersQuery = `
      SELECT 
        id, email, username, is_active, is_superuser,
        created_at, updated_at, last_login
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${paramCount + 1} OFFSET ${paramCount + 2}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    const usersResult = await pool.query(usersQuery, queryParams);

    res.json({
      success: true,
      users: usersResult.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve users',
      code: 'GET_USERS_ERROR'
    });
  }
});

// Get single user
router.get('/:id', param('id').isInt({ min: 1 }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = parseInt(req.params.id);

    // Check if user can access this user's data
    if (userId !== req.user.id && !req.user.is_superuser) {
      return res.status(403).json({ 
        error: 'Access denied. You can only view your own profile.',
        code: 'ACCESS_DENIED'
      });
    }

    const userResult = await pool.query(
      `SELECT 
        id, email, username, is_active, is_superuser,
        created_at, updated_at, last_login
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user: userResult.rows[0]
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve user',
      code: 'GET_USER_ERROR'
    });
  }
});

// Update user profile
router.put('/:id', updateUserValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = parseInt(req.params.id);
    const updates = req.body;

    // Check permissions
    if (userId !== req.user.id && !req.user.is_superuser) {
      return res.status(403).json({ 
        error: 'Access denied. You can only update your own profile.',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, email, username FROM users WHERE id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check for email/username conflicts
    if (updates.email || updates.username) {
      const conflictCheck = await pool.query(
        'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
        [updates.email || '', updates.username || '', userId]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Email or username already exists',
          code: 'USER_CONFLICT'
        });
      }
    }

    // Only superusers can change is_active status
    if (updates.is_active !== undefined && !req.user.is_superuser) {
      delete updates.is_active;
    }

    // Build update query dynamically
    const updateFields = [];
    const queryParams = [userId];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['username', 'email', 'is_active'].includes(key)) {
        paramCount++;
        updateFields.push(`${key} = ${paramCount}`);
        queryParams.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      });
    }

    // Add updated_at
    paramCount++;
    updateFields.push(`updated_at = ${paramCount}`);
    queryParams.push(new Date().toISOString());

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, email, username, is_active, is_superuser, 
                created_at, updated_at, last_login
    `;

    const updateResult = await pool.query(updateQuery, queryParams);

    console.log(`✅ User updated: ${userId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      error: 'Failed to update user',
      code: 'UPDATE_USER_ERROR'
    });
  }
});

// Delete user account
router.delete('/:id', param('id').isInt({ min: 1 }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = parseInt(req.params.id);

    // Check permissions - users can delete their own account, superusers can delete any
    if (userId !== req.user.id && !req.user.is_superuser) {
      return res.status(403).json({ 
        error: 'Access denied. You can only delete your own account.',
        code: 'ACCESS_DENIED'
      });
    }

    // Prevent deletion of the last superuser
    if (req.user.is_superuser) {
      const superuserCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE is_superuser = TRUE'
      );
      
      if (parseInt(superuserCount.rows[0].count) <= 1) {
        return res.status(400).json({ 
          error: 'Cannot delete the last superuser account',
          code: 'LAST_SUPERUSER'
        });
      }
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Get user info before deletion
      const userToDelete = await pool.query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [userId]
      );

      if (userToDelete.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Delete user (CASCADE will handle related records)
      const deleteResult = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, username, email',
        [userId]
      );

      // Commit transaction
      await pool.query('COMMIT');

      console.log(`✅ User deleted: ${deleteResult.rows[0].username} (${userId}) by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'User account deleted successfully',
        deletedUser: {
          id: deleteResult.rows[0].id,
          username: deleteResult.rows[0].username,
          email: deleteResult.rows[0].email
        }
      });

    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'Failed to delete user account',
      code: 'DELETE_USER_ERROR'
    });
  }
});

// Change user password
router.post('/:id/change-password', [
  param('id').isInt({ min: 1 }).withMessage('Valid user ID required'),
  body('currentPassword').exists().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be 8+ chars with uppercase, lowercase, number, and special character'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = parseInt(req.params.id);
    const { currentPassword, newPassword } = req.body;

    // Users can only change their own password
    if (userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Access denied. You can only change your own password.',
        code: 'ACCESS_DENIED'
      });
    }

    // Get current user with password
    const userResult = await pool.query(
      'SELECT id, hashed_password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.hashed_password);

    if (!isValidPassword) {
      return res.status(400).json({ 
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET hashed_password = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, userId]
    );

    console.log(`✅ Password changed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

// Get user statistics
router.get('/:id/stats', param('id').isInt({ min: 1 }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = parseInt(req.params.id);

    // Check permissions
    if (userId !== req.user.id && !req.user.is_superuser) {
      return res.status(403).json({ 
        error: 'Access denied. You can only view your own statistics.',
        code: 'ACCESS_DENIED'
      });
    }

    // Get user statistics
    const statsQuery = `
      SELECT 
        u.username,
        u.created_at as member_since,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as tasks_last_30_days,
        COUNT(tu.id) as total_tool_usage,
        COUNT(CASE WHEN tu.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as tool_usage_last_30_days,
        MAX(t.created_at) as last_task_created,
        MAX(tu.created_at) as last_tool_used
      FROM users u
      LEFT JOIN tasks t ON u.id = t.user_id
      LEFT JOIN tool_usage tu ON u.id = tu.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.created_at
    `;

    const statsResult = await pool.query(statsQuery, [userId]);

    if (statsResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const stats = statsResult.rows[0];

    // Calculate additional metrics
    const completionRate = stats.total_tasks > 0 
      ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
      : 0;

    res.json({
      success: true,
      stats: {
        username: stats.username,
        member_since: stats.member_since,
        tasks: {
          total: parseInt(stats.total_tasks),
          completed: parseInt(stats.completed_tasks),
          completion_rate: completionRate,
          last_30_days: parseInt(stats.tasks_last_30_days),
          last_created: stats.last_task_created
        },
        tool_usage: {
          total: parseInt(stats.total_tool_usage),
          last_30_days: parseInt(stats.tool_usage_last_30_days),
          last_used: stats.last_tool_used
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get user statistics',
      code: 'GET_USER_STATS_ERROR'
    });
  }
});

module.exports = router;
```

### React Frontend (`frontend/`)

#### Frontend Package Configuration
```json
{
  "name": "mcp-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "axios": "^1.6.0",
    "@headlessui/react": "^1.7.17",
    "@heroicons/react": "^2.0.18",
    "react-hot-toast": "^2.4.1",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.0",
    "vite": "^4.4.5",
    "vitest": "^0.34.0"
  }
}
```

#### Main React App (src/App.jsx)
```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import MCPTools from './pages/MCPTools';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools"
                element={
                  <ProtectedRoute>
                    <MCPTools />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

### MCP Server (`mcp-server/`)

#### MCP Server Package Configuration
```json
{
  "name": "mcp-server",
  "version": "1.0.0",
  "description": "Model Context Protocol Server for Full-Stack MCP Application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "keywords": ["mcp", "json-rpc", "tools", "ai"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "pg": "^8.11.3",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### Main MCP Server (server.js)
```javascript
const http = require('http');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'mcp_starter',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ MCP Server connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

// Available MCP tools
const tools = {
  'calculator': require('./tools/calculator'),
  'database': require('./tools/database'),
  'ai-assistant': require('./tools/ai-assistant')
};

// JSON-RPC error codes
const RPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' },
  SERVER_ERROR: { code: -32000, message: 'Server error' }
};

// Helper function to create JSON-RPC response
function createRPCResponse(id, result = null, error = null) {
  const response = {
    jsonrpc: "2.0",
    id
  };

  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }

  return response;
}

// Helper function to validate JSON-RPC request
function validateRPCRequest(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: RPC_ERRORS.INVALID_REQUEST };
  }

  if (data.jsonrpc !== "2.0") {
    return { valid: false, error: RPC_ERRORS.INVALID_REQUEST };
  }

  if (!data.method || typeof data.method !== 'string') {
    return { valid: false, error: RPC_ERRORS.INVALID_REQUEST };
  }

  if (data.params !== undefined && typeof data.params !== 'object') {
    return { valid: false, error: RPC_ERRORS.INVALID_PARAMS };
  }

  return { valid: true };
}

// Main HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /tools - List available tools
  if (req.method === 'GET' && req.url === '/tools') {
    try {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        tools: Object.keys(tools),
        version: "1.0.0",
        server: "MCP Tools Server"
      }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to list tools' }));
    }
    return;
  }

  // GET /health - Health check
  if (req.method === 'GET' && req.url === '/health') {
    try {
      // Test database connection
      await pool.query('SELECT 1');
      
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        tools: Object.keys(tools),
        uptime: process.uptime()
      }));
    } catch (error) {
      res.writeHead(503);
      res.end(JSON.stringify({
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      }));
    }
    return;
  }

  // POST requests - JSON-RPC calls
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      let requestData;
      let requestId = null;

      try {
        // Parse JSON
        try {
          requestData = JSON.parse(body);
          requestId = requestData.id;
        } catch (parseError) {
          res.writeHead(400);
          res.end(JSON.stringify(createRPCResponse(null, null, RPC_ERRORS.PARSE_ERROR)));
          return;
        }

        // Validate JSON-RPC request
        const validation = validateRPCRequest(requestData);
        if (!validation.valid) {
          res.writeHead(400);
          res.end(JSON.stringify(createRPCResponse(requestId, null, validation.error)));
          return;
        }

        const { method, params = {} } = requestData;

        // Check if tool exists
        if (!tools[method]) {
          res.writeHead(404);
          res.end(JSON.stringify(createRPCResponse(
            requestId, 
            null, 
            { ...RPC_ERRORS.METHOD_NOT_FOUND, data: `Tool '${method}' not found` }
          )));
          return;
        }

        // Execute tool
        console.log(`🔧 Executing tool: ${method} with params:`, params);
        const startTime = Date.now();

        try {
          const result = await tools[method](params, pool);
          const executionTime = Date.now() - startTime;

          console.log(`✅ Tool ${method} completed in ${executionTime}ms`);

          res.writeHead(200);
          res.end(JSON.stringify(createRPCResponse(requestId, {
            ...result,
            _meta: {
              tool: method,
              execution_time_ms: executionTime,
              timestamp: new Date().toISOString()
            }
          })));

        } catch (toolError) {
          const executionTime = Date.now() - startTime;
          console.error(`❌ Tool ${method} failed after ${executionTime}ms:`, toolError.message);

          res.writeHead(400);
          res.end(JSON.stringify(createRPCResponse(
            requestId, 
            null, 
            { 
              ...RPC_ERRORS.SERVER_ERROR, 
              data: toolError.message,
              execution_time_ms: executionTime
            }
          )));
        }

      } catch (error) {
        console.error('❌ MCP Server error:', error);
        res.writeHead(500);
        res.end(JSON.stringify(createRPCResponse(
          requestId, 
          null, 
          { ...RPC_ERRORS.INTERNAL_ERROR, data: error.message }
        )));
      }
    });

    return;
  }

  // Handle unsupported methods
  res.writeHead(405);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

// Server startup
const PORT = process.env.MCP_SERVER_PORT || 3001;

server.listen(PORT, () => {
  console.log(`🔧 MCP Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🛠️ Available tools: http://localhost:${PORT}/tools`);
  console.log(`🎯 Available tools: ${Object.keys(tools).join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ MCP Server shut down');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ MCP Server shut down');
    pool.end();
    process.exit(0);
  });
});

module.exports = { server, pool };
```

### Database Setup (`docker/postgres/`)

#### Database Schema (init.sql)
```sql
-- MCP Full-Stack Application Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool usage tracking
CREATE TABLE IF NOT EXISTS tool_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tool_name VARCHAR(50) NOT NULL,
    parameters JSONB,
    result JSONB,
    status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'error')),
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calculations table (for calculator tool history)
CREATE TABLE IF NOT EXISTS calculations (
    id SERIAL PRIMARY KEY,
    expression VARCHAR(500) NOT NULL,
    result NUMERIC,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON tool_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON calculations(user_id);

-- Insert default admin user (password: admin123!)
INSERT INTO users (email, username, hashed_password, is_superuser) VALUES 
    ('admin@example.com', 'admin', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample tasks for demo
INSERT INTO tasks (title, description, user_id, status, priority, created_at) VALUES 
    ('Welcome to MCP App', 'This is your first task in the MCP application!', 1, 'pending', 'medium', NOW()),
    ('Try the Calculator Tool', 'Test the MCP calculator tool with some math expressions', 1, 'pending', 'low', NOW()),
    ('Explore the Dashboard', 'Check out the dashboard and statistics', 1, 'completed', 'low', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Create a function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

#### MCP Tools Implementation

##### Calculator Tool (mcp-server/tools/calculator.js)
```javascript
/**
 * Calculator Tool - Safely evaluate mathematical expressions
 */

// Allowed mathematical functions and constants
const ALLOWED_FUNCTIONS = {
  'Math.PI': Math.PI,
  'Math.E': Math.E,
  'Math.abs': Math.abs,
  'Math.ceil': Math.ceil,
  'Math.floor': Math.floor,
  'Math.round': Math.round,
  'Math.sqrt': Math.sqrt,
  'Math.pow': Math.pow,
  'Math.sin': Math.sin,
  'Math.cos': Math.cos,
  'Math.tan': Math.tan,
  'Math.log': Math.log,
  'Math.max': Math.max,
  'Math.min': Math.min
};

function validateExpression(expression) {
  // Remove whitespace
  const cleaned = expression.replace(/\s/g, '');
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /require/i,
    /import/i,
    /eval/i,
    /function/i,
    /class/i,
    /constructor/i,
    /prototype/i,
    /__/,
    /process/i,
    /global/i,
    /window/i,
    /document/i,
    /console/i,
    /alert/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleaned)) {
      throw new Error(`Expression contains forbidden pattern: ${pattern}`);
    }
  }

  // Only allow numbers, operators, parentheses, dots, and Math functions
  if (!/^[0-9+\-*/().\sMath,a-zA-Z]*$/.test(expression)) {
    throw new Error('Expression contains invalid characters');
  }

  return cleaned;
}

function safeEvaluate(expression) {
  try {
    // Create a restricted context
    const context = {
      ...ALLOWED_FUNCTIONS
    };

    // Replace Math.function calls in the expression
    let processedExpression = expression;
    for (const [key, value] of Object.entries(ALLOWED_FUNCTIONS)) {
      if (typeof value === 'function') {
        // For functions, we need to handle them specially
        const funcName = key.replace('Math.', '');
        processedExpression = processedExpression.replace(
          new RegExp(`Math\\.${funcName}`, 'g'), 
          key
        );
      } else {
        // For constants, direct replacement
        processedExpression = processedExpression.replace(
          new RegExp(key, 'g'), 
          value.toString()
        );
      }
    }

    // Use Function constructor with restricted scope
    const func = new Function(...Object.keys(context), `"use strict"; return (${processedExpression})`);
    const result = func(...Object.values(context));

    // Validate result
    if (typeof result !== 'number') {
      throw new Error('Result is not a number');
    }

    if (!isFinite(result)) {
      throw new Error('Result is infinite or NaN');
    }

    return result;
  } catch (error) {
    throw new Error(`Calculation error: ${error.message}`);
  }
}

async function calculator(params, pool = null) {
  try {
    const { expression } = params;

    if (!expression || typeof expression !== 'string') {
      throw new Error('Expression is required and must be a string');
    }

    if (expression.length > 1000) {
      throw new Error('Expression is too long (max 1000 characters)');
    }

    // Validate and clean expression
    const validatedExpression = validateExpression(expression);

    // Calculate result
    const result = safeEvaluate(validatedExpression);

    // Round to reasonable precision (12 decimal places)
    const roundedResult = Math.round(result * 1e12) / 1e12;

    // Log calculation if database is available
    if (pool) {
      try {
        await pool.query(
          'INSERT INTO calculations (expression, result, created_at) VALUES ($1, $2, NOW())',
          [expression, roundedResult]
        );
      } catch (dbError) {
        console.warn('Failed to log calculation:', dbError.message);
        // Don't fail the calculation if logging fails
      }
    }

    return {
      expression: expression,
      result: roundedResult,
      formatted_result: roundedResult.toLocaleString(),
      success: true
    };

  } catch (error) {
    console.error('Calculator tool error:', error);
    throw new Error(`Calculator error: ${error.message}`);
  }
}

module.exports = calculator;
```

##### Database Tool (mcp-server/tools/database.js)
```javascript
/**
 * Database Tool - Safe database operations
 */

// Allowed tables and operations
const ALLOWED_TABLES = ['users', 'tasks', 'calculations', 'tool_usage'];
const ALLOWED_OPERATIONS = ['select', 'insert', 'update', 'delete', 'count'];

// SQL injection prevention patterns
const DANGEROUS_SQL_PATTERNS = [
  /;\s*(drop|delete|truncate|alter|create|grant|revoke)/i,
  /union\s+select/i,
  /exec\s*\(/i,
  /script/i,
  /<script/i,
  /javascript:/i
];

function validateTableName(tableName) {
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('Table name is required');
  }

  if (!ALLOWED_TABLES.includes(tableName.toLowerCase())) {
    throw new Error(`Table '${tableName}' is not allowed. Allowed tables: ${ALLOWED_TABLES.join(', ')}`);
  }

  return tableName.toLowerCase();
}

function validateOperation(operation) {
  if (!operation || typeof operation !== 'string') {
    throw new Error('Operation is required');
  }

  if (!ALLOWED_OPERATIONS.includes(operation.toLowerCase())) {
    throw new Error(`Operation '${operation}' is not allowed. Allowed operations: ${ALLOWED_OPERATIONS.join(', ')}`);
  }

  return operation.toLowerCase();
}

function validateQuery(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query is required');
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_SQL_PATTERNS) {
    if (pattern.test(query)) {
      throw new Error(`Query contains forbidden pattern: ${pattern}`);
    }
  }

  // Limit query length
  if (query.length > 2000) {
    throw new Error('Query is too long (max 2000 characters)');
  }

  return query.trim();
}

function buildSelectQuery(table, options = {}) {
  const { 
    columns = '*', 
    where = {}, 
    limit = 100, 
    offset = 0, 
    orderBy = 'id', 
    orderDirection = 'ASC' 
  } = options;

  let query = `SELECT ${columns} FROM ${table}`;
  const params = [];
  let paramCount = 0;

  // Build WHERE clause
  if (Object.keys(where).length > 0) {
    const whereConditions = [];
    for (const [key, value] of Object.entries(where)) {
      // Validate column name (basic protection)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid column name: ${key}`);
      }
      paramCount++;
      whereConditions.push(`${key} = ${paramCount}`);
      params.push(value);
    }
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  // Add ORDER BY
  if (orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(orderBy)) {
    const direction = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${orderBy} ${direction}`;
  }

  // Add LIMIT and OFFSET
  const limitValue = Math.min(parseInt(limit) || 100, 1000); // Max 1000 rows
  const offsetValue = Math.max(parseInt(offset) || 0, 0);
  
  paramCount++;
  query += ` LIMIT ${paramCount}`;
  params.push(limitValue);

  if (offsetValue > 0) {
    paramCount++;
    query += ` OFFSET ${paramCount}`;
    params.push(offsetValue);
  }

  return { query, params };
}

function buildInsertQuery(table, data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error('Insert data is required');
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  // Validate column names
  for (const column of columns) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
  }

  const placeholders = values.map((_, index) => `${index + 1}`).join(', ');
  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;

  return { query, params: values };
}

function buildUpdateQuery(table, data, where) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error('Update data is required');
  }

  if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
    throw new Error('WHERE conditions are required for UPDATE');
  }

  const updateColumns = [];
  const params = [];
  let paramCount = 0;

  // Build SET clause
  for (const [key, value] of Object.entries(data)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid column name: ${key}`);
    }
    paramCount++;
    updateColumns.push(`${key} = ${paramCount}`);
    params.push(value);
  }

  // Build WHERE clause
  const whereConditions = [];
  for (const [key, value] of Object.entries(where)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid column name: ${key}`);
    }
    paramCount++;
    whereConditions.push(`${key} = ${paramCount}`);
    params.push(value);
  }

  const query = `UPDATE ${table} SET ${updateColumns.join(', ')} WHERE ${whereConditions.join(' AND ')} RETURNING *`;

  return { query, params };
}

function buildDeleteQuery(table, where) {
  if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
    throw new Error('WHERE conditions are required for DELETE');
  }

  const whereConditions = [];
  const params = [];
  let paramCount = 0;

  for (const [key, value] of Object.entries(where)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid column name: ${key}`);
    }
    paramCount++;
    whereConditions.push(`${key} = ${paramCount}`);
    params.push(value);
  }

  const query = `DELETE FROM ${table} WHERE ${whereConditions.join(' AND ')} RETURNING *`;

  return { query, params };
}

async function database(params, pool) {
  try {
    if (!pool) {
      throw new Error('Database connection is not available');
    }

    const { action, table, query, data, where, options = {} } = params;

    // Validate operation
    const validatedAction = validateOperation(action);

    let queryObj;
    let result;

    switch (validatedAction) {
      case 'select':
        if (query) {
          // Custom query
          const validatedQuery = validateQuery(query);
          result = await pool.query(validatedQuery);
        } else if (table) {
          // Structured query
          const validatedTable = validateTableName(table);
          queryObj = buildSelectQuery(validatedTable, { where, ...options });
          result = await pool.query(queryObj.query, queryObj.params);
        } else {
          throw new Error('Either table or query parameter is required for SELECT');
        }
        
        return {
          action: 'select',
          rows: result.rows,
          count: result.rowCount,
          total_rows: result.rows.length
        };

      case 'insert':
        if (!table) throw new Error('Table parameter is required for INSERT');
        if (!data) throw new Error('Data parameter is required for INSERT');
        
        const validatedInsertTable = validateTableName(table);
        queryObj = buildInsertQuery(validatedInsertTable, data);
        result = await pool.query(queryObj.query, queryObj.params);
        
        return {
          action: 'insert',
          inserted: result.rows[0],
          success: true
        };

      case 'update':
        if (!table) throw new Error('Table parameter is required for UPDATE');
        if (!data) throw new Error('Data parameter is required for UPDATE');
        if (!where) throw new Error('Where parameter is required for UPDATE');
        
        const validatedUpdateTable = validateTableName(table);
        queryObj = buildUpdateQuery(validatedUpdateTable, data, where);
        result = await pool.query(queryObj.query, queryObj.params);
        
        return {
          action: 'update',
          updated: result.rows,
          count: result.rowCount,
          success: true
        };

      case 'delete':
        if (!table) throw new Error('Table parameter is required for DELETE');
        if (!where) throw new Error('Where parameter is required for DELETE');
        
        const validatedDeleteTable = validateTableName(table);
        queryObj = buildDeleteQuery(validatedDeleteTable, where);
        result = await pool.query(queryObj.query, queryObj.params);
        
        return {
          action: 'delete',
          deleted: result.rows,
          count: result.rowCount,
          success: true
        };

      case 'count':
        if (!table) throw new Error('Table parameter is required for COUNT');
        
        const validatedCountTable = validateTableName(table);
        let countQuery = `SELECT COUNT(*) as total FROM ${validatedCountTable}`;
        const countParams = [];

        if (where && Object.keys(where).length > 0) {
          const whereConditions = [];
          let paramCount = 0;
          for (const [key, value] of Object.entries(where)) {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
              throw new Error(`Invalid column name: ${key}`);
            }
            paramCount++;
            whereConditions.push(`${key} = ${paramCount}`);
            countParams.push(value);
          }
          countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        result = await pool.query(countQuery, countParams);
        
        return {
          action: 'count',
          table: validatedCountTable,
          total: parseInt(result.rows[0].total),
          success: true
        };

      default:
        throw new Error(`Unknown database operation: ${action}`);
    }

  } catch (error) {
    console.error('Database tool error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
}

module.exports = database;
```

##### AI Assistant Tool (mcp-server/tools/ai-assistant.js)
```javascript
/**
 * AI Assistant Tool - Integration with AI APIs
 */

const axios = require('axios');

// Supported AI providers
const AI_PROVIDERS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages'
};

// Default configurations
const DEFAULT_CONFIG = {
  model: 'gpt-3.5-turbo',
  maxTokens: 500,
  temperature: 0.7,
  provider: 'openai'
};

// Rate limiting and safety
const MAX_PROMPT_LENGTH = 4000;
const MAX_TOKENS = 2000;
const REQUEST_TIMEOUT = 30000;

function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required and must be a string');
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt is too long (max ${MAX_PROMPT_LENGTH} characters)`);
  }

  // Check for potentially harmful content
  const dangerousPatterns = [
    /jailbreak/i,
    /ignore.*instructions/i,
    /forget.*above/i,
    /act.*as.*admin/i,
    /sudo/i,
    /root.*access/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(prompt)) {
      throw new Error('Prompt contains potentially harmful content');
    }
  }

  return prompt.trim();
}

function validateConfig(config) {
  const validated = { ...DEFAULT_CONFIG, ...config };

  // Validate provider
  if (!AI_PROVIDERS[validated.provider]) {
    throw new Error(`Unsupported AI provider: ${validated.provider}. Supported: ${Object.keys(AI_PROVIDERS).join(', ')}`);
  }

  // Validate model
  if (!validated.model || typeof validated.model !== 'string') {
    validated.model = DEFAULT_CONFIG.model;
  }

  // Validate maxTokens
  validated.maxTokens = Math.min(Math.max(parseInt(validated.maxTokens) || DEFAULT_CONFIG.maxTokens, 1), MAX_TOKENS);

  // Validate temperature
  validated.temperature = Math.min(Math.max(parseFloat(validated.temperature) || DEFAULT_CONFIG.temperature, 0), 2);

  return validated;
}

async function callOpenAI(prompt, config) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const requestData = {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Provide accurate, helpful, and safe responses. Do not generate harmful, illegal, or inappropriate content.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  };

  try {
    const response = await axios.post(AI_PROVIDERS.openai, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT
    });

    if (response.data.choices && response.data.choices.length > 0) {
      return {
        response: response.data.choices[0].message.content.trim(),
        model: response.data.model,
        usage: response.data.usage,
        provider: 'openai'
      };
    } else {
      throw new Error('No response from OpenAI API');
    }

  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('OpenAI API request timed out');
    } else {
      throw new Error(`OpenAI API request failed: ${error.message}`);
    }
  }
}

async function callAnthropic(prompt, config) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const requestData = {
    model: config.model.includes('claude') ? config.model : 'claude-3-haiku-20240307',
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  try {
    const response = await axios.post(AI_PROVIDERS.anthropic, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: REQUEST_TIMEOUT
    });

    if (response.data.content && response.data.content.length > 0) {
      return {
        response: response.data.content[0].text.trim(),
        model: response.data.model,
        usage: response.data.usage,
        provider: 'anthropic'
      };
    } else {
      throw new Error('No response from Anthropic API');
    }

  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      throw new Error(`Anthropic API error: ${errorData.error?.message || 'Unknown error'}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Anthropic API request timed out');
    } else {
      throw new Error(`Anthropic API request failed: ${error.message}`);
    }
  }
}

async function aiAssistant(params, pool = null) {
  try {
    const { prompt, model, maxTokens, temperature, provider } = params;

    // Validate and sanitize inputs
    const validatedPrompt = validatePrompt(prompt);
    const config = validateConfig({ model, maxTokens, temperature, provider });

    console.log(`🤖 AI Assistant called with provider: ${config.provider}, model: ${config.model}`);

    let result;

    // Call appropriate AI provider
    switch (config.provider) {
      case 'openai':
        result = await callOpenAI(validatedPrompt, config);
        break;
      case 'anthropic':
        result = await callAnthropic(validatedPrompt, config);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Log usage if database is available
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO tool_usage 
           (tool_name, parameters, result, status, execution_time_ms, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            'ai-assistant',
            JSON.stringify({ prompt: validatedPrompt, config }),
            JSON.stringify(result),
            'success',
            0 // We could track this if needed
          ]
        );
      } catch (dbError) {
        console.warn('Failed to log AI assistant usage:', dbError.message);
        // Don't fail the request if logging fails
      }
    }

    return {
      prompt: validatedPrompt,
      response: result.response,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      config: {
        maxTokens: config.maxTokens,
        temperature: config.temperature
      },
      success: true
    };

  } catch (error) {
    console.error('AI Assistant tool error:', error);
    
    // Log error if database is available
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO tool_usage 
           (tool_name, parameters, result, status, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            'ai-assistant',
            JSON.stringify(params),
            null,
            'error',
            error.message
          ]
        );
      } catch (dbError) {
        console.warn('Failed to log AI assistant error:', dbError.message);
      }
    }

    throw new Error(`AI Assistant error: ${error.message}`);
  }
}

module.exports = aiAssistant;
```

---

## 🐳 Docker Configuration

### Main Docker Compose (docker-compose.yml)
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: mcp_postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-mcp_starter}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    networks:
      - mcp_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MCP Tools Server
  mcp-server:
    build:
      context: ./mcp-server
      dockerfile: Dockerfile
    container_name: mcp_server
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=${POSTGRES_DB:-mcp_starter}
      - MCP_SERVER_PORT=${MCP_SERVER_PORT:-3001}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    ports:
      - "3001:3001"
    networks:
      - mcp_network
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Express.js Backend
  backend:
    build:
      context: ./backend-express
      dockerfile: Dockerfile
    container_name: mcp_backend
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-mcp_starter}
      - SECRET_KEY=${SECRET_KEY:-your-secret-key-change-this}
      - MCP_SERVER_URL=http://mcp-server:3001
      - PORT=${PORT:-8000}
      - CORS_ORIGIN=${FRONTEND_URL:-http://localhost:3000}
    ports:
      - "8000:8000"
    networks:
      - mcp_network
    depends_on:
      postgres:
        condition: service_healthy
      mcp-server:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mcp_frontend
    environment:
      - VITE_API_URL=${VITE_API_URL:-http://localhost:8000}
    ports:
      - "3000:3000"
    networks:
      - mcp_network
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - ./frontend:/app
      - /app/node_modules

networks:
  mcp_network:
    driver: bridge

volumes:
  postgres_data:
```

### MCP Server Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the server
CMD ["npm", "start"]
```

### Express Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the server
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

---

## 🤖 AI Agents Setup (`agents/`)

### LangChain Agent (langchain_agent.py)
```python
from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
import requests
import os
import json
from typing import Dict, Any

class MCPLangChainAgent:
    def __init__(self, mcp_server_url: str = "http://localhost:3001"):
        self.llm = ChatOpenAI(
            model="gpt-4", 
            temperature=0,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        self.mcp_url = mcp_server_url
        self.tools = self._create_tools()
        self.agent = initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=True,
            max_iterations=3,
            handle_parsing_errors=True
        )

    def _call_mcp_tool(self, method: str, params: Dict[str, Any]) -> str:
        """Call an MCP tool and return the result"""
        try:
            response = requests.post(
                self.mcp_url,
                json={
                    "jsonrpc": "2.0",
                    "id": "agent_call",
                    "method": method,
                    "params": params
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if "result" in result:
                    return json.dumps(result["result"], indent=2)
                else:
                    return f"Error: {result.get('error', 'Unknown error')}"
            else:
                return f"HTTP Error: {response.status_code}"
                
        except Exception as e:
            return f"Connection error: {str(e)}"

    def _create_tools(self):
        """Create LangChain tools for MCP integration"""
        
        def calculator_tool(expression: str) -> str:
            """Calculate mathematical expressions using the MCP calculator tool."""
            return self._call_mcp_tool("calculator", {"expression": expression})

        def database_tool(query: str) -> str:
            """Query the database using the MCP database tool. 
            Use action 'select' with a SQL query."""
            return self._call_mcp_tool("database", {
                "action": "select",
                "query": query
            })

        def ai_assistant_tool(prompt: str) -> str:
            """Get AI assistance for complex questions using the MCP AI assistant tool."""
            return self._call_mcp_tool("ai-assistant", {
                "prompt": prompt,
                "model": "gpt-3.5-turbo",
                "maxTokens": 200
            })

        def create_task_tool(title: str, description: str = "") -> str:
            """Create a new task using the MCP database tool."""
            return self._call_mcp_tool("database", {
                "action": "insert",
                "table": "tasks",
                "data": {
                    "title": title,
                    "description": description,
                    "status": "pending",
                    "user_id": 1  # Default user for agent
                }
            })

        return [
            Tool(
                name="calculator",
                func=calculator_tool,
                description="Calculate mathematical expressions. Input should be a valid math expression like '2+3*4'."
            ),
            Tool(
                name="database_query",
                func=database_tool,
                description="Query the database with SQL. Use for retrieving user data, tasks, or statistics."
            ),
            Tool(
                name="ai_assistant",
                func=ai_assistant_tool,
                description="Get AI assistance for complex questions or reasoning tasks."
            ),
            Tool(
                name="create_task",
                func=create_task_tool,
                description="Create a new task. Input should be the task title, optionally with description."
            )
        ]

    def chat(self, message: str) -> str:
        """Process a message through the agent"""
        try:
            response = self.agent.invoke({"input": message})
            return response.get("output", "No response generated")
        except Exception as e:
            return f"Agent error: {str(e)}"

    def available_tools(self) -> list:
        """Get list of available tools"""
        return [tool.name for tool in self.tools]

# Usage example
if __name__ == "__main__":
    agent = MCPLangChainAgent()
    
    # Test the agent
    test_queries = [
        "What is 25 * 17 + 100?",
        "Create a task to 'Review Q4 budget proposals'",
        "How many tasks are in the database?",
        "What's the difference between machine learning and deep learning?"
    ]
    
    for query in test_queries:
        print(f"\n🤔 Query: {query}")
        print(f"🤖 Response: {agent.chat(query)}")
        print("-" * 50)
```

### Task Automation Workflow (workflows/task_automation.py)
```python
import asyncio
import schedule
import time
from datetime import datetime, timedelta
from langchain_agent import MCPLangChainAgent
import requests

class TaskAutomationWorkflow:
    def __init__(self, backend_url: str = "http://localhost:8000"):
        self.backend_url = backend_url
        self.agent = MCPLangChainAgent()
        self.auth_token = None

    async def authenticate(self, email: str, password: str):
        """Authenticate with the backend"""
        try:
            response = requests.post(
                f"{self.backend_url}/api/auth/login",
                json={"email": email, "password": password}
            )
            if response.status_code == 200:
                self.auth_token = response.json().get("token")
                return True
        except Exception as e:
            print(f"Authentication failed: {e}")
        return False

    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        } if self.auth_token else {"Content-Type": "application/json"}

    async def analyze_overdue_tasks(self):
        """Analyze overdue tasks and suggest actions"""
        try:
            # Get all tasks
            response = requests.get(
                f"{self.backend_url}/api/tasks",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                tasks = response.json().get("tasks", [])
                
                # Find overdue tasks (created more than 7 days ago and still pending)
                overdue_tasks = []
                week_ago = datetime.now() - timedelta(days=7)
                
                for task in tasks:
                    created_at = datetime.fromisoformat(task["created_at"].replace("Z", "+00:00"))
                    if (created_at < week_ago and 
                        task["status"] in ["pending", "in_progress"]):
                        overdue_tasks.append(task)
                
                if overdue_tasks:
                    # Use AI agent to analyze and suggest actions
                    task_list = "\n".join([f"- {task['title']}: {task['description']}" for task in overdue_tasks])
                    
                    prompt = f"""
                    The following tasks are overdue (more than 7 days old):
                    {task_list}
                    
                    Please analyze these tasks and suggest:
                    1. Which tasks should be prioritized
                    2. Which tasks might need to be broken down into smaller tasks
                    3. Which tasks should be cancelled or postponed
                    
                    Provide actionable recommendations.
                    """
                    
                    analysis = self.agent.chat(prompt)
                    
                    # Create a summary task with the analysis
                    summary_response = requests.post(
                        f"{self.backend_url}/api/tasks",
                        headers=self.get_headers(),
                        json={
                            "title": f"Task Analysis - {datetime.now().strftime('%Y-%m-%d')}",
                            "description": f"AI Analysis of {len(overdue_tasks)} overdue tasks:\n\n{analysis}",
                            "status": "pending"
                        }
                    )
                    
                    print(f"✅ Created analysis task for {len(overdue_tasks)} overdue tasks")
                    return analysis
                else:
                    print("✅ No overdue tasks found")
                    return "No overdue tasks to analyze"
                    
        except Exception as e:
            print(f"❌ Error analyzing tasks: {e}")
            return f"Error: {e}"

    async def daily_summary(self):
        """Generate daily summary of activities"""
        try:
            # Get today's tasks
            today = datetime.now().strftime('%Y-%m-%d')
            
            # Get task statistics
            stats_response = requests.get(
                f"{self.backend_url}/api/tasks/stats/summary",
                headers=self.get_headers()
            )
            
            # Get recent MCP usage
            usage_response = requests.get(
                f"{self.backend_url}/api/mcp/usage?limit=10",
                headers=self.get_headers()
            )
            
            if stats_response.status_code == 200 and usage_response.status_code == 200:
                stats = stats_response.json().get("stats", {})
                usage = usage_response.json().get("usage", [])
                
                # Generate AI summary
                prompt = f"""
                Generate a daily summary report based on this data:
                
                Task Statistics:
                - Total tasks: {stats.get('total_tasks', 0)}
                - Completed: {stats.get('completed_tasks', 0)}
                - In progress: {stats.get('in_progress_tasks', 0)}
                - Pending: {stats.get('pending_tasks', 0)}
                - Tasks completed this week: {stats.get('completed_this_week', 0)}
                
                Recent tool usage: {len(usage)} operations
                
                Please provide:
                1. A brief productivity summary
                2. Recommendations for tomorrow
                3. Any patterns you notice
                """
                
                summary = self.agent.chat(prompt)
                
                # Create summary task
                summary_response = requests.post(
                    f"{self.backend_url}/api/tasks",
                    headers=self.get_headers(),
                    json={
                        "title": f"Daily Summary - {today}",
                        "description": summary,
                        "status": "completed"
                    }
                )
                
                print(f"✅ Generated daily summary for {today}")
                return summary
                
        except Exception as e:
            print(f"❌ Error generating daily summary: {e}")
            return f"Error: {e}"

    def start_scheduler(self):
        """Start the automated workflows"""
        # Schedule daily summary at 6 PM
        schedule.every().day.at("18:00").do(lambda: asyncio.create_task(self.daily_summary()))
        
        # Schedule overdue task analysis every Monday at 9 AM
        schedule.every().monday.at("09:00").do(lambda: asyncio.create_task(self.analyze_overdue_tasks()))
        
        print("🔄 Scheduler started...")
        print("📅 Daily summary: Every day at 6 PM")
        print("📋 Overdue analysis: Every Monday at 9 AM")
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

# Usage
if __name__ == "__main__":
    workflow = TaskAutomationWorkflow()
    
    # Authenticate (replace with real credentials)
    if asyncio.run(workflow.authenticate("admin@example.com", "admin123!")):
        print("✅ Authenticated successfully")
        
        # Run manual tests
        print("\n🧪 Testing daily summary...")
        summary = asyncio.run(workflow.daily_summary())
        print(f"Summary: {summary}")
        
        print("\n🧪 Testing overdue analysis...")
        analysis = asyncio.run(workflow.analyze_overdue_tasks())
        print(f"Analysis: {analysis}")
        
        # Uncomment to start scheduler
        # workflow.start_scheduler()
    else:
        print("❌ Authentication failed")
```

### Python Requirements (requirements.txt)
```txt
langchain==0.1.0
langchain-openai==0.0.5
openai==1.6.1
requests==2.31.0
python-dotenv==1.0.0
schedule==1.2.0
asyncio==3.4.3
aiohttp==3.9.1
pydantic==2.5.0
```

---

## 🧪 Testing Configuration

### Backend Tests (backend-express/tests/)

#### Authentication Tests (auth.test.js)
```javascript
const request = require('supertest');
const { app } = require('../server');

describe('Authentication Endpoints', () => {
  let authToken;
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Test123!'
  };

  beforeAll(async () => {
    // Setup test database or use test environment
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      authToken = response.body.token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });
  });
});
```

#### MCP Integration Tests (mcp.test.js)
```javascript
const request = require('supertest');
const { app } = require('../server');

describe('MCP Integration Endpoints', () => {
  let authToken;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123!'
      });
    
    authToken = loginResponse.body.token;
  });

  describe('GET /api/mcp/tools', () => {
    it('should return available MCP tools', async () => {
      const response = await request(app)
        .get('/api/mcp/tools')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tools).toBeInstanceOf(Array);
      expect(response.body.tools).toContain('calculator');
    });
  });

  describe('POST /api/mcp/call', () => {
    it('should call calculator tool successfully', async () => {
      const response = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tool: 'calculator',
          params: { expression: '2 + 3' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.result).toBe(5);
    });

    it('should reject invalid tool name', async () => {
      const response = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tool: 'invalid-tool',
          params: {}
        })
        .expect(400);

      expect(response.body.error).toContain('Tool not allowed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/mcp/call')
        .send({
          tool: 'calculator',
          params: { expression: '1 + 1' }
        })
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /api/mcp/usage', () => {
    it('should return usage history for authenticated user', async () => {
      const response = await request(app)
        .get('/api/mcp/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.usage).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });
});
```

---

## 🚀 Quick Start Script

### Main Startup Script (start-express.sh)
```bash
#!/bin/bash

# MCP Full-Stack Application Startup Script
# This script sets up and starts the complete Express.js-based MCP application

set -e

echo "🚀 Starting MCP Full-Stack Application"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️ .env file not found. Creating from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created from template${NC}"
        echo -e "${YELLOW}📝 Please edit .env file with your settings before continuing${NC}"
        echo -e "${YELLOW}💡 Tip: You can continue with defaults for development${NC}"
        read -p "Press Enter to continue with default settings, or Ctrl+C to edit .env first..."
    else
        echo -e "${RED}❌ .env.example not found. Please create .env file manually${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env 2>/dev/null || echo -e "${YELLOW}⚠️ Could not load .env file${NC}"

# Check if Docker is running
echo -e "\n${BLUE}🐳 Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️ docker-compose not found, trying docker compose...${NC}"
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Neither docker-compose nor docker compose found${NC}"
        exit 1
    fi
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✅ Docker Compose is available${NC}"

# Stop any existing containers
echo -e "\n${BLUE}🛑 Stopping existing containers...${NC}"
$DOCKER_COMPOSE down > /dev/null 2>&1 || true

# Build and start services
echo -e "\n${BLUE}🏗️ Building and starting services...${NC}"
$DOCKER_COMPOSE up -d --build

# Wait for services to be ready
echo -e "\n${BLUE}⏳ Waiting for services to start...${NC}"

# Wait for PostgreSQL
echo -e "${YELLOW}📊 Waiting for PostgreSQL...${NC}"
timeout=30
counter=0
while ! docker exec mcp_postgres pg_isready -U postgres > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo -e "${RED}❌ PostgreSQL failed to start within $timeout seconds${NC}"
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Wait for MCP Server
echo -e "${YELLOW}🔧 Waiting for MCP Server...${NC}"
timeout=30
counter=0
while ! curl -s http://localhost:3001/health > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo -e "${RED}❌ MCP Server failed to start within $timeout seconds${NC}"
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done
echo -e "${GREEN}✅ MCP Server is ready${NC}"

# Wait for Backend
echo -e "${YELLOW}⚙️ Waiting for Express Backend...${NC}"
timeout=30
counter=0
while ! curl -s http://localhost:8000/health > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo -e "${RED}❌ Express Backend failed to start within $timeout seconds${NC}"
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done
echo -e "${GREEN}✅ Express Backend is ready${NC}"

# Wait for Frontend
echo -e "${YELLOW}🎨 Waiting for React Frontend...${NC}"
timeout=60  # Frontend may take longer to build
counter=0
while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo -e "${RED}❌ React Frontend failed to start within $timeout seconds${NC}"
        echo -e "${YELLOW}💡 Frontend might still be building, check docker logs${NC}"
        break
    fi
    sleep 2
    counter=$((counter + 2))
done

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ React Frontend is ready${NC}"
fi

# Show status
echo -e "\n${GREEN}🎉 MCP Application Started Successfully!${NC}"
echo -e "\n${BLUE}📋 Service Status:${NC}"

# Check each service
services=("mcp_postgres:PostgreSQL Database" "mcp_server:MCP Tools Server" "mcp_backend:Express Backend" "mcp_frontend:React Frontend")

for service_info in "${services[@]}"; do
    service_name="${service_info%%:*}"
    service_desc="${service_info##*:}"
    
    if docker ps --format "table {{.Names}}" | grep -q "$service_name"; then
        echo -e "${GREEN}✅ $service_desc${NC}"
    else
        echo -e "${RED}❌ $service_desc${NC}"
    fi
done

# Show access URLs
echo -e "\n${BLUE}🌐 Access URLs:${NC}"
echo -e "${GREEN}🎨 Frontend:${NC}        http://localhost:3000"
echo -e "${GREEN}⚙️ Backend API:${NC}     http://localhost:8000"
echo -e "${GREEN}📖 API Health:${NC}      http://localhost:8000/health"
echo -e "${GREEN}🔧 MCP Tools:${NC}       http://localhost:3001/tools"
echo -e "${GREEN}🏥 MCP Health:${NC}      http://localhost:3001/health"
echo -e "${GREEN}📊 Database:${NC}        localhost:5432 (postgres/postgres)"

# Show test commands
echo -e "\n${BLUE}🧪 Quick Test Commands:${NC}"
echo -e "${YELLOW}# Test backend health${NC}"
echo -e "curl http://localhost:8000/health"
echo -e "\n${YELLOW}# Test MCP tools${NC}"
echo -e "curl http://localhost:3001/tools"
echo -e "\n${YELLOW}# Test calculator${NC}"
echo -e "curl -X POST http://localhost:8000/api/mcp/call \\"
echo -e "  -H 'Content-Type: application/json' \\"
echo -e "  -d '{\"tool\":\"calculator\",\"params\":{\"expression\":\"5*7\"}}'"

# Show default login
echo -e "\n${BLUE}🔐 Default Login:${NC}"
echo -e "${GREEN}Email:${NC}    admin@example.com"
echo -e "${GREEN}Password:${NC} admin123!"

# Show log commands
echo -e "\n${BLUE}📋 Useful Commands:${NC}"
echo -e "${YELLOW}# View logs${NC}"
echo -e "$DOCKER_COMPOSE logs -f [service_name]"
echo -e "\n${YELLOW}# Stop services${NC}"
echo -e "$DOCKER_COMPOSE down"
echo -e "\n${YELLOW}# Restart services${NC}"
echo -e "$DOCKER_COMPOSE restart"
echo -e "\n${YELLOW}# Run validation${NC}"
echo -e "./scripts/validate-setup.sh"

echo -e "\n${GREEN}🚀 Your MCP application is ready to use!${NC}"
```

---

## 📝 Additional Utility Scripts

### Setup Validation Script (scripts/validate-setup.sh)
```bash
#!/bin/bash

# MCP Application Setup Validation Script

set -e

echo "🔍 MCP Application Setup Validation"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check Docker
echo ""
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        check_pass "Docker is running"
    else
        check_fail "Docker is installed but not running"
        exit 1
    fi
else
    check_fail "Docker is not installed"
    exit 1
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    check_pass "Docker Compose is available"
else
    check_fail "Docker Compose is not installed"
    exit 1
fi

# Check required files
echo ""
echo "📁 Checking required files..."

required_files=(
    ".env"
    "docker-compose.yml"
    "backend-express/package.json"
    "backend-express/server.js"
    "mcp-server/package.json"
    "mcp-server/server.js"
    "frontend/package.json"
    "frontend/src/App.jsx"
    "docker/postgres/init.sql"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file is missing"
    fi
done

# Check environment variables
echo ""
echo "⚙️ Checking environment configuration..."

if [ -f ".env" ]; then
    source .env
    
    required_vars=(
        "DATABASE_URL"
        "SECRET_KEY"
        "MCP_SERVER_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            check_pass "$var is set"
        else
            check_warn "$var is not set or empty"
        fi
    done
else
    check_fail ".env file not found"
fi

# Check services
echo ""
echo "🔧 Checking services..."

services=(
    "postgres:5432"
    "mcp-server:3001"
    "backend-express:8000"
    "frontend:3000"
)

for service in "${services[@]}"; do
    container_name="mcp_${service%%:*}"
    port="${service##*:}"
    
    if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
        check_pass "$container_name container is running"
        
        # Check if service responds
        if curl -s -f "http://localhost:$port" > /dev/null 2>&1 || curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
            check_pass "$container_name service is responding on port $port"
        else
            check_warn "$container_name service is not responding on port $port"
        fi
    else
        check_warn "$container_name container is not running"
    fi
done

# Test API endpoints
echo ""
echo "🌐 Testing API endpoints..."

api_tests=(
    "http://localhost:8000/health:Health check"
    "http://localhost:3001/tools:MCP tools list"
)

for test in "${api_tests[@]}"; do
    url="${test%%:*}"
    description="${test##*:}"
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        check_pass "$description ($url)"
    else
        check_warn "$description not responding ($url)"
    fi
done

# Test MCP integration
echo ""
echo "🔧 Testing MCP integration..."

mcp_test=$(curl -s -X POST "http://localhost:8000/api/mcp/call" \
    -H "Content-Type: application/json" \
    -d '{"tool":"calculator","params":{"expression":"2+2"}}' 2>/dev/null)

if echo "$mcp_test" | grep -q '"success":true'; then
    check_pass "MCP calculator tool is working"
else
    check_warn "MCP calculator tool is not responding correctly"
fi

# Check database
echo ""
echo "🗄️ Testing database..."

if docker exec mcp_postgres pg_isready -U postgres > /dev/null 2>&1; then
    check_pass "Database connection is working"
    
    # Check tables
    tables=$(docker exec mcp_postgres psql -U postgres -d mcp_starter -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' ')
    
    required_tables=("users" "tasks" "tool_usage" "calculations")
    for table in "${required_tables[@]}"; do
        if echo "$tables" | grep -q "$table"; then
            check_pass "Table '$table' exists"
        else
            check_warn "Table '$table' is missing"
        fi
    done
else
    check_fail "Cannot connect to database"
fi

# Performance checks
echo ""
echo "⚡ Performance checks..."

# Check disk space
disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    check_pass "Disk space is sufficient ($disk_usage% used)"
else
    check_warn "Disk space is low ($disk_usage% used)"
fi

# Check memory
total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
if [ "$total_mem" -gt 2 ]; then
    check_pass "Memory is sufficient (${total_mem}GB)"
else
    check_warn "Memory might be low (${total_mem}GB)"
fi

# Summary
echo ""
echo "📊 Validation Summary"
echo "===================="

# Count containers
running_containers=$(docker ps --filter "name=mcp_" --format "table {{.Names}}" | grep -c mcp || echo "0")
echo "🐳 Running containers: $running_containers/4"

# Check overall health
if [ "$running_containers" -eq 4 ]; then
    echo -e "${GREEN}🎉 All services are running successfully!${NC}"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:8000"
    echo "   MCP Tools: http://localhost:3001/tools"
    echo ""
    echo "🧪 Quick test commands:"
    echo "   curl http://localhost:8000/health"
    echo "   curl http://localhost:3001/tools"
    echo "   curl -X POST http://localhost:8000/api/mcp/call -H 'Content-Type: application/json' -d '{\"tool\":\"calculator\",\"params\":{\"expression\":\"5*7\"}}'"
else
    echo -e "${YELLOW}⚠️ Some services are not running. Check the logs:${NC}"
    echo "   docker-compose logs [service_name]"
    echo ""
    echo "🔧 To start all services:"
    echo "   docker-compose up -d"
fi

echo ""
echo "✅ Validation complete!"
```

### Development Setup Script (scripts/setup-development.sh)
```bash
#!/bin/bash

# Development Environment Setup Script

set -e

echo "🛠️  Setting up MCP Development Environment"
echo "=========================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup backend
echo ""
echo "⚙️ Setting up Express backend..."
cd backend-express
npm install
echo "✅ Backend dependencies installed"

# Setup frontend  
echo ""
echo "🎨 Setting up React frontend..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"

# Setup MCP server
echo ""
echo "🔧 Setting up MCP server..."
cd ../mcp-server
npm install
echo "✅ MCP server dependencies installed"

# Setup Python agents
echo ""
echo "🤖 Setting up AI agents..."
cd ../agents
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt 2>/dev/null || pip install langchain openai requests python-dotenv schedule
echo "✅ AI agents environment ready"

# Return to project root
cd ..

# Setup environment file
if [ ! -f ".env" ]; then
    echo ""
    echo "📄 Creating environment file..."
    cp .env.example .env
    echo "✅ Environment file created. Please edit .env with your settings."
else
    echo "✅ Environment file already exists"
fi

# Make scripts executable
echo ""
echo "🔒 Setting up permissions..."
chmod +x scripts/*.sh
chmod +x start-express.sh
echo "✅ Scripts are now executable"

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file with your configuration"
echo "   2. Start PostgreSQL: docker run --name postgres-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mcp_starter -p 5432:5432 -d postgres:15"
echo "   3. Run ./start-express.sh to start all services"
echo "   4. Or start services individually:"
echo "      - MCP Server: cd mcp-server && npm start"
echo "      - Backend: cd backend-express && npm run dev"  
echo "      - Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Access URLs:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:8000"
echo "   - MCP Tools: http://localhost:3001/tools"
```

### Backup Script (scripts/backup.sh)
```bash
#!/bin/bash

# MCP Application Backup Script
# Usage: ./backup.sh [backup_name]

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME=${1:-"mcp_backup_$TIMESTAMP"}
BACKUP_DIR="./backups"
PROJECT_ROOT="$(dirname "$(dirname "$(realpath "$0")")")"

echo "🔄 Starting backup process..."
echo "📁 Backup name: $BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
echo "📊 Backing up PostgreSQL database..."
docker exec mcp_postgres pg_dump -U postgres -d mcp_starter > "$BACKUP_DIR/${BACKUP_NAME}_database.sql"

# Application files backup
echo "📦 Backing up application files..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='logs' \
    --exclude='*.log' \
    -C "$PROJECT_ROOT" .

# Environment backup
echo "⚙️ Backing up environment configuration..."
cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/${BACKUP_NAME}_env.bak" 2>/dev/null || echo "No .env file found"

# Docker volumes backup
echo "🐳 Backing up Docker volumes..."
docker run --rm \
    -v mcp_postgres_data:/data \
    -v "$PWD/$BACKUP_DIR":/backup \
    alpine tar czf "/backup/${BACKUP_NAME}_postgres_data.tar.gz" -C /data .

# Create manifest
echo "📋 Creating backup manifest..."
cat > "$BACKUP_DIR/${BACKUP_NAME}_manifest.txt" << EOF
MCP Application Backup Manifest
==============================
Backup Name: $BACKUP_NAME
Created: $(date)
Files:
- ${BACKUP_NAME}_database.sql (PostgreSQL dump)
- ${BACKUP_NAME}_app.tar.gz (Application source code)
- ${BACKUP_NAME}_env.bak (Environment variables)
- ${BACKUP_NAME}_postgres_data.tar.gz (PostgreSQL data volume)

Restore Instructions:
1. Stop all services: docker-compose down
2. Restore database: docker exec -i mcp_postgres psql -U postgres -d mcp_starter < ${BACKUP_NAME}_database.sql
3. Extract app files: tar -xzf ${BACKUP_NAME}_app.tar.gz
4. Restore environment: cp ${BACKUP_NAME}_env.bak .env
5. Restore data volume: docker run --rm -v mcp_postgres_data:/data -v \$PWD:/backup alpine tar xzf /backup/${BACKUP_NAME}_postgres_data.tar.gz -C /data
6. Start services: docker-compose up -d
EOF

echo "✅ Backup completed successfully!"
echo "📍 Backup location: $BACKUP_DIR"
echo "📄 Manifest: $BACKUP_DIR/${BACKUP_NAME}_manifest.txt"

# List backup files
echo ""
echo "📦 Backup files:"
ls -lh "$BACKUP_DIR"/${BACKUP_NAME}_*
```

---

## 📚 Complete Documentation

### Main README.md
```markdown
# 🚀 MCP Full-Stack Application

A complete starter template for building AI-native applications with **Express.js + React + PostgreSQL + MCP integration**.

## 🎯 Features

- **🔐 Authentication System** - JWT-based user registration and login
- **📋 Task Management** - Complete CRUD operations for tasks
- **🔧 MCP Tools Integration** - Calculator, database operations, AI assistant
- **🤖 AI Agents** - LangChain integration with automated workflows
- **📊 Dashboard** - Real-time statistics and analytics
- **🎨 Modern UI** - React with Tailwind CSS
- **🐳 Docker Ready** - Complete containerization for all services
- **🔍 Monitoring** - Health checks and error tracking
- **🛡️ Security** - Rate limiting, CORS, input validation, SSL ready

## 📦 Tech Stack

### Backend
- **Express.js** - Node.js web framework
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Express Validator** - Input validation

### Frontend  
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### MCP Server
- **Node.js** - JSON-RPC server
- **Custom Tools** - Calculator, database, AI assistant

### AI Integration
- **LangChain** - AI agent framework
- **OpenAI API** - GPT integration
- **Python** - Agent workflows

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Service orchestration
- **Nginx** - Reverse proxy
- **PostgreSQL** - Database

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for AI agents)

### Installation

1. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd mcp-fullstack-app
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start with Docker (Recommended)**
   ```bash
   chmod +x start-express.sh
   ./start-express.sh
   ```

3. **Validate Installation**
   ```bash
   ./scripts/validate-setup.sh
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - MCP Tools: http://localhost:3001/tools

### Manual Setup (Development)

1. **Database**
   ```bash
   docker run --name postgres-dev \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=mcp_starter \
     -p 5432:5432 -d postgres:15
   ```

2. **MCP Server**
   ```bash
   cd mcp-server
   npm install
   npm start
   ```

3. **Backend**
   ```bash
   cd backend-express
   npm install
   npm run dev
   ```

4. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:8000/health

# Register user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Test123!"}'

# Test MCP calculator
curl -X POST http://localhost:8000/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool":"calculator","params":{"expression":"25*17+100"}}'
```

### Running Test Suite
```bash
cd backend-express
npm test
npm run test:coverage
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user

### Task Management  
- `GET /api/tasks` - Get user tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get specific task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/stats/summary` - Get task statistics

### MCP Integration
- `POST /api/mcp/call` - Call MCP tool
- `GET /api/mcp/tools` - List available tools
- `GET /api/mcp/usage` - Get usage history
- `GET /api/mcp/stats` - Get usage statistics

## 🔧 MCP Tools

### Calculator Tool
```javascript
// Example usage
{
  "tool": "calculator",
  "params": {
    "expression": "2+3*4"
  }
}
```

### Database Tool
```javascript
// Select data
{
  "tool": "database",
  "params": {
    "action": "select",
    "table": "tasks",
    "where": {"status": "completed"}
  }
}

// Insert data
{
  "tool": "database", 
  "params": {
    "action": "insert",
    "table": "tasks",
    "data": {
      "title": "New Task",
      "description": "Task description",
      "user_id": 1
    }
  }
}
```

### AI Assistant Tool
```javascript
{
  "tool": "ai-assistant",
  "params": {
    "prompt": "Explain the MCP protocol in simple terms",
    "model": "gpt-3.5-turbo",
    "maxTokens": 150
  }
}
```

## 🤖 AI Agents

### LangChain Agent
```python
from agents.langchain_agent import MCPLangChainAgent

agent = MCPLangChainAgent()
response = agent.chat("Calculate 25 * 17 and create a task to review the result")
```

### Automated Workflows
```python
from agents.workflows.task_automation import TaskAutomationWorkflow

workflow = TaskAutomationWorkflow()
# Runs daily summaries and overdue task analysis
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** on API endpoints
- **Input Validation** on all user inputs  
- **CORS Protection** with configurable origins
- **SQL Injection Prevention** using parameterized queries
- **XSS Protection** with security headers
- **HTTPS Ready** with SSL configuration

## 📊 Monitoring

### Health Checks
- Database connectivity
- MCP server status
- Service response times
- Error rates

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=mcp_starter

# Authentication
SECRET_KEY=your-secret-key
JWT_EXPIRATION=24h

# MCP Server
MCP_SERVER_URL=http://localhost:3001

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Frontend
VITE_API_URL=http://localhost:8000
```

## 🛠️ Development

### Project Structure
```
├── backend-express/     # Express.js API server
├── frontend/           # React frontend app
├── mcp-server/         # MCP tools server
├── agents/             # AI agents and workflows
├── docker/             # Docker configurations
├── scripts/            # Utility scripts
└── docs/              # Documentation
```

### Adding New MCP Tools
1. Create tool file in `mcp-server/tools/`
2. Export function with proper error handling
3. Add to tools list in `mcp-server/server.js`
4. Update frontend UI in `MCPTools.jsx`

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 🆘 Troubleshooting

### Common Issues

**Port Conflicts**
```bash
lsof -i :8000  # Check what's using port
kill -9 <PID>  # Kill the process
```

**Database Connection Issues**
```bash
docker logs mcp_postgres  # Check logs
psql -h localhost -U postgres -c "SELECT 1"  # Test connection
```

**MCP Server Not Responding**
```bash
curl http://localhost:3001/tools  # Test MCP server
docker logs mcp_server  # Check logs
```

**Frontend Build Issues**
```bash
rm -rf node_modules package-lock.json
npm install  # Reinstall dependencies
```

### Getting Help
- Check the [documentation](./docs/)
- Run `./scripts/validate-setup.sh` for diagnostics

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the MCP specification
- [Express.js](https://expressjs.com/) team
- [React](https://react.dev/) team  
- [LangChain](https://langchain.com/) community

---

**Built with ❤️ for the MCP community**
```

---

## 🎯 Summary

This complete Express.js MCP setup provides you with:

### ✅ **Production-Ready Components**
- **Express.js Backend** with authentication, validation, and security
- **React Frontend** with modern UI and responsive design
- **MCP Tools Server** with calculator, database, and AI integration
- **PostgreSQL Database** with optimized schema and indexing
- **Docker Configuration** for easy deployment and scaling

### ✅ **Advanced Features**
- **JWT Authentication** with secure password handling
- **Rate Limiting** and CORS protection
- **Input Validation** and SQL injection prevention
- **Health Checks** and monitoring endpoints
- **AI Agents** with LangChain integration
- **Automated Workflows** for task management

### ✅ **Developer Experience**
- **One-Command Setup** with validation scripts
- **Comprehensive Testing** suite with examples
- **Complete Documentation** with troubleshooting
- **Backup/Restore** utilities for data safety
- **Development Scripts** for easy local setup

### 🚀 **Next Steps**

1. **Clone the structure** and customize for your needs
2. **Add your own MCP tools** following the examples
3. **Implement domain-specific features** using the base framework
4. **Deploy to production** using the provided Docker configuration
5. **Scale and monitor** using the built-in health checks

This is a **complete, production-ready foundation** for building sophisticated AI-native applications with the Model Context Protocol!# 🚀 Complete Express.js MCP Full-Stack Setup

A comprehensive, production-ready starter template for building AI-native applications with **Express.js + React + PostgreSQL + MCP integration**.

## 🎯 What You'll Build

- **🔐 Complete Authentication System** - JWT-based auth with secure password handling
- **📊 Task Management System** - Full CRUD operations with PostgreSQL
- **🛠️ MCP Tools Integration** - Calculator, database operations, AI assistant
- **🤖 AI Agents** - LangChain integration with automated workflows
- **🎨 Modern React Frontend** - Responsive UI with Tailwind CSS
- **🐳 Production Deployment** - Docker containers with monitoring
- **🧪 Complete Testing Suite** - Unit tests, integration tests, and validation

---

## 📁 Project Structure

```
mcp-fullstack-app/
├── 🎨 frontend/                    # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Navigation.jsx      # Main navigation
│   │   │   └── ProtectedRoute.jsx  # Route protection
│   │   ├── pages/                  # Application pages
│   │   │   ├── Dashboard.jsx       # Main dashboard
│   │   │   ├── Login.jsx           # Login form
│   │   │   ├── Register.jsx        # Registration form
│   │   │   ├── Tasks.jsx           # Task management
│   │   │   ├── MCPTools.jsx        # MCP tools interface
│   │   │   └── Profile.jsx         # User profile
│   │   ├── contexts/               # React contexts
│   │   │   └── AuthContext.jsx     # Authentication state
│   │   ├── utils/                  # Utility functions
│   │   │   └── api.js              # API client
│   │   ├── App.jsx                 # Main app component
│   │   └── main.jsx               # React entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── ⚙️ backend-express/             # Express.js Backend
│   ├── routes/                     # API routes
│   │   ├── auth.js                 # Authentication endpoints
│   │   ├── users.js                # User management
│   │   ├── tasks.js                # Task operations
│   │   └── mcp.js                  # MCP integration
│   ├── middleware/                 # Express middleware
│   │   ├── auth.js                 # JWT authentication
│   │   ├── validation.js           # Input validation
│   │   └── rateLimiting.js         # Rate limiting
│   ├── config/                     # Configuration
│   │   └── database.js             # PostgreSQL connection
│   ├── tests/                      # Test suites
│   │   ├── auth.test.js            # Authentication tests
│   │   ├── tasks.test.js           # Task management tests
│   │   └── mcp.test.js             # MCP integration tests
│   ├── server.js                   # Main Express server
│   ├── package.json
│   └── Dockerfile
├── 🔧 mcp-server/                  # MCP Tools Server
│   ├── tools/                      # Individual MCP tools
│   │   ├── calculator.js           # Math operations
│   │   ├── database.js             # Database operations
│   │   └── ai-assistant.js         # AI integrations
│   ├── server.js                   # JSON-RPC server
│   ├── package.json
│   └── Dockerfile
├── 🤖 agents/                      # AI Agents & Workflows
│   ├── langchain_agent.py          # LangChain integration
│   ├── workflows/                  # Automated workflows
│   │   └── task_automation.py      # Task automation
│   └── requirements.txt
├── 🐳 docker/                      # Docker configurations
│   ├── postgres/                   # PostgreSQL setup
│   │   ├── init.sql                # Database schema
│   │   └── docker-entrypoint-initdb.d/
│   ├── nginx/                      # Nginx configuration
│   │   ├── nginx.conf              # Development config
│   │   └── nginx.prod.conf         # Production config
│   └── monitoring/                 # Monitoring setup
│       └── docker-compose.monitoring.yml
├── 📚 scripts/                     # Utility scripts
│   ├── setup-development.sh       # Development setup
│   ├── validate-setup.sh          # Setup validation
│   ├── backup.sh                  # Database backup
│   └── restore.sh                 # Database restore
├── 📄 docs/                        # Documentation
├── docker-compose.yml              # Development environment
├── docker-compose.prod.yml         # Production environment
├── .env.example                    # Environment template
├── start-express.sh               # Quick start script
└── README.md                      # Project documentation
```

---

## 🚀 Quick Start (3 Commands)

### 1. Clone and Configure
```bash
git clone <your-repo-url> my-mcp-app
cd my-mcp-app
cp .env.example .env
# Edit .env with your settings
```

### 2. Start Everything
```bash
chmod +x start-express.sh
./start-express.sh
```

### 3. Validate Setup
```bash
./scripts/validate-setup.sh
```

**🎉 Your application is now running!**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- MCP Tools: http://localhost:3001/tools

---

## 📋 Detailed Setup

### Environment Configuration (.env)
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcp_starter
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mcp_starter

# Express Backend Configuration
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
PORT=8000

# MCP Server Configuration  
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_PORT=3001

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:8000

# AI Services (Optional)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Manual Development Setup

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

#### 2. Backend Setup (Express.js)
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

#### 4. Frontend Setup (React)
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

#### 5. AI Agents Setup (Optional)
```bash
cd agents
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## 🏗️ Core Components

### Express Backend (`backend-express/`)

#### Main Server (server.js)
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/mcp', require('./routes/mcp'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app };
```

#### Authentication Route (routes/auth.js)
```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('username').isLength({ min: 3, max: 30 }).trim().withMessage('Username must be 3-30 characters'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password required'),
];

// Register endpoint
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const { email, username, password } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'User already exists with this email or username',
        code: 'USER_EXISTS'
      });
    }

    // Hash password with high salt rounds
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (email, username, hashed_password, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING id, email, username, created_at`,
      [email, username, hashedPassword]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.rows[0].id,
        email: newUser.rows[0].email,
        username: newUser.rows[0].username
      },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
    );

    // Log successful registration
    console.log(`✅ User registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        username: newUser.rows[0].username,
        created_at: newUser.rows[0].created_at
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login endpoint
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, username, hashed_password, is_active, last_login FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashed_password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        username: user.username
      },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
    );

    // Log successful login
    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        last_login: new Date().toISOString()
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, username, created_at, last_login, is_active FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user: userResult.rows[0]
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      code: 'GET_USER_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    // Generate new token with extended expiration
    const token = jwt.sign(
      { 
        userId: req.user.id,
        email: req.user.email,
        username: req.user.username
      },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh token',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
});

// Logout (optional - mainly for logging purposes)
router.post('/logout', authenticateToken, (req, res) => {
  // In a JWT setup, logout is handled client-side by removing the token
  // This endpoint is mainly for logging and potential token blacklisting
  console.log(`✅ User logged out: ${req.user.email}`);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
```

#### Task Management Route (routes/tasks.js)
```javascript
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Validation rules
const createTaskValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be 1-200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid due date format')
];

const updateTaskValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid task ID required'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid due date format')
];

const getTasksValidation = [
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status filter'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority filter'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('sort').optional().isIn(['created_at', 'updated_at', 'due_date', 'title', 'priority']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
];

// Get all tasks for user
router.get('/', getTasksValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { 
      status, 
      priority, 
      limit = 20, 
      offset = 0, 
      sort = 'created_at', 
      order = 'desc' 
    } = req.query;

    // Build WHERE clause
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    if (priority) {
      paramCount++;
      whereClause += ` AND priority = $${paramCount}`;
      queryParams.push(priority);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM tasks ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get tasks with pagination
    const tasksQuery = `
      SELECT 
        id, title, description, status, priority, due_date,
        created_at, updated_at, completed_at
      FROM tasks 
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    const tasksResult = await pool.query(tasksQuery, queryParams);

    res.json({
      success: true,
      tasks: tasksResult.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve tasks',
      code: 'GET_TASKS_ERROR'
    });
  }
});

// Get single task
router.get('/:id', param('id').isInt({ min: 1 }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const taskId = parseInt(req.params.id);

    const taskResult = await pool.query(
      `SELECT 
        id, title, description, status, priority, due_date,
        created_at, updated_at, completed_at
       FROM tasks 
       WHERE id = $1 AND user_id = $2`,
      [taskId, req.user.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      task: taskResult.rows[0]
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve task',
      code: 'GET_TASK_ERROR'
    });
  }
});

// Create new task
router.post('/', createTaskValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { 
      title, 
      description = '', 
      status = 'pending', 
      priority = 'medium', 
      due_date 
    } = req.body;

    const newTaskResult = await pool.query(
      `INSERT INTO tasks (
        title, description, status, priority, due_date, user_id, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, title, description, status, priority, due_date, created_at, updated_at`,
      [title, description, status, priority, due_date, req.user.id]
    );

    console.log(`✅ Task created: ${title} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: newTaskResult.rows[0]
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ 
      error: 'Failed to create task',
      code: 'CREATE_TASK_ERROR'
    });
  }
});

// Update task
router.put('/:id', updateTaskValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const taskId = parseInt(req.params.id);
    const updates = req.body;

    // Check if task exists and belongs to user
    const existingTask = await pool.query(
      'SELECT id, status FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, req.user.id]
    );

    if (existingTask.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const queryParams = [taskId, req.user.id];
    let paramCount = 2;

    // Handle completion date logic
    if (updates.status === 'completed' && existingTask.rows[0].status !== 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'completed') {
      updates.completed_at = null;
    }

    for (const [key, value] of Object.entries(updates)) {
      if (['title', 'description', 'status', 'priority', 'due_date', 'completed_at'].includes(key)) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        queryParams.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      });
    }

    // Add updated_at
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    queryParams.push(new Date().toISOString());

    const updateQuery = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING id, title, description, status, priority, due_date, 
                created_at, updated_at, completed_at
    `;

    const updateResult = await pool.query(updateQuery, queryParams);

    console.log(`✅ Task updated: ${taskId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ 
      error: 'Failed to update task',
      code: 'UPDATE_TASK_ERROR'
    });
  }
});

// Delete task
router.delete('/:id', param('id').isInt({ min: 1 }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const taskId = parseInt(req.params.id);

    const deleteResult = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title',
      [taskId, req.user.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    console.log(`✅ Task deleted: ${deleteResult.rows[0].title} (${taskId}) by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Task deleted successfully',
      deletedTask: deleteResult.rows[0]
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ 
      error: 'Failed to delete task',
      code: 'DELETE_TASK_ERROR'
    });
  }
});

// Get task statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_tasks,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as tasks_this_week,
        COUNT(CASE WHEN completed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as completed_this_week,
        COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END) as overdue_tasks
      FROM tasks 
      WHERE user_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [req.user.id]);

    // Calculate completion rate
    const stats = statsResult.rows[0];
    const completionRate = stats.total_tasks > 0 
      ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
      : 0;

    res.json({
      success: true,
      stats: {
        ...stats,
        completion_rate: completionRate,
        total_tasks: parseInt(stats.total_tasks),
        completed_tasks: parseInt(stats.completed_tasks),
        pending_tasks: parseInt(stats.pending_tasks),
        in_progress_tasks: parseInt(stats.in_progress_tasks),
        cancelled_tasks: parseInt(stats.cancelled_tasks),
        tasks_this_week: parseInt(stats.tasks_this_week),
        completed_this_week: parseInt(stats.completed_this_week),
        overdue_tasks: parseInt(stats.overdue_tasks)
      }
    });

  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get task statistics',
      code: 'GET_STATS_ERROR'
    });
  }
});

module.exports = router;
    