import React, { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const API_BASE = 'http://localhost:5000';
const LIMIT = 10;

const statusColors = {
  safe: 'bg-emerald-500',
  unsafe: 'bg-red-500',
  pending: 'bg-yellow-400',
};

export default function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch latest sensor data
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sensors/latest?limit=${LIMIT}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (e) {
      console.error('Failed to fetch latest:', e);
    }
  }, []);

  // Fetch stats (ml-training-dataset count)
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/debug/ml-training-dataset/check`);
      const json = await res.json();
      if (json.success) setStats({ totalDocs: json.count });
    } catch (e) {
      console.error('Stats fetch failed', e);
    }
  }, []);

  // Socket setup
  useEffect(() => {
    const socket = io(API_BASE);
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('newSensorData', (data) => {
      // Normalize ID field so later mlResult matches
      const docId = data._id ?? data.id;
      const prepared = { ...data, _id: docId, id: docId };
      setItems((prev) => {
        const next = [prepared, ...prev];
        return next.slice(0, LIMIT);
      });
    });

    socket.on('mlResult', (data) => {
      const docId = data._id ?? data.id;
      const prepared = { ...data, _id: docId, id: docId };
      setItems((prev) => prev.map((it) => ((it._id ?? it.id) === docId ? prepared : it)));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchStats();
  }, [fetchLatest, fetchStats]);

  // Prepare individual chart data
  const reversed = React.useMemo(() => [...items].reverse(), [items]);
  const labels = React.useMemo(() => reversed.map((i) => new Date(i.timestamp || i.createdAt).toLocaleTimeString()), [reversed]);

  const tempVals = React.useMemo(() => reversed.map((i) => i.temperature), [reversed]);
  const humVals = React.useMemo(() => reversed.map((i) => i.humidity), [reversed]);
  const luxVals = React.useMemo(() => reversed.map((i) => i.illuminance ?? i.lux), [reversed]);

  const makeData = (vals, label, color) => ({
    labels,
    datasets: [{ label, data: vals, borderColor: color, fill: false }],
  });
  const tempChartData = React.useMemo(() => makeData(tempVals, 'Temperature (°C)', '#ef4444'), [labels, tempVals]);
  const humChartData = React.useMemo(() => makeData(humVals, 'Humidity (%)', '#3b82f6'), [labels, humVals]);
  const luxChartData = React.useMemo(() => makeData(luxVals, 'Lux', '#22c55e'), [labels, luxVals]);

  const makeOptions = (vals) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.1, 0.5);
    return {
      responsive: true,
      maintainAspectRatio: true,
      elements: { line: { borderWidth: 2, tension: 0.3 }, point: { radius: 3 } },
      scales: {
        y: {
          suggestedMin: min - pad,
          suggestedMax: max + pad,
          grid: { color: '#e2e8f0' },
        },
        x: { grid: { color: '#f1f5f9' } },
      },
      plugins: { legend: { display: false } },
    };
  };
  const tempChartOptions = React.useMemo(() => makeOptions(tempVals), [tempVals]);
  const humChartOptions = React.useMemo(() => makeOptions(humVals), [humVals]);
  const luxChartOptions = React.useMemo(() => makeOptions(luxVals), [luxVals]);
  const chartData = React.useMemo(() => {
    const reversed = [...items].reverse();
    return {
      labels: reversed.map((i) => new Date(i.timestamp || i.createdAt).toLocaleTimeString()),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: reversed.map((i) => i.temperature),
          borderColor: '#ef4444',
        },
        {
          label: 'Humidity (%)',
          data: reversed.map((i) => i.humidity),
          borderColor: '#3b82f6',
        },
        {
          label: 'Lux',
          data: reversed.map((i) => i.illuminance ?? i.lux),
          borderColor: '#22c55e',
        },
      ],
    };
  }, [items]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    elements: { line: { borderWidth: 2, tension: 0.3 }, point: { radius: 3 } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
      x: { grid: { color: '#f1f5f9' } },
    },
    plugins: {
      legend: { labels: { boxWidth: 14 } },
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-500 to-cyan-400 text-white py-6 px-4 shadow-lg">
        <h1 className="text-2xl font-bold">Medicine Monitoring Dashboard</h1>
        <p className="opacity-90">Latest {LIMIT} readings with ML predictions</p>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Controls */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {socketConnected ? 'Real-time connected' : 'Socket disconnected'}
          </span>
        </div>

        {/* Layout Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Data Table */}
          <div className="md:col-span-2 order-2 md:order-1">
            <div className="overflow-x-auto bg-white rounded-xl shadow max-h-[600px]">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700 font-medium sticky top-0">
                  <tr>
                    <th className="py-3 px-2 text-left">#</th>
                    <th className="py-3 px-2 text-left">Timestamp</th>
                    <th className="py-3 px-2 text-left">Temp (°C)</th>
                    <th className="py-3 px-2 text-left">Humidity (%)</th>
                    <th className="py-3 px-2 text-left">Lux</th>
                    <th className="py-3 px-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td className="py-2 px-2 tabular-nums">{idx + 1}</td>
                      <td className="py-2 px-2">
                        {new Date(item.timestamp || item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-2 tabular-nums">{item.temperature}</td>
                      <td className="py-2 px-2 tabular-nums">{item.humidity}</td>
                      <td className="py-2 px-2 tabular-nums">{item.illuminance ?? item.lux}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColors[item.mlAnalysis?.status || 'pending']}`} />
                          <span className="capitalize text-xs">{item.mlAnalysis?.status || 'pending'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="order-1 md:order-2 space-y-2">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-medium mb-2 text-sm">Temperature (°C)</h3>
              <Line data={tempChartData} options={tempChartOptions} height={120} />
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-medium mb-2 text-sm">Humidity (%)</h3>
              <Line data={humChartData} options={humChartOptions} height={120} />
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-medium mb-2 text-sm">Lux</h3>
              <Line data={luxChartData} options={luxChartOptions} height={120} />
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
