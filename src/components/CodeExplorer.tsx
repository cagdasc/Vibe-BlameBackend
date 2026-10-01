import React, { useState } from 'react';
import { SOURCE_FILES, SourceFile } from '../codebase/sourceFiles';
import { Folder, FileCode, Copy, Check, Download, Layers, ShieldCheck, Cpu } from 'lucide-react';

export const CodeExplorer: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>(SOURCE_FILES[0].path);
  const [copied, setCopied] = useState(false);

  const selectedFile: SourceFile =
    SOURCE_FILES.find((f) => f.path === selectedPath) || SOURCE_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.path.split('/').pop() || 'file.kt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const modules = Array.from(new Set(SOURCE_FILES.map((f) => f.module)));

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-neutral-200 overflow-hidden font-mono text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0e121a] border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Complete Android & Desktop Kotlin Source Code Repository</span>
          </h2>
          <p className="text-neutral-400 text-[11px] font-sans mt-0.5">
            Production-grade Kotlin implementation for Android SDK (OkHttp & Ktor), Wire Protocol, Desktop TUI, and Sample App.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors text-xs font-sans"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied File</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors text-xs font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left File Tree (280px) */}
        <div className="w-72 bg-[#080a0f] border-r border-neutral-800 flex flex-col overflow-y-auto p-3 space-y-4">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-2 font-sans">
            Modules & Source Files
          </div>

          <div className="space-y-3">
            {modules.map((mod) => {
              const filesInMod = SOURCE_FILES.filter((f) => f.module === mod);
              return (
                <div key={mod} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-neutral-400 text-[11px] font-semibold">
                    <Folder className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{mod}</span>
                  </div>

                  <div className="space-y-0.5 pl-2">
                    {filesInMod.map((file) => {
                      const fileName = file.path.split('/').pop();
                      const isSelected = file.path === selectedFile.path;

                      return (
                        <button
                          key={file.path}
                          onClick={() => setSelectedPath(file.path)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors text-xs ${
                            isSelected
                              ? 'bg-neutral-800 text-cyan-300 font-semibold border-l-2 border-cyan-400 pl-[8px]'
                              : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                          }`}
                        >
                          <FileCode className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span className="truncate">{fileName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Architecture Summary Box */}
          <div className="mt-auto p-3 bg-[#0e121a] rounded border border-neutral-800/80 space-y-2 text-[11px] font-sans">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              <span>Zero-Interference Guarantee</span>
            </div>
            <p className="text-neutral-400 text-[10px] leading-relaxed">
              The inspector observes network streams without proxying, modifying, or blocking application threads. If the desktop tool disconnects, traffic drops silently without failing app networking.
            </p>
          </div>
        </div>

        {/* Right Code Display */}
        <div className="flex-1 flex flex-col bg-[#0b0e14] overflow-hidden">
          {/* File Metadata Bar */}
          <div className="px-5 py-2.5 bg-[#0e121a] border-b border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-cyan-400 font-semibold">{selectedFile.path}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-400 font-sans truncate">{selectedFile.description}</span>
            </div>
            <span className="text-neutral-500 font-sans text-[11px] shrink-0">
              {selectedFile.language.toUpperCase()}
            </span>
          </div>

          {/* Code Viewer with Line Numbers */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-neutral-300 select-text">
            <table className="w-full border-collapse">
              <tbody>
                {selectedFile.content.split('\n').map((line, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/40">
                    <td className="w-12 text-right pr-4 text-neutral-600 select-none tabular-nums text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre">
                      {highlightKotlin(line)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

function highlightKotlin(line: string): React.ReactNode {
  // Simple token highlight for keywords
  const keywords = ['package', 'import', 'class', 'object', 'data', 'fun', 'val', 'var', 'private', 'override', 'return', 'try', 'catch', 'throw', 'if', 'else', 'when', 'is', 'in', 'null', 'true', 'false', 'companion', 'enum', 'while', 'for'];

  // Comments
  if (line.trim().startsWith('//')) {
    return <span className="text-neutral-500 italic">{line}</span>;
  }
  if (line.trim().startsWith('/*') || line.trim().startsWith('*')) {
    return <span className="text-neutral-500 italic">{line}</span>;
  }

  // Annotations
  if (line.trim().startsWith('@')) {
    return <span className="text-amber-400">{line}</span>;
  }

  return <span>{line}</span>;
}
