const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

let mlProc = null;
let starting = false;

function getMlBase() {
  const raw = process.env.ML_MODEL_URL || 'http://localhost:8000';
  try {
    const u = new URL(raw);
    return u.origin;
  } catch (e) {
    try {
      const u = new URL(`http://${raw}`);
      return u.origin;
    } catch {
      return 'http://localhost:8000';
    }
  }
}

async function isUp() {
  const base = getMlBase();
  try {
    const { data } = await axios.get(`${base}/` , { timeout: 1500 });
    return !!data && data.service === 'ml-service';
  } catch {
    return false;
  }
}

async function waitUntilUp(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUp()) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function startMlService() {
  if (await isUp()) {
    console.log('[backend] ML service already running');
    return;
  }
  if (starting) return;
  starting = true;

  const mlServiceCwd = path.resolve(__dirname, '..', 'ml-service');
  const host = '0.0.0.0';
  const port = (new URL(getMlBase())).port || '8000';

  console.log(`[backend] Starting ML service at ${host}:${port} (cwd=${mlServiceCwd})`);

  // Spawn uvicorn main:app --host 0.0.0.0 --port <port>
  mlProc = spawn(process.platform === 'win32' ? 'uvicorn.exe' : 'uvicorn',
    ['main:app', '--host', host, '--port', port],
    {
      cwd: mlServiceCwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  mlProc.stdout.on('data', (d) => process.stdout.write(`[ml-service] ${d}`));
  mlProc.stderr.on('data', (d) => process.stderr.write(`[ml-service] ${d}`));
  mlProc.on('exit', (code) => {
    console.log(`[backend] ML service exited with code ${code}`);
    mlProc = null;
  });

  const up = await waitUntilUp(15000);
  if (up) {
    console.log('[backend] ML service is up');
  } else {
    console.warn('[backend] ML service did not become ready in time');
  }
  starting = false;
}

function stopMlService() {
  if (mlProc && !mlProc.killed) {
    console.log('[backend] Stopping ML service');
    mlProc.kill();
  }
}

module.exports = { startMlService, stopMlService };
