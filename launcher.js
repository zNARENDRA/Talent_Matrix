import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\x1b[36m%s\x1b[0m', '=======================================================================');
console.log('\x1b[36m%s\x1b[0m', '             TALENTMATRIX ENTERPRISE PLATFORM LAUNCHER                 ');
console.log('\x1b[36m%s\x1b[0m', '=======================================================================');
console.log('');

// Clean up any lingering processes on ports 3001 and 5173
function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== `${process.pid}`) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`\x1b[33m[LAUNCHER]\x1b[0m Freed port ${port} (terminated PID ${pid})`);
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // Port is already free
  }
}

console.log('\x1b[33m[LAUNCHER]\x1b[0m Checking and clearing ports 3001 & 5173...');
freePort(3001);
freePort(5173);

// Helper to run commands
function runProcess(name, command, args, cwd, color) {
  console.log(`\x1b[33m[LAUNCHER]\x1b[0m Starting ${name}...`);
  const isWindows = process.platform === 'win32';
  const child = spawn(isWindows ? `${command}.cmd` : command, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWindows,
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      console.log(`${color}[${name}]\x1b[0m ${line}`);
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      console.error(`\x1b[31m[${name} ERR]\x1b[0m ${line}`);
    }
  });

  child.on('error', (err) => {
    console.error(`\x1b[31m[${name} ERROR]\x1b[0m Failed to start:`, err.message);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\x1b[33m[LAUNCHER]\x1b[0m ${name} exited with code ${code}`);
    }
  });

  return child;
}

// 1. Start Backend Server
const serverProcess = runProcess(
  'BACKEND',
  'npx',
  ['tsx', 'src/app.ts'],
  path.join(__dirname, 'server'),
  '\x1b[34m' // Blue
);

// 2. Start Frontend Dev Server
const clientProcess = runProcess(
  'FRONTEND',
  'npm',
  ['run', 'dev'],
  path.join(__dirname, 'client'),
  '\x1b[32m' // Green
);

// Helper to open browser
function openBrowser(url) {
  const isWindows = process.platform === 'win32';
  const startCmd = isWindows ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(isWindows ? 'cmd' : startCmd, isWindows ? ['/c', 'start', url] : [url], { shell: true });
}

// Wait for frontend to become ready and open browser
let browserOpened = false;
function pollServer() {
  if (browserOpened) return;
  const req = http.get('http://localhost:5173', (res) => {
    if (!browserOpened) {
      browserOpened = true;
      console.log('');
      console.log('\x1b[32m%s\x1b[0m', '=======================================================================');
      console.log('\x1b[32m%s\x1b[0m', '       TALENTMATRIX IS LIVE AND READY! OPENING YOUR BROWSER...        ');
      console.log('\x1b[32m%s\x1b[0m', '=======================================================================');
      console.log('  ➜ \x1b[1mFrontend Dashboard:\x1b[0m  http://localhost:5173');
      console.log('  ➜ \x1b[1mBackend API Server:\x1b[0m  http://localhost:3001');
      console.log('');
      console.log('\x1b[90m(Keep this window open while using the application. Press Ctrl+C to stop)\x1b[0m');
      console.log('');
      openBrowser('http://localhost:5173');
    }
  });

  req.on('error', () => {
    setTimeout(pollServer, 800);
  });
}

// Start polling
setTimeout(pollServer, 1000);

// Clean exit on Ctrl+C
function cleanup() {
  console.log('\n\x1b[33m[LAUNCHER] Shutting down TalentMatrix services...\x1b[0m');
  try {
    serverProcess.kill('SIGTERM');
    clientProcess.kill('SIGTERM');
  } catch (e) {}
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
