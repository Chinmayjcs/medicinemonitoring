const API_BASE = 'http://localhost:5000'; // change if backend runs elsewhere
const LIMIT = 15;
let latestItems = [];

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
// Stats elements
const statTotalDocs = document.getElementById('statTotalDocs');
const statPrecision = document.getElementById('statPrecision');
const statRecall = document.getElementById('statRecall');
const statAccuracy = document.getElementById('statAccuracy');
const statF1 = document.getElementById('statF1');

async function fetchLatest() {
  setStatus('Loading...');
  try {
    const res = await fetch(`${API_BASE}/api/sensors/latest?limit=${LIMIT}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const items = json.data || [];
    latestItems = items;
    renderRows(items);
    setStatus(`Loaded ${json.count ?? (items.length || 0)} rows`);
    return items;
  } catch (err) {
    console.error('Fetch failed:', err);
    setStatus('Failed to load');
    latestItems = [];
    return [];
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
function setStat(el, value) { if (el) el.textContent = value; }

async function fetchTotalDocs() {
  try {
    const res = await fetch(`${API_BASE}/api/debug/ml-training-dataset/check`);
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.error || json.message || 'Failed');
    setStat(statTotalDocs, json.count ?? '-');
  } catch (e) {
    setStat(statTotalDocs, '-');
  }
}

async function trainModel() {
  try {
    const res = await fetch(`${API_BASE}/api/ml/train`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.error || json.message || 'Train failed');
    const accStr = json.accuracy !== undefined ? (json.accuracy * 100).toFixed(2) + '%' : 'N/A';
    const f1Str = json.f1 !== undefined ? (json.f1 * 100).toFixed(2) + '%' : 'N/A';
    const precisionStr = json.precision !== undefined ? (json.precision * 100).toFixed(2) + '%' : 'N/A';
    const recallStr = json.recall !== undefined ? (json.recall * 100).toFixed(2) + '%' : 'N/A';
    const samples = json.samples ?? 'N/A';
    setMlStatus(`Trained. Accuracy: ${accStr} | F1: ${f1Str} | Precision: ${precisionStr} | Recall: ${recallStr} | Samples: ${samples}`);
    // Update stats box
    setStat(statPrecision, precisionStr);
    setStat(statRecall, recallStr);
    setStat(statAccuracy, accStr);
    setStat(statF1, f1Str);
    await autoPredictIfPossible();
  } catch (e) {
    console.error('Train failed:', e);
  }
}

async function autoPredictIfPossible() {
  try {
    // Use the most recent reading (assume first item is the newest)
    const latest = latestItems[0] || latestItems[latestItems.length - 1];
    const payload = {
      temperature: parseFloat(latest.temperature),
      humidity: parseFloat(latest.humidity),
      lux: parseFloat(latest.illuminance ?? latest.lux)
    };
    if (Object.values(payload).some(v => Number.isNaN(v))) return;
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
  } catch (e) {
    console.error('Auto predict failed:', e);
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

// Initial load: load data, train model, then predict using most recent row
;(async function init() {
  await fetchTotalDocs();
  await fetchLatest();
  await trainModel();
  await autoPredictIfPossible();
})();
