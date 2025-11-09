const API_BASE = 'http://localhost:5000'; // change if backend runs elsewhere
const LIMIT = 15;

// Elements
const statusEl = document.getElementById('status');
const tbody = document.querySelector('#dataTable tbody');
const refreshBtn = document.getElementById('refreshBtn');

// ML elements
const inTemp = document.getElementById('inTemp');
const inHum = document.getElementById('inHum');
const inLux = document.getElementById('inLux');
const trainBtn = document.getElementById('trainBtn');
const predictBtn = document.getElementById('predictBtn');
const mlStatusEl = document.getElementById('mlStatus');
const predictionBox = document.getElementById('predictionBox');
const predLabel = document.getElementById('predLabel');
const predConf = document.getElementById('predConf');

async function fetchLatest() {
  setStatus('Loading...');
  try {
    const res = await fetch(`${API_BASE}/api/sensors/latest?limit=${LIMIT}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    renderRows(json.data || []);
    setStatus(`Loaded ${json.count ?? (json.data?.length || 0)} rows`);
  } catch (err) {
    console.error('Fetch failed:', err);
    setStatus('Failed to load');
  }
}

function renderRows(items) {
  tbody.innerHTML = '';
  items.forEach((item, idx) => {
    const tr = document.createElement('tr');

    const tdIndex = document.createElement('td');
    tdIndex.textContent = idx + 1;
    tdIndex.className = 'num';

    const tdTs = document.createElement('td');
    const ts = item.timestamp || item.createdAt;
    tdTs.textContent = ts ? new Date(ts).toLocaleString() : '-';

    const tdTemp = document.createElement('td');
    tdTemp.textContent = item.temperature ?? '-';
    tdTemp.className = 'num';

    const tdHum = document.createElement('td');
    tdHum.textContent = item.humidity ?? '-';
    tdHum.className = 'num';

    const tdLux = document.createElement('td');
    tdLux.textContent = item.illuminance ?? item.lux ?? '-';
    tdLux.className = 'num';

    tr.append(tdIndex, tdTs, tdTemp, tdHum, tdLux);
    tbody.appendChild(tr);
  });
}

function setStatus(msg) { statusEl.textContent = msg; }
function setMlStatus(msg) { mlStatusEl.textContent = msg; }

async function trainModel() {
  setMlStatus('Training...');
  try {
    const res = await fetch(`${API_BASE}/api/ml/train`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.error || json.message || 'Train failed');
    setMlStatus(`Trained. Accuracy: ${json.accuracy !== undefined ? (json.accuracy * 100).toFixed(2) + '%' : 'N/A'} | Samples: ${json.samples ?? 'N/A'}`);
  } catch (e) {
    console.error('Train failed:', e);
    setMlStatus('Train failed');
  }
}

async function predict() {
  setMlStatus('Predicting...');
  predictionBox.classList.add('hidden');
  try {
    const payload = {
      temperature: parseFloat(inTemp.value),
      humidity: parseFloat(inHum.value),
      lux: parseFloat(inLux.value)
    };
    if (Object.values(payload).some(v => Number.isNaN(v))) {
      setMlStatus('Please enter valid numbers for all fields');
      return;
    }
    const res = await fetch(`${API_BASE}/api/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.error || json.message || 'Predict failed');
    predLabel.textContent = json.status;
    predConf.textContent = (json.confidence * 100).toFixed(2) + '%';
    predictionBox.classList.remove('hidden');
    setMlStatus('');
  } catch (e) {
    console.error('Predict failed:', e);
    setMlStatus('Predict failed');
  }
}

refreshBtn.addEventListener('click', fetchLatest);
if (trainBtn) trainBtn.addEventListener('click', trainModel);
if (predictBtn) predictBtn.addEventListener('click', predict);

// Initial load
fetchLatest();
