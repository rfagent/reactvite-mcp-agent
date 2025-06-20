#!/usr/bin/env python3
"""
Quick diagnostic script to test MCP agent
"""

import os
import sys
import time

def main():
    print("🔍 MCP Agent Diagnostic Test")
    print("=" * 40)
    
    # Get task from stdin
    try:
        if len(sys.argv) > 1:
            task = " ".join(sys.argv[1:])
        else:
            task = sys.stdin.read().strip()
    except:
        task = "test task"
    
    print(f"📋 Task: {task}")
    
    # Create sandbox directory
    sandbox_path = os.path.join(os.getcwd(), "sandbox")
    os.makedirs(sandbox_path, exist_ok=True)
    print(f"📁 Sandbox: {sandbox_path}")
    
    # Simple mock execution
    print("🧪 Running diagnostic test...")
    
    for i in range(3):
        print(f"Step {i+1}: Processing...")
        time.sleep(0.5)
    
    # Create a test file
    filename = "diagnostic_test.md"
    content = f"""# Diagnostic Test Results

## Test Information
- Task: {task}
- Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}
- Working Directory: {os.getcwd()}
- Sandbox Path: {sandbox_path}

## Status
✅ Python script executed successfully
✅ Sandbox directory created
✅ File writing works

## Next Steps
If you see this file in your web interface, the basic functionality is working.
The JSON parsing error is likely in the server communication, not the Python script.
"""
    
    output_file = os.path.join(sandbox_path, filename)
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Created file: {filename}")
    except Exception as e:
        print(f"❌ File creation failed: {e}")
        return False
    
    print("🎉 Diagnostic test completed successfully!")
    print(f"Final result: Diagnostic test passed - created {filename}")
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("SUCCESS")
            sys.exit(0)
        else:
            print("FAILED") 
            sys.exit(1)
    except Exception as e:
        print(f"❌ Diagnostic error: {e}")
        print("FAILED")
        sys.exit(1)