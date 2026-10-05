import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderSearch,
  Zap,
  RotateCcw,
  Terminal,
  Settings,
  ShieldCheck,
  Check,
  Cable,
  ChevronDown,
  Copy
} from 'lucide-react';
import { DeviceInfo } from '../types/inspector';

interface DeviceManagerProps {
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

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  currentDeviceInfo,
  isSocketConnected,
  onRefreshSocket
}) => {
  const [adbPath, setAdbPath] = useState('adb');
  const [port, setPort] = useState(10245);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null);
  const [adbVersion, setAdbVersion] = useState<string>('');
  const [adbError, setAdbError] = useState<string>('');
  const [activeForwards, setActiveForwards] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRestartingServer, setIsRestartingServer] = useState(false);
  const [isAutoForwarding, setIsAutoForwarding] = useState(false);
  const [isTestingAdb, setIsTestingAdb] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  const [commandLog, setCommandLog] = useState<{ command: string; output: string; error?: boolean } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Track if we already auto-forwarded for the current device to prevent duplicate calls
  const lastAutoForwardedSerialRef = useRef<string | null>(null);

  // 1. Initial live check on mount (no stale cache)
  useEffect(() => {
    let isMounted = true;

    const checkDevicesAndAutoForward = async () => {
      setIsLoading(true);
      try {
        const [statusRes, devicesRes] = await Promise.all([
          fetch('/api/adb/status'),
          fetch('/api/adb/devices')
        ]);

        if (!isMounted) return;

        if (statusRes.ok) {
          const statusData: AdbStatusResponse = await statusRes.json();
          setAdbAvailable(statusData.adbAvailable);
          setAdbVersion(statusData.adbVersion || '');
          setAdbError(statusData.adbError || '');
          setAdbPath(statusData.config.adbPath || 'adb');
          setPort(statusData.config.port || 10245);
          setActiveForwards(statusData.forwards || []);
        }

        if (devicesRes.ok) {
          const devicesData = await devicesRes.json();
          const devList: DeviceItem[] = devicesData.devices || [];
          setDevices(devList);

          if (devList.length > 0) {
            // Select the first device (or one marked 'device')
            const targetDevice = devList.find(d => d.state === 'device') || devList[0];
            setSelectedSerial(targetDevice.serial);

            // Automatically run port forwarding right after device is selected!
            await triggerPortForward(targetDevice.serial, port, true);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load devices:', err.message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkDevicesAndAutoForward();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Automatically run port forwarding whenever device selection changes
  const handleDeviceSelect = async (serial: string) => {
    setSelectedSerial(serial);
    if (!serial) return;
    await triggerPortForward(serial, port, false);
  };

  // Helper function to execute port forwarding for a selected device
  const triggerPortForward = async (serial: string, targetPort: number = port, isAuto: boolean = false) => {
    setIsAutoForwarding(true);
    try {
      const res = await fetch('/api/adb/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: targetPort, serial })
      });
      const data = await res.json();
      if (data.success) {
        lastAutoForwardedSerialRef.current = serial;
        setCommandLog({
          command: `adb -s ${serial} forward tcp:${targetPort} tcp:${targetPort}`,
          output: data.output || `Port ${targetPort} forwarded to device ${serial}!`
        });
        showSuccess(
          isAuto
            ? `Device connected! Port ${targetPort} automatically forwarded.`
            : `Port ${targetPort} forwarded for device ${serial}!`
        );
        onRefreshSocket();

        // Refresh forward list
        const statusRes = await fetch('/api/adb/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setActiveForwards(statusData.forwards || []);
        }
      } else {
        setCommandLog({
          command: `adb -s ${serial} forward tcp:${targetPort} tcp:${targetPort}`,
          output: data.error || 'Port forward failed',
          error: true
        });
      }
    } catch (err: any) {
      setCommandLog({
        command: `adb -s ${serial} forward tcp:${targetPort} tcp:${targetPort}`,
        output: err.message,
        error: true
      });
    } finally {
      setIsAutoForwarding(false);
    }
  };

  // Edge-case utility: Kill & Restart ADB daemon
  const handleRestartAdbServer = async () => {
    setIsRestartingServer(true);
    try {
      const res = await fetch('/api/adb/restart-server', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCommandLog({
          command: 'adb kill-server && adb start-server',
          output: data.output || 'ADB daemon restarted.'
        });
        showSuccess('Restarted ADB server. Re-scanning devices...');

        // Re-query devices
        const devRes = await fetch('/api/adb/devices');
        if (devRes.ok) {
          const devData = await devRes.json();
          const devList: DeviceItem[] = devData.devices || [];
          setDevices(devList);
          if (devList.length > 0) {
            const chosen = devList[0].serial;
            setSelectedSerial(chosen);
            await triggerPortForward(chosen, port, true);
          }
        }
      } else {
        setCommandLog({
          command: 'adb restart-server',
          output: data.error || 'Failed to restart ADB server',
          error: true
        });
      }
    } catch (err: any) {
      setCommandLog({
        command: 'adb restart-server',
        output: err.message,
        error: true
      });
    } finally {
      setIsRestartingServer(false);
    }
  };

  // Re-scan devices on demand
  const handleRescanDevices = async () => {
    setIsLoading(true);
    try {
      const [statusRes, devicesRes] = await Promise.all([
        fetch('/api/adb/status'),
        fetch('/api/adb/devices')
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setAdbAvailable(statusData.adbAvailable);
        setAdbVersion(statusData.adbVersion || '');
        setAdbError(statusData.adbError || '');
        setActiveForwards(statusData.forwards || []);
      }

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        const devList: DeviceItem[] = devicesData.devices || [];
        setDevices(devList);

        if (devList.length > 0) {
          const chosen = selectedSerial && devList.some(d => d.serial === selectedSerial)
            ? selectedSerial
            : devList[0].serial;
          setSelectedSerial(chosen);
          await triggerPortForward(chosen, port, false);
        } else {
          setSelectedSerial('');
        }
        showSuccess(`Found ${devList.length} device(s)`);
      }
    } catch (e: any) {
      console.warn('Failed to rescan devices:', e.message);
    } finally {
      setIsLoading(false);
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
        handleRescanDevices();
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
      await fetch('/api/adb/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adbPath, port, selectedSerial })
      });

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
        handleRescanDevices();
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

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const selectedDevice = devices.find(d => d.serial === selectedSerial);
  const hasForwardRule = activeForwards.some(f => f.includes(`tcp:${port}`));

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-neutral-200 overflow-y-auto p-6 space-y-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <span>Devices</span>
            </h2>
            <p className="text-neutral-400 text-xs mt-1">
              Select your target device. Port forwarding runs automatically upon selection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRescanDevices}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Scanning...' : 'Scan Devices'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {actionSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-700/80 rounded text-emerald-200 text-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* 1. Device Selection & Auto-Forward Card */}
        <div className="bg-[#0e121a] p-5 rounded-lg border border-neutral-800 space-y-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-neutral-200">
                Connected Devices ({devices.length})
              </h3>
            </div>

            {/* Quick status pill */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-neutral-300">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {isSocketConnected ? 'Live Connection Active' : 'Waiting for Device HTTP Calls'}
                </span>
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Checking connected devices...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="p-4 bg-[#07090d] rounded border border-neutral-800 text-xs text-neutral-400 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>No Android devices or emulators found</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Connect your Android phone via USB or launch an emulator in Android Studio. Ensure USB debugging is enabled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dropdown Selection if 2+ devices, or Single-device Display if 1 */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {devices.length > 1 ? 'Target Device (Select to Forward)' : 'Connected Device (Auto-Selected)'}
                </label>

                {devices.length > 1 ? (
                  <div className="relative">
                    <select
                      value={selectedSerial}
                      onChange={(e) => handleDeviceSelect(e.target.value)}
                      className="w-full bg-[#07090d] border border-neutral-700 hover:border-neutral-600 focus:border-cyan-500 text-neutral-100 rounded px-3 py-2 text-xs font-mono appearance-none cursor-pointer outline-none pr-8"
                    >
                      {devices.map((dev) => (
                        <option key={dev.serial} value={dev.serial}>
                          {dev.model || dev.serial} ({dev.serial}) [{dev.state}]
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                ) : (
                  <div className="p-3 bg-[#07090d] border border-cyan-500/50 rounded flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <div>
                        <div className="font-semibold text-neutral-100">
                          {selectedDevice?.model || selectedDevice?.serial}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {selectedDevice?.serial} {selectedDevice?.product ? `· ${selectedDevice.product}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      {selectedDevice?.state}
                    </span>
                  </div>
                )}
              </div>

              {/* Automatic Port Forwarding Status Banner */}
              <div className="p-3 bg-neutral-900/90 rounded border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Cable className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-semibold text-neutral-200">
                      Automatic Port Forwarding:
                    </span>{' '}
                    <span className="text-cyan-300 font-mono">
                      tcp:{port} → tcp:{port}
                    </span>{' '}
                    <span className="text-neutral-400 text-[11px]">
                      ({isAutoForwarding ? 'Forwarding...' : hasForwardRule ? 'Active' : 'Configured'})
                    </span>
                  </div>
                </div>

                {/* Edge-case Re-forward button */}
                <button
                  onClick={() => triggerPortForward(selectedSerial, port, false)}
                  disabled={isAutoForwarding || !selectedSerial}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto disabled:opacity-50"
                  title="Re-run port forwarding rule for this device"
                >
                  <RefreshCw className={`w-3 h-3 ${isAutoForwarding ? 'animate-spin' : ''}`} />
                  <span>Re-Forward Port</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Edge Case Recovery Panel */}
        <div className="bg-[#0e121a] p-5 rounded-lg border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-neutral-200">
                Troubleshooting &amp; Recovery
              </h3>
            </div>
          </div>

          <p className="text-xs text-neutral-400">
            If your Android device is connected via USB but ADB is unresponsive or dropped the connection, use this button to restart the local ADB daemon.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRestartAdbServer}
              disabled={isRestartingServer}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 hover:border-amber-700/80 rounded text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRestartingServer ? 'animate-spin' : ''}`} />
              <span>{isRestartingServer ? 'Restarting ADB...' : 'Kill & Restart ADB Server'}</span>
            </button>

            {selectedSerial && (
              <button
                onClick={() => triggerPortForward(selectedSerial, port, false)}
                disabled={isAutoForwarding}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-neutral-700 hover:border-cyan-700/80 rounded text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Force Re-Forward Port {port}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Terminal CLI Stream Instructions Card */}
        <div className="bg-[#0e121a] p-5 rounded-lg border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-neutral-200">
                Terminal CLI Stream (Headless Mode)
              </h3>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/50 border border-cyan-800/80 px-2 py-0.5 rounded">
              Raw TCP Stream
            </span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Prefer streaming network traffic directly in your shell or VS Code terminal instead of the browser? Run this command:
          </p>

          <div className="flex items-center justify-between p-3 bg-[#07090d] border border-neutral-800 rounded font-mono text-xs text-cyan-300">
            <code>npm run cli</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText('npm run cli');
                setCopiedCli(true);
                setTimeout(() => setCopiedCli(false), 2000);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 text-[11px] transition-colors"
            >
              {copiedCli ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 space-y-1">
            <p>
              • Connects directly to the forwarded port <code className="text-neutral-400 font-mono">127.0.0.1:{port}</code> over TCP.
            </p>
            <p>
              • You can also press <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300 text-[10px]">F5</kbd> in VS Code and select <strong>&quot;▶ Run Standalone Terminal CLI&quot;</strong>.
            </p>
          </div>
        </div>

        {/* 4. ADB Binary Configuration (Collapsible or Clean Section) */}
        <div className="bg-[#0e121a] p-5 rounded-lg border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-neutral-200">
              ADB Binary Path &amp; Port Settings
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[11px] font-semibold text-neutral-400">
                ADB Executable Location
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-neutral-400 font-mono">
              {adbVersion ? (
                <span className="text-emerald-400">{adbVersion}</span>
              ) : adbError ? (
                <span className="text-rose-400">{adbError}</span>
              ) : (
                <span>Using system PATH binary</span>
              )}
            </div>

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
              <span>Save &amp; Test Path</span>
            </button>
          </div>
        </div>

        {/* 4. Diagnostic Terminal Log */}
        {commandLog && (
          <div className="bg-[#07090d] p-4 rounded border border-neutral-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400 text-[11px] pb-1 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Command: {commandLog.command}</span>
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

        {/* 5. Android Client Reference */}
        <div className="p-4 bg-[#0e121a] rounded border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-neutral-200 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Android Setup (<code>/client</code>)</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Your client library in <code className="text-cyan-300">/client/core</code> and sample app in{' '}
            <code className="text-cyan-300">/client/app</code> are already hooked up:
          </p>
          <div className="bg-[#07090d] p-3 rounded border border-neutral-800/80 font-mono text-[11px] text-neutral-300 space-y-1">
            <div><span className="text-neutral-500">// Application onCreate:</span></div>
            <div>NetworkInspector.install(this)</div>
            <div className="pt-1"><span className="text-neutral-500">// OkHttpClient builder:</span></div>
            <div>OkHttpClient.Builder().addInterceptor(NetworkInspectorInterceptor()).build()</div>
          </div>
        </div>
      </div>
    </div>
  );
};
