// Enhanced debug script that works from tests/ directory
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 Debug: Checking project structure from tests directory...");
console.log("📁 Script location:", __dirname);

// Find the project root directory (go up one level from tests/)
const projectRoot = path.dirname(__dirname);
console.log("📁 Project root:", projectRoot);

// Verify this is the correct project root
const packageJsonPath = path.join(projectRoot, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.log("❌ No package.json found in parent directory");
  console.log("🔍 This script should be in PROJECT_ROOT/tests/");
  process.exit(1);
}

try {
  const packageContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageContent.name !== 'express-mcp-server') {
    console.log(`⚠️  Found package.json but name is '${packageContent.name}', expected 'express-mcp-server'`);
  } else {
    console.log("✅ Found correct project package.json");
  }
} catch (err) {
  console.log("❌ Error reading package.json:", err.message);
}

// Check required files relative to project root
const requiredFiles = [
  'package.json',
  'combined-app.js', 
  'mcp_server.js',
  'public/index.html',
  'public/style.css',
  'public/script.js'
];

console.log("\n📋 File check (from project root):");
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  const exists = fs.existsSync(filePath);
  
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  console.log(`   📍 Looking at: ${filePath}`);
  
  if (!exists) {
    allFilesExist = false;
  }
  
  if (exists && file.endsWith('.js')) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      console.log(`   📄 ${lines} lines, ${content.length} characters`);
      
      // Check for port configuration
      if (file === 'combined-app.js') {
        if (content.includes('const port = 3000')) {
          console.log(`   ✅ Using port 3000`);
        } else if (content.includes('63342')) {
          console.log(`   ⚠️  Warning: Still references port 63342`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Error reading ${file}: ${err.message}`);
    }
  }
});

// Check dependencies
console.log("\n📦 Dependency check:");
try {
  const packageContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = ['express', '@modelcontextprotocol/sdk', 'zod'];
  requiredDeps.forEach(dep => {
    if (packageContent.dependencies && packageContent.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageContent.dependencies[dep]}`);
    } else {
      console.log(`❌ Missing dependency: ${dep}`);
      allFilesExist = false;
    }
  });
} catch (err) {
  console.log("❌ Error checking dependencies:", err.message);
}

// Test imports
console.log("\n🧪 Testing imports...");
try {
  const { spawn } = await import('child_process');
  console.log("✅ child_process import works");
} catch (err) {
  console.log("❌ child_process import failed:", err.message);
  allFilesExist = false;
}

try {
  const express = await import('express');
  console.log("✅ express import works");
} catch (err) {
  console.log("❌ express import failed:", err.message);
  allFilesExist = false;
}

// Show navigation info
console.log("\n📍 Directory navigation:");
console.log(`   You are in: ${process.cwd()}`);
console.log(`   Tests directory: ${__dirname}`);
console.log(`   Project root: ${projectRoot}`);
console.log(`   To go to project root: cd ${path.relative(process.cwd(), projectRoot)}`);

// Final recommendations
console.log("\n🎯 Next steps:");
if (allFilesExist) {
  console.log("✅ All files and dependencies found!");
  
  const relativePathToRoot = path.relative(process.cwd(), projectRoot);
  if (relativePathToRoot) {
    console.log(`🚀 Run: cd ${relativePathToRoot} && node combined-app.js`);
  } else {
    console.log(`🚀 Run: node combined-app.js`);
  }
  console.log("🌐 Then visit: http://localhost:3000");
} else {
  console.log("❌ Some issues found. Please fix the missing files/dependencies above.");
}

// Quick commands
console.log("\n🛠️  Quick commands:");
const cdCommand = path.relative(process.cwd(), projectRoot);
if (cdCommand) {
  console.log(`   cd ${cdCommand}                    # Go to project root`);
  console.log(`   cd ${cdCommand} && npm install     # Install dependencies`);
  console.log(`   cd ${cdCommand} && node combined-app.js  # Start server`);
} else {
  console.log(`   npm install                       # Install dependencies`);
  console.log(`   node combined-app.js             # Start server`);
}