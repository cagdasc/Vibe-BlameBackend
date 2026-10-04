import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderSearch,
  ArrowRight,
  Zap,
  Trash2,
  Terminal,
  Settings,
  ShieldCheck,
  Check,
  Sliders,
  Cable
} from 'lucide-react';
import { DeviceInfo } from '../types/inspector';

interface AdbSettingsProps {
  currentDeviceInfo: DeviceInfo;
  isSocketConnected: boolean;
  onRefreshSocket: () => void;
}

interface DeviceItem {
  serial: string;
  state: 'device' | 'offline' | 'unauthorized' | 'unknown';
  model?: string;
  product?: string;
  device?: string;
}

interface AdbStatusResponse {
  connected: boolean;
  port: number;
  host: string;
  device: any;
  adbAvailable: boolean;
  adbVersion?: string;
  adbError?: string;
  config: {
    adbPath: string;
    port: number;
    selectedSerial?: string;
  };
  forwards: string[];
}

export const AdbSettings: React.FC<AdbSettingsProps> = ({
  currentDeviceInfo,
  isSocketConnected,
  onRefreshSocket
}) => {
  const [adbPath, setAdbPath] = useState('adb');
  const [port, setPort] = useState(10245);
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null);
  const [adbVersion, setAdbVersion] = useState<string>('');
  const [adbError, setAdbError] = useState<string>('');
  const [activeForwards, setActiveForwards] = useState<string[]>([]);
  
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [isTestingAdb, setIsTestingAdb] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  
  const [commandLog, setCommandLog] = useState<{ command: string; output: string; error?: boolean } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch initial status on mount
  useEffect(() => {
    fetchAdbStatus();
    loadDevices();
  }, []);

  const fetchAdbStatus = async () => {
    try {
      const res = await fetch('/api/adb/status');
      if (res.ok) {
        const data: AdbStatusResponse = await res.json();
        setAdbAvailable(data.adbAvailable);
        setAdbVersion(data.adbVersion || '');
        setAdbError(data.adbError || '');
        setAdbPath(data.config.adbPath || 'adb');
        setPort(data.config.port || 10245);
        if (data.config.selectedSerial) {
          setSelectedSerial(data.config.selectedSerial);
        }
        setActiveForwards(data.forwards || []);
      }
    } catch (e: any) {
      console.warn('Could not query /api/adb/status:', e.message);
    }
  };

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetch('/api/adb/devices');
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
        if (data.devices.length > 0 && !selectedSerial) {
          setSelectedSerial(data.devices[0].serial);
        }
      } else {
        setDevices([]);
      }
    } catch {
      setDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleAutoDetectAdb = async () => {
    setIsAutoDetecting(true);
    try {
      const res = await fetch('/api/adb/detect-path', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAdbPath(data.path);
        setAdbAvailable(true);
        setAdbVersion(data.version || '');
        setCommandLog({
          command: 'Auto-detect ADB Path',
          output: `Found binary at: ${data.path}\n${data.version || ''}`
        });
        showSuccess('Auto-detected ADB location successfully!');
        loadDevices();
      } else {
        setCommandLog({
          command: 'Auto-detect ADB Path',
          output: data.message || 'Could not find adb in standard Android SDK folders.',
          error: true
        });
      }
    } catch (err: any) {
      setCommandLog({
        command: 'Auto-detect ADB Path',
        output: err.message,
        error: true
      });
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSaveAndTestAdb = async () => {
    setIsTestingAdb(true);
    try {
      // 1. Save config
      await fetch('/api/adb/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, port, selectedSerial })
      });

      // 2. Query status
      const res = await fetch('/api/adb/status');
      const data: AdbStatusResponse = await res.json();
      setAdbAvailable(data.adbAvailable);
      setAdbVersion(data.adbVersion || '');
      setAdbError(data.adbError || '');

      setCommandLog({
        command: `${adbPath} version`,
        output: data.adbAvailable
          ? data.adbVersion || 'Valid ADB binary'
          : data.adbError || 'Failed to execute binary',
        error: !data.adbAvailable
      });

      if (data.adbAvailable) {
        showSuccess('ADB binary verified & saved!');
        loadDevices();
      }
    } catch (err: any) {
      setCommandLog({
        command: `${adbPath} version`,
        output: err.message,
        error: true
      });
    } finally {
      setIsTestingAdb(false);
    }
  };

  const handleExecutePortForward = async () => {
    setIsForwarding(true);
    try {
      const res = await fetch('/api/adb/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, serial: selectedSerial })
      });
      const data = await res.json();
      if (data.success) {
        setCommandLog({
          command: `adb ${selectedSerial ? `-s ${selectedSerial} ` : ''}forward tcp:${port} tcp:${port}`,
          output: data.output || `Port ${port} forwarded successfully!`
        });
        showSuccess(`Port ${port} forwarded to Android! Connecting TCP socket...`);
        fetchAdbStatus();
        onRefreshSocket();
      } else {
        setCommandLog({
          command: `adb forward tcp:${port} tcp:${port}`,
          output: data.error || 'Port forward failed',
          error: true
        });
      }
    } catch (err: any) {
      setCommandLog({
        command: `adb forward tcp:${port} tcp:${port}`,
        output: err.message,
        error: true
      });
    } finally {
      setIsForwarding(false);
    }
  };

  const handleRemoveForward = async () => {
    try {
      const res = await fetch('/api/adb/remove-forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      const data = await res.json();
      setCommandLog({
        command: `adb forward --remove tcp:${port}`,
        output: data.output || 'Removed forward rule'
      });
      fetchAdbStatus();
      showSuccess(`Removed forward for port ${port}`);
    } catch (err: any) {
      setCommandLog({
        command: `adb forward --remove tcp:${port}`,
        output: err.message,
        error: true
      });
    }
  };

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const hasForwardRule = activeForwards.some(f => f.includes(`tcp:${port}`));

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-neutral-200 overflow-y-auto p-6 space-y-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>ADB & Device Connection Settings</span>
            </h2>
            <p className="text-neutral-400 text-xs mt-1">
              Configure your local Android Debug Bridge (ADB), forward ports, and inspect connected devices without manual CLI instructions.
            </p>
          </div>

          <button
            onClick={() => {
              fetchAdbStatus();
              loadDevices();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {actionSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-700/80 rounded text-emerald-200 text-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* 1. Quick One-Click Action Card */}
        <div className="bg-gradient-to-r from-[#111827] to-[#0f172a] p-5 rounded-lg border border-neutral-700/80 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                <h3 className="text-sm font-bold text-neutral-100">
                  One-Click Auto Port-Forward & Connect
                </h3>
              </div>
              <p className="text-xs text-neutral-300">
                Directly instructs your local ADB server to forward{' '}
                <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded font-mono">
                  tcp:{port} tcp:{port}
                </code>{' '}
                and instantly hooks the BlameBackend TCP reader into your Android app.
              </p>
            </div>

            <button
              onClick={handleExecutePortForward}
              disabled={isForwarding}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded text-xs transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-cyan-950/50"
            >
              {isForwarding ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Forwarding Port...</span>
                </>
              ) : (
                <>
                  <Cable className="w-4 h-4" />
                  <span>Forward Port & Connect</span>
                </>
              )}
            </button>
          </div>

          {/* Quick status bar */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-neutral-800 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">ADB State:</span>
              <span
                className={`font-semibold ${
                  adbAvailable ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {adbAvailable ? 'Ready' : 'Not detected'}
              </span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">TCP Socket:</span>
              <span
                className={`font-semibold flex items-center gap-1.5 ${
                  isSocketConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isSocketConnected ? 'Hooked (Receiving Traffic)' : 'Disconnected (Waiting)'}
              </span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">Active Rule:</span>
              <span className={hasForwardRule ? 'text-emerald-400 font-mono' : 'text-neutral-500 font-mono'}>
                {hasForwardRule ? `tcp:${port} active` : 'No rule active'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Connected Devices Section */}
        <div className="bg-[#0e121a] p-5 rounded border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-neutral-200">
                Connected Android Devices & Emulators ({devices.length})
              </h3>
            </div>
            <button
              onClick={loadDevices}
              disabled={isLoadingDevices}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? 'animate-spin' : ''}`} />
              <span>Detect Devices</span>
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="p-4 bg-[#07090d] rounded border border-neutral-800/80 text-xs text-neutral-400 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>No Android devices currently detected by ADB</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Connect your Android phone via USB or start an Android Emulator in Android Studio. Ensure that:
              </p>
              <ul className="list-disc pl-5 text-[11px] text-neutral-400 space-y-1">
                <li>USB Debugging is toggled <strong>ON</strong> in your phone's Developer Options.</li>
                <li>Your phone prompted <em>"Allow USB Debugging?"</em> and you tapped Allow.</li>
                <li>If using a custom SDK location, ensure the ADB path below points to your Android SDK.</li>
              </ul>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {devices.map((dev) => {
                const isSelected = selectedSerial === dev.serial;
                return (
                  <div
                    key={dev.serial}
                    onClick={() => setSelectedSerial(dev.serial)}
                    className={`p-3 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-neutral-800/90 border-cyan-500/80 text-white'
                        : 'bg-[#07090d] border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-neutral-600'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-semibold">{dev.model || dev.serial}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {dev.serial} {dev.product ? `· ${dev.product}` : ''}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        dev.state === 'device'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {dev.state}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. ADB Path & Custom Port Configuration */}
        <div className="bg-[#0e121a] p-5 rounded border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-neutral-200">
              ADB Executable Location & Port Configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[11px] font-semibold text-neutral-400">
                Path to ADB Binary
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adbPath}
                  onChange={(e) => setAdbPath(e.target.value)}
                  placeholder="adb or /path/to/platform-tools/adb"
                  className="flex-1 bg-[#07090d] border border-neutral-700 focus:border-cyan-500 text-neutral-200 rounded px-3 py-1.5 text-xs font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={handleAutoDetectAdb}
                  disabled={isAutoDetecting}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded border border-neutral-700 text-xs flex items-center gap-1.5 whitespace-nowrap"
                  title="Search standard Android SDK directories for adb"
                >
                  <FolderSearch className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isAutoDetecting ? 'Searching...' : 'Auto-detect'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-neutral-400">
                Forward Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 10245)}
                className="w-full bg-[#07090d] border border-neutral-700 focus:border-cyan-500 text-neutral-200 rounded px-3 py-1.5 text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-neutral-400 font-mono">
              {adbVersion ? (
                <span className="text-emerald-400">{adbVersion}</span>
              ) : adbError ? (
                <span className="text-rose-400">{adbError}</span>
              ) : (
                <span>Click &quot;Save &amp; Test&quot; to verify path.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAndTestAdb}
                disabled={isTestingAdb}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 rounded border border-neutral-700 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {isTestingAdb ? (
                  <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Save &amp; Test Binary</span>
              </button>

              {hasForwardRule && (
                <button
                  type="button"
                  onClick={handleRemoveForward}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-rose-300 rounded border border-neutral-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Forward</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Diagnostic Command Output Terminal */}
        {commandLog && (
          <div className="bg-[#07090d] p-4 rounded border border-neutral-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400 text-[11px] pb-1 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Last Command: {commandLog.command}</span>
              </div>
              <span className={commandLog.error ? 'text-rose-400' : 'text-emerald-400'}>
                {commandLog.error ? 'Error' : 'Success'}
              </span>
            </div>
            <pre
              className={`text-[11px] whitespace-pre-wrap leading-relaxed ${
                commandLog.error ? 'text-rose-300' : 'text-neutral-300'
              }`}
            >
              {commandLog.output}
            </pre>
          </div>
        )}

        {/* 5. Client Integration Code in `/client` */}
        <div className="p-4 bg-[#0e121a] rounded border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-neutral-200 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Android Setup in <code>/client</code></span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Your client library in <code className="text-cyan-300">/client/core</code> and sample app in{' '}
            <code className="text-cyan-300">/client/app</code> are already configured with:
          </p>
          <div className="bg-[#07090d] p-3 rounded border border-neutral-800/80 font-mono text-[11px] text-neutral-300 space-y-1">
            <div><span className="text-neutral-500">// 1. Application initialization</span></div>
            <div>NetworkInspector.install(this)</div>
            <div className="pt-1"><span className="text-neutral-500">// 2. OkHttp Interceptor</span></div>
            <div>OkHttpClient.Builder().addInterceptor(NetworkInspectorInterceptor()).build()</div>
          </div>
        </div>
      </div>
    </div>
  );
};
