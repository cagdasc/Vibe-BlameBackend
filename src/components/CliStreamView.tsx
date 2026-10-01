import React, { useState, useRef, useEffect } from 'react';
import { NetworkEvent } from '../types/inspector';
import { Terminal, Copy, Check, ArrowDown, Download } from 'lucide-react';

interface CliStreamViewProps {
  events: NetworkEvent[];
  onSelectEvent: (id: string) => void;
  onClear: () => void;
}

export const CliStreamView: React.FC<CliStreamViewProps> = ({
  events,
  onSelectEvent,
  onClear
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const copyLog = () => {
    const lines = events.map(e => {
      const method = e.request.method.padEnd(7);
      const status = e.status === 'pending' ? '...' : e.status === 'error' ? 'ERR' : e.response?.statusCode || '...';
      const path = `${e.request.host}${e.request.path}`;
      const duration = e.durationMs !== null ? `${e.durationMs}ms` : 'pending';
      return `${method} ${String(status).padEnd(5)} ${path.padEnd(42)} ${duration}`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadLog = () => {
    const text = events.map(e => JSON.stringify(e, null, 2)).join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-inspector-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#080a0f] text-neutral-200 font-mono text-xs select-text">
      {/* CLI Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e121a] border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-neutral-300">Standard Terminal Stream Output</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400 tabular-nums">{events.length} lines logged</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2.5 py-1 rounded text-[11px] border transition-colors flex items-center gap-1 ${
              autoScroll
                ? 'bg-neutral-800 text-cyan-300 border-neutral-700'
                : 'bg-transparent text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
          >
            <ArrowDown className="w-3 h-3" />
            <span>Auto-scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={copyLog}
            disabled={events.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 rounded border border-neutral-700 transition-colors text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copy Stream</span>
          </button>

          <button
            onClick={downloadLog}
            disabled={events.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 rounded border border-neutral-700 transition-colors text-[11px]"
          >
            <Download className="w-3 h-3" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Stream Terminal Window */}
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto space-y-1 font-mono text-xs leading-relaxed"
      >
        <div className="text-neutral-500 pb-2 border-b border-neutral-800/80 mb-2">
          $ blamebackend --port 10245<br />
          Listening for Android HTTP traffic over ADB port forwarding...<br />
          Click any line to inspect full headers, body, and timings in TUI.
        </div>

        {events.length === 0 ? (
          <div className="text-neutral-600 italic py-8 text-center">
            Waiting for network events from OkHttp or Ktor client...
          </div>
        ) : (
          events.map((event, idx) => {
            const method = event.request.method.padEnd(7);
            const status =
              event.status === 'pending'
                ? '...'
                : event.status === 'error'
                ? 'ERR'
                : event.response?.statusCode || '...';
            const duration =
              event.durationMs !== null ? `${event.durationMs}ms` : 'in-flight';

            const statusColor =
              event.status === 'error'
                ? 'text-rose-400 font-semibold'
                : event.status === 'pending'
                ? 'text-amber-400 animate-pulse'
                : event.response && event.response.statusCode >= 400
                ? 'text-amber-400 font-semibold'
                : 'text-emerald-400 font-semibold';

            const methodColor =
              event.request.method === 'GET'
                ? 'text-cyan-400'
                : event.request.method === 'POST'
                ? 'text-emerald-400'
                : event.request.method === 'PUT'
                ? 'text-amber-400'
                : event.request.method === 'DELETE'
                ? 'text-rose-400'
                : 'text-neutral-300';

            return (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                className="group flex items-baseline gap-4 py-0.5 px-2 rounded hover:bg-neutral-800/70 cursor-pointer transition-colors"
              >
                <span className="text-neutral-600 w-6 text-right tabular-nums select-none">
                  {idx + 1}
                </span>

                <span className={`w-14 font-semibold ${methodColor}`}>
                  {method}
                </span>

                <span className={`w-10 tabular-nums ${statusColor}`}>
                  {status}
                </span>

                <span className="flex-1 truncate text-neutral-300">
                  <span className="text-neutral-500">{event.request.host}</span>
                  <span>{event.request.path}</span>
                </span>

                <span className="text-[10px] text-neutral-500 select-none">
                  [{event.request.clientType}]
                </span>

                <span className="w-16 text-right text-neutral-400 tabular-nums">
                  {duration}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
