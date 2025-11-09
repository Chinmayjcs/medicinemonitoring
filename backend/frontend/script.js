const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || 'http://localhost:5000';
const LIMIT = 15;

const statusEl = document.getElementById('status');
const tbody = document.querySelector('#dataTable tbody');
const refreshBtn = document.getElementById('refreshBtn');

async function fetchLatest() {
  setStatus('Loading...');
  try {
    const res = await fetch(`${API_BASE}/api/sensors/latest?limit=${LIMIT}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
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
    tdTemp.textContent = item.temperature ?? item.temp ?? '-';
    tdTemp.className = 'num';

    const tdHum = document.createElement('td');
    tdHum.textContent = item.humidity ?? '-';
    tdHum.className = 'num';

    const tdLux = document.createElement('td');
    tdLux.textContent = item.illuminance ?? item.lux ?? '-';
    tdLux.className = 'num';

    tr.appendChild(tdIndex);
    tr.appendChild(tdTs);
    tr.appendChild(tdTemp);
    tr.appendChild(tdHum);
    tr.appendChild(tdLux);
    tbody.appendChild(tr);
  });
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

refreshBtn.addEventListener('click', fetchLatest);

// Initial load
fetchLatest();
