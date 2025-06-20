// Point to your actual Node.js server
const API_BASE = 'http://localhost:3000';

let isRunning = false;

// Check server status on load
document.addEventListener('DOMContentLoaded', function() {
    checkServerStatus();
    document.getElementById('taskInput').focus();
});

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        if (response.ok) {
            document.getElementById('serverStatus').textContent = '🟢 Connected';
        } else {
            document.getElementById('serverStatus').textContent = '🟡 Warning';
        }
    } catch (error) {
        document.getElementById('serverStatus').textContent = '🔴 Disconnected';
    }
}

function setTask(task) {
    document.getElementById('taskInput').value = task;
    document.getElementById('taskInput').focus();
}

async function runAgent() {
    if (isRunning) return;

    const task = document.getElementById('taskInput').value.trim();
    if (!task) {
        alert('Please enter a task for the agent to perform.');
        return;
    }

    // Set loading state
    isRunning = true;
    const runButton = document.getElementById('runButton');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');

    runButton.disabled = true;
    buttonText.style.display = 'none';
    spinner.style.display = 'inline-block';

    // Hide previous results/errors
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';

    try {
        console.log('Running agent with task:', task);
        console.log('API URL:', `${API_BASE}/api/agent/run`);

        const response = await fetch(`${API_BASE}/api/agent/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            showResults(data);
        } else {
            showError(data.error, task);
        }

    } catch (error) {
        console.error('Agent execution error:', error);
        showError(error.message, task);
    } finally {
        // Reset button state
        isRunning = false;
        runButton.disabled = false;
        buttonText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

function showResults(data) {
    // Populate result info
    document.getElementById('executedTask').textContent = data.task;
    document.getElementById('taskStatus').textContent = '✅ Completed Successfully';
    document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString();

    // Show agent output
    document.getElementById('agentOutput').textContent = data.output || 'Agent completed successfully.';

    // Show files if any
    const filesSection = document.getElementById('filesSection');
    const filesList = document.getElementById('filesList');

    if (data.files && data.files.length > 0) {
        filesList.innerHTML = '';
        data.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <a href="${API_BASE}${file.path}" target="_blank" download="${file.name}">
                    📄 ${file.name}
                </a>
                <div class="file-info">Size: ${formatFileSize(file.size)}</div>
            `;
            filesList.appendChild(fileItem);
        });
        filesSection.style.display = 'block';
    } else {
        filesSection.style.display = 'none';
    }

    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

function showError(errorMessage, task) {
    document.getElementById('errorMessage').textContent = `Failed to execute task: ${errorMessage}`;
    document.getElementById('errorDetails').textContent = `Task: ${task}\nError: ${errorMessage}\nTimestamp: ${new Date().toISOString()}`;

    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorSection').scrollIntoView({ behavior: 'smooth' });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Allow Enter key to run agent (Ctrl+Enter for multiline)
document.getElementById('taskInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        runAgent();
    }
});

// Auto-resize textarea
document.getElementById('taskInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});