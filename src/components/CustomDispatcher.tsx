import React, { useState } from 'react';
import { simulator } from '../engine/mockClient';
import { HttpMethod } from '../types/inspector';
import { Send, Plus, Trash2, Key, Sliders, CheckCircle } from 'lucide-react';

interface CustomDispatcherProps {
  onDispatched: () => void;
}

export const CustomDispatcher: React.FC<CustomDispatcherProps> = ({ onDispatched }) => {
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [url, setUrl] = useState('https://api.example.com/v1/orders/checkout');
  const [clientType, setClientType] = useState<'okhttp' | 'ktor'>('okhttp');
  const [statusCode, setStatusCode] = useState(201);
  const [delayMs, setDelayMs] = useState(220);

  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: 'Authorization', value: 'Bearer secret_live_token_77a9c2b4' },
    { key: 'Content-Type', value: 'application/json' },
    { key: 'X-API-Key', value: 'key_prod_auth_secret_998' }
  ]);

  const [body, setBody] = useState(`{
  "orderId": "ord_88294",
  "customerId": "cust_331",
  "items": [
    { "sku": "dev-item-01", "quantity": 2, "priceUsd": 24.50 },
    { "sku": "dev-item-02", "quantity": 1, "priceUsd": 19.99 }
  ],
  "shippingTier": "priority_overnight"
}`);

  const [responseBody, setResponseBody] = useState(`{
  "status": "order_confirmed",
  "orderId": "ord_88294",
  "estimatedDelivery": "2026-10-02T12:00:00Z",
  "trackingNumber": "TRK-990184-US"
}`);

  const [isSending, setIsSending] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (idx: number) => {
    setHeaders(headers.filter((_, i) => i !== idx));
  };

  const updateHeader = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...headers];
    updated[idx][field] = val;
    setHeaders(updated);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const headerMap: Record<string, string> = {};
    headers.forEach(h => {
      if (h.key.trim()) {
        headerMap[h.key.trim()] = h.value;
      }
    });

    try {
      await simulator.executeRequest({
        clientType,
        method,
        url,
        requestHeaders: headerMap,
        requestBody: method !== 'GET' && method !== 'HEAD' ? body : undefined,
        statusCode,
        delayMs,
        responseBody
      });
      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 2000);
      onDispatched();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-neutral-200 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-400" />
            <span>Custom Request Dispatcher</span>
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Dispatch any custom HTTP request to test inspector interception, header redaction, and body inspection rules.
          </p>
        </div>

        <form onSubmit={handleSend} className="space-y-5 bg-[#0e121a] p-6 rounded border border-neutral-800">
          {/* Method + URL + Client Engine */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full bg-[#07090d] border border-neutral-700 text-neutral-200 rounded px-3 py-2 text-xs font-mono font-semibold focus:border-cyan-500 outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div className="md:col-span-7">
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Request URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full bg-[#07090d] border border-neutral-700 text-neutral-200 rounded px-3 py-2 text-xs font-mono focus:border-cyan-500 outline-none"
                placeholder="https://api.example.com/endpoint"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Client Integration
              </label>
              <div className="flex bg-[#07090d] border border-neutral-700 rounded p-0.5">
                <button
                  type="button"
                  onClick={() => setClientType('okhttp')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                    clientType === 'okhttp'
                      ? 'bg-neutral-800 text-cyan-400 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  OkHttp
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('ktor')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                    clientType === 'ktor'
                      ? 'bg-neutral-800 text-cyan-400 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Ktor
                </button>
              </div>
            </div>
          </div>

          {/* Simulated Latency & Return Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-[#07090d] rounded border border-neutral-800/80">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-neutral-400">Simulated Network Latency</span>
                <span className="text-cyan-400 font-mono tabular-nums">{delayMs} ms</span>
              </div>
              <input
                type="range"
                min="20"
                max="2500"
                step="20"
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-neutral-400">Response Status Code</span>
                <span className="text-neutral-200 font-mono">{statusCode}</span>
              </div>
              <select
                value={statusCode}
                onChange={(e) => setStatusCode(parseInt(e.target.value, 10))}
                className="w-full bg-[#0e121a] border border-neutral-700 text-neutral-200 rounded px-2.5 py-1 text-xs font-mono outline-none"
              >
                <option value="200">200 OK</option>
                <option value="201">201 Created</option>
                <option value="204">204 No Content</option>
                <option value="400">400 Bad Request</option>
                <option value="401">401 Unauthorized</option>
                <option value="403">403 Forbidden</option>
                <option value="404">404 Not Found</option>
                <option value="429">429 Too Many Requests</option>
                <option value="500">500 Internal Server Error</option>
              </select>
            </div>
          </div>

          {/* Request Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                Request Headers
              </span>
              <button
                type="button"
                onClick={addHeader}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Header</span>
              </button>
            </div>

            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={h.key}
                    onChange={(e) => updateHeader(i, 'key', e.target.value)}
                    placeholder="Header-Name"
                    className="w-1/3 bg-[#07090d] border border-neutral-700 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                  />
                  <input
                    type="text"
                    value={h.value}
                    onChange={(e) => updateHeader(i, 'value', e.target.value)}
                    placeholder="Header-Value"
                    className="flex-1 bg-[#07090d] border border-neutral-700 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(i)}
                    className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Request Body & Response Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-300">
                Request Body (JSON / Text)
              </label>
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-[#07090d] border border-neutral-700 text-neutral-200 rounded p-2.5 text-xs font-mono focus:border-cyan-500 outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-300">
                Mock Response Body
              </label>
              <textarea
                rows={7}
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                className="w-full bg-[#07090d] border border-neutral-700 text-neutral-200 rounded p-2.5 text-xs font-mono focus:border-cyan-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            {successNotice && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Captured in Inspector!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded text-xs transition-colors flex items-center gap-2 shadow-lg shadow-cyan-950/40"
            >
              {isSending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Intercepting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send & Intercept Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
