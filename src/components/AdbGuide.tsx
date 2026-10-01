import React, { useState } from 'react';
import { Terminal, Shield, Cpu, Copy, Check, Smartphone, ArrowRight } from 'lucide-react';

export const AdbGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-neutral-200 overflow-y-auto p-6 space-y-6">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <span>Developer Setup & ADB Transport Guide</span>
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Follow the lightweight, zero-configuration local debugging workflow for your Android applications.
          </p>
        </div>

        {/* 4-Step Quick Start Workflow */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
            Quick Start Workflow
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0e121a] p-4 rounded border border-neutral-800 space-y-2">
              <span className="text-xs font-mono font-bold text-cyan-400">Step 1</span>
              <h4 className="text-xs font-semibold text-neutral-200">Add Debug Dependency</h4>
              <p className="text-[11px] text-neutral-400">
                Include only via <code className="text-cyan-300">debugImplementation</code> so release builds are completely untouched.
              </p>
            </div>

            <div className="bg-[#0e121a] p-4 rounded border border-neutral-800 space-y-2">
              <span className="text-xs font-mono font-bold text-cyan-400">Step 2</span>
              <h4 className="text-xs font-semibold text-neutral-200">Install Interceptor / Plugin</h4>
              <p className="text-[11px] text-neutral-400">
                Plug into OkHttp builder or Ktor client install block. Non-blocking & safe.
              </p>
            </div>

            <div className="bg-[#0e121a] p-4 rounded border border-neutral-800 space-y-2">
              <span className="text-xs font-mono font-bold text-cyan-400">Step 3</span>
              <h4 className="text-xs font-semibold text-neutral-200">Forward ADB Port</h4>
              <p className="text-[11px] text-neutral-400">
                Run <code className="text-cyan-300">adb forward</code> once. Works over USB or WiFi without subnet constraints.
              </p>
            </div>

            <div className="bg-[#0e121a] p-4 rounded border border-neutral-800 space-y-2">
              <span className="text-xs font-mono font-bold text-cyan-400">Step 4</span>
              <h4 className="text-xs font-semibold text-neutral-200">Launch CLI/TUI</h4>
              <p className="text-[11px] text-neutral-400">
                Run <code className="text-cyan-300">blamebackend</code>. Traffic appears in real time.
              </p>
            </div>
          </div>
        </div>

        {/* ADB Port Forward Command */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-300">
              1. ADB Port Forwarding
            </h3>
            <button
              onClick={() => handleCopy('adb forward tcp:10245 tcp:10245', 1)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
            >
              {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Command</span>
            </button>
          </div>
          <div className="bg-[#07090d] p-3.5 rounded border border-neutral-800 font-mono text-xs text-cyan-300 select-all">
            adb forward tcp:10245 tcp:10245
          </div>
          <p className="text-xs text-neutral-400">
            ADB port forwarding allows your development workstation to stream directly from Android <code className="text-neutral-300">127.0.0.1:10245</code> without opening external firewall ports or requiring the Android device and computer to be on the same local network.
          </p>
        </div>

        {/* Integration Code Snippets */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-300">
            2. Code Integration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OkHttp Snippet */}
            <div className="bg-[#0e121a] p-4 rounded border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">OkHttp 4.x / 5.x</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `val client = OkHttpClient.Builder()\n    .addInterceptor(NetworkInspectorInterceptor())\n    .build()`,
                      2
                    )
                  }
                  className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
                >
                  {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 bg-[#07090d] rounded border border-neutral-800/80 font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`val client = OkHttpClient.Builder()
    .addInterceptor(NetworkInspectorInterceptor())
    .build()`}
              </pre>
              <p className="text-[11px] text-neutral-400">
                Non-destructive interceptor buffers headers & response bodies without consuming streams.
              </p>
            </div>

            {/* Ktor Snippet */}
            <div className="bg-[#0e121a] p-4 rounded border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">Ktor Client 2.x / 3.x</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `val client = HttpClient(CIO) {\n    install(NetworkInspector) {\n        maxBodySizeBytes = 64 * 1024L\n    }\n}`,
                      3
                    )
                  }
                  className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
                >
                  {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 bg-[#07090d] rounded border border-neutral-800/80 font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`val client = HttpClient(CIO) {
    install(NetworkInspector) {
        maxBodySizeBytes = 64 * 1024L
    }
}`}
              </pre>
              <p className="text-[11px] text-neutral-400">
                Native Ktor plugin works with any engine (Android, CIO, OkHttp, Darwin, Curl).
              </p>
            </div>
          </div>
        </div>

        {/* Security & Release Guarantees */}
        <div className="p-5 bg-[#0e121a] rounded border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 text-neutral-200 font-semibold text-sm">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Production Safety & Security Boundaries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-400">
            <div className="space-y-1">
              <span className="font-semibold text-neutral-200">No Release Artifacts</span>
              <p>
                Using <code className="text-cyan-300">debugImplementation</code> ensures no server code or inspection hooks ever compile into production APKs.
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-neutral-200">Automatic Redaction</span>
              <p>
                <code className="text-cyan-300">Authorization</code>, <code className="text-cyan-300">Cookie</code>, and <code className="text-cyan-300">X-API-Key</code> are replaced with &lt;redacted&gt; by default.
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-neutral-200">Local Only (No Cloud)</span>
              <p>
                Streams strictly over local socket/ADB. Never communicates with the public internet or external analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
