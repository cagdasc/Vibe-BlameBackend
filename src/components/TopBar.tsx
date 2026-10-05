import React from 'react';
import { Smartphone, RefreshCw, Trash2, Terminal } from 'lucide-react';
import { DeviceInfo } from '../types/inspector';

interface TopBarProps {
  activeTab: 'tui' | 'scenarios' | 'dispatcher' | 'devices';
  onSelectTab: (tab: 'tui' | 'scenarios' | 'dispatcher' | 'devices') => void;
  deviceInfo: DeviceInfo;
  isConnected: boolean;
  onToggleConnection: () => void;
  eventCount: number;
  onClearEvents: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  deviceInfo,
  isConnected,
  onToggleConnection,
  eventCount,
  onClearEvents,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-[#0e1117] select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('tui');
          }}
          className="text-base font-semibold tracking-tight text-neutral-100 hover:text-cyan-400 transition-colors flex items-center gap-2"
        >
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span>BlameBackend</span>
        </a>
      </div>

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => onSelectTab('tui')}
          className={`transition-colors pb-0.5 ${
            activeTab === 'tui'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          TUI Console
        </button>

        <button
          onClick={() => onSelectTab('scenarios')}
          className={`transition-colors pb-0.5 ${
            activeTab === 'scenarios'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Test Scenarios
        </button>

        <button
          onClick={() => onSelectTab('dispatcher')}
          className={`transition-colors pb-0.5 ${
            activeTab === 'dispatcher'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Dispatcher
        </button>

        <button
          onClick={() => onSelectTab('devices')}
          className={`transition-colors pb-0.5 flex items-center gap-1.5 ${
            activeTab === 'devices'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Devices</span>
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        {/* Device connection status button */}
        <button
          onClick={() => onSelectTab('devices')}
          title="Click to view and select connected devices"
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
            isConnected
              ? 'bg-neutral-900 border-emerald-900/60 text-emerald-400 hover:border-emerald-700'
              : 'bg-neutral-900 border-amber-900/60 text-amber-400 hover:border-amber-700'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isConnected ? deviceInfo.deviceModel : 'Select Device'}
          </span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">tcp:{deviceInfo.port}</span>
        </button>

        {/* Clear captured events */}
        <button
          onClick={onClearEvents}
          title="Clear event buffer (Press 'c' in TUI)"
          disabled={eventCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 rounded border border-neutral-700 transition-colors whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>Clear</span>
          <span className="font-mono text-neutral-400 tabular-nums">({eventCount})</span>
        </button>
      </div>
    </header>
  );
};
