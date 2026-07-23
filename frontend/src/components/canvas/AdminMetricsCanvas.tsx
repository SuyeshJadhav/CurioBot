import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { GaugeChart } from '../common/GaugeChart';

interface ProcessDetail {
  name: string;
  status: string;
  cpu: number;
  memoryMb: number;
  restarts: number;
  pid?: number;
}

interface TelemetryData {
  timestamp: number;
  system: {
    memoryUsagePercent: number;
    totalMemMb: number;
    usedMemMb: number;
    freeMemMb: number;
    loadAverage: number[];
    uptimeSeconds: number;
    processUptimeSeconds: number;
    cpuCount: number;
    cpuModel: string;
    platform: string;
    arch: string;
  };
  processes: ProcessDetail[];
}

interface HistoricalPoint {
  time: string;
  cpuLoad1m: number;
  cpuLoad5m: number;
  cpuLoad15m: number;
  usedMemMb: number;
  freeMemMb: number;
  memPercent: number;
}

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const AdminMetricsCanvas: React.FC = () => {
  const [secret, setSecret] = useState<string>(() => {
    return localStorage.getItem('curio_telemetry_secret') || 'curio-telemetry-secret';
  });
  const [tempSecret, setTempSecret] = useState<string>(secret);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(3000); // default 3s
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Format uptime in readable string
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hrs = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days > 0 ? `${days}d ` : ''}${hrs}h ${mins}m ${secs}s`;
  };

  const fetchTelemetry = useCallback(async () => {
    try {
      const token = localStorage.getItem('curio_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-telemetry-secret': secret,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/internal/telemetry`, {
        headers,
      });

      if (res.status === 401) {
        setError('401 Unauthorized — Telemetry secret mismatch');
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: TelemetryData = await res.json();
      setTelemetry(data);
      setError(null);
      setIsLoading(false);

      // Append point to history buffer
      const timeStr = new Date(data.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const newPoint: HistoricalPoint = {
        time: timeStr,
        cpuLoad1m: data.system.loadAverage[0] ?? 0,
        cpuLoad5m: data.system.loadAverage[1] ?? 0,
        cpuLoad15m: data.system.loadAverage[2] ?? 0,
        usedMemMb: data.system.usedMemMb,
        freeMemMb: data.system.freeMemMb,
        memPercent: data.system.memoryUsagePercent,
      };

      setHistory((prev) => [...prev.slice(-19), newPoint]); // Keep last 20 points
    } catch (err: any) {
      setError(err.message || 'Failed to fetch telemetry metrics');
      setIsLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    fetchTelemetry();

    if (pollIntervalMs > 0) {
      const interval = setInterval(fetchTelemetry, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchTelemetry, pollIntervalMs]);

  const saveSecret = () => {
    localStorage.setItem('curio_telemetry_secret', tempSecret);
    setSecret(tempSecret);
    setShowConfig(false);
    setIsLoading(true);
  };

  // Derive CPU estimate for gauge
  const estimatedCpuPercent = telemetry
    ? Math.min(100, Math.round(((telemetry.system.loadAverage[0] || 0) / telemetry.system.cpuCount) * 100))
    : 0;

  return (
    <div
      style={{
        padding: '28px',
        maxWidth: '1280px',
        margin: '0 auto',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        color: 'var(--ink-charcoal, #1C1917)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-headline, serif)' }}>
              System & Telemetry Monitoring
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: error ? '#FEE2E2' : '#D1FAE5',
                color: error ? '#991B1B' : '#065F46',
              }}
            >
              {error ? 'Telemetry Error' : 'Live Connected'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Host Instance: Oracle Cloud Express VM &bull; Node / PM2 Runtime
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            ⚙️ Auth Secret
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600, color: '#4B5563' }}>Interval:</span>
            <select
              value={pollIntervalMs}
              onChange={(e) => setPollIntervalMs(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
                background: '#FFFFFF',
                fontWeight: 500,
              }}
            >
              <option value={3000}>3 Seconds</option>
              <option value={5000}>5 Seconds</option>
              <option value={10000}>10 Seconds</option>
              <option value={0}>Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Auth Config Modal / Drawer */}
      {showConfig && (
        <div
          style={{
            marginBottom: '24px',
            padding: '20px',
            background: '#F9FAFB',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>Configure Telemetry Secret Header</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#4B5563' }}>
            The backend telemetry endpoint is protected with header <code>x-telemetry-secret</code>. Enter your secret token below.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="password"
              value={tempSecret}
              onChange={(e) => setTempSecret(e.target.value)}
              placeholder="Enter TELEMETRY_SECRET"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
              }}
            />
            <button
              onClick={saveSecret}
              style={{
                padding: '8px 16px',
                background: '#2563EB',
                color: '#FFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Save Secret
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: '#FEF2F2',
            borderLeft: '4px solid #EF4444',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#991B1B',
            fontWeight: 500,
          }}
        >
          <strong>Connection Error:</strong> {error}
        </div>
      )}

      {isLoading && !telemetry ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280', fontWeight: 500 }}>
          Connecting to telemetry server...
        </div>
      ) : telemetry ? (
        <>
          {/* Top System Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Host Uptime</div>
              <div style={cardValueStyle}>{formatUptime(telemetry.system.uptimeSeconds)}</div>
              <div style={cardSubtextStyle}>Process Uptime: {formatUptime(telemetry.system.processUptimeSeconds)}</div>
            </div>

            <div style={cardStyle}>
              <div style={cardTitleStyle}>CPU Hardware</div>
              <div style={cardValueStyle}>{telemetry.system.cpuCount} Cores</div>
              <div style={cardSubtextStyle}>{telemetry.system.cpuModel}</div>
            </div>

            <div style={cardStyle}>
              <div style={cardTitleStyle}>System Memory</div>
              <div style={cardValueStyle}>{telemetry.system.usedMemMb} MB / {telemetry.system.totalMemMb} MB</div>
              <div style={cardSubtextStyle}>{telemetry.system.freeMemMb} MB Free ({100 - telemetry.system.memoryUsagePercent}%)</div>
            </div>

            <div style={cardStyle}>
              <div style={cardTitleStyle}>Platform / OS</div>
              <div style={cardValueStyle}>{telemetry.system.platform} ({telemetry.system.arch})</div>
              <div style={cardSubtextStyle}>Oracle Cloud Infrastructure</div>
            </div>
          </div>

          {/* Gauges Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '28px',
            }}
          >
            {/* CPU Gauge Card */}
            <div style={{ ...cardStyle, textAlign: 'center', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>Host CPU Utilization</h3>
              <GaugeChart
                value={estimatedCpuPercent}
                label="CPU Load"
                sublabel={`1-Min Load Avg: ${telemetry.system.loadAverage[0] ?? 0}`}
              />
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px' }}>
                Load Averages: 1m ({telemetry.system.loadAverage[0] ?? 0}), 5m ({telemetry.system.loadAverage[1] ?? 0}), 15m ({telemetry.system.loadAverage[2] ?? 0})
              </div>
            </div>

            {/* RAM Memory Gauge Card */}
            <div style={{ ...cardStyle, textAlign: 'center', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>RAM Memory Usage</h3>
              <GaugeChart
                value={telemetry.system.memoryUsagePercent}
                label="RAM Usage"
                sublabel={`${telemetry.system.usedMemMb} MB of ${telemetry.system.totalMemMb} MB Used`}
              />
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px' }}>
                Free RAM: {telemetry.system.freeMemMb} MB
              </div>
            </div>
          </div>

          {/* Time Series History Charts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
              gap: '20px',
              marginBottom: '28px',
            }}
          >
            {/* Chart 1: CPU Load History */}
            <div style={{ ...cardStyle, padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>
                System CPU Load Average Trend
              </h3>
              {/* CRITICAL: Explicit height div wrapper for Recharts ResponsiveContainer */}
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="cpuLoad1m" name="1-Min Load" stroke="#2563EB" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="cpuLoad5m" name="5-Min Load" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cpuLoad15m" name="15-Min Load" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Memory Usage Trend */}
            <div style={{ ...cardStyle, padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>
                RAM Memory History (MB)
              </h3>
              {/* CRITICAL: Explicit height div wrapper for Recharts ResponsiveContainer */}
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="usedMemMb" name="Used RAM (MB)" stroke="#8B5CF6" fill="#8B5CF633" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* PM2 Process Monitor Table */}
          <div style={{ ...cardStyle, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>PM2 & Application Processes</h3>
              <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
                {telemetry.processes.length} Managed Process{telemetry.processes.length === 1 ? '' : 'es'}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F3F4F6', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '10px 14px' }}>Process Name</th>
                    <th style={{ padding: '10px 14px' }}>PID</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>CPU Usage</th>
                    <th style={{ padding: '10px 14px' }}>RAM Memory</th>
                    <th style={{ padding: '10px 14px' }}>Restarts</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.processes.map((proc, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1F2937' }}>
                        {proc.name}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#4B5563' }}>
                        {proc.pid ?? 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: proc.status === 'online' ? '#D1FAE5' : '#FEE2E2',
                            color: proc.status === 'online' ? '#065F46' : '#991B1B',
                          }}
                        >
                          {proc.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{proc.cpu}%</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{proc.memoryMb} MB</td>
                      <td style={{ padding: '12px 14px', color: '#6B7280' }}>{proc.restarts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '14px',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  padding: '18px 20px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6B7280',
  marginBottom: '6px',
};

const cardValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#111827',
};

const cardSubtextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF',
  marginTop: '4px',
};
