/**
 * Standalone TypeScript Desktop CLI for BlameBackend
 * 
 * Directly opens a raw TCP socket connection to the Android device via:
 * adb forward tcp:10245 tcp:10245
 * 
 * Run with:
 * npx tsx desktop-cli.ts
 */

import net from 'net';
import readline from 'readline';

const ADB_HOST = '127.0.0.1';
const ADB_PORT = 10245;

interface WireEnvelope {
  type: 'HELLO' | 'NETWORK_EVENT' | 'PING' | 'PONG' | 'GOODBYE';
  version: number;
  timestamp: number;
  payloadJson: string;
}

interface NetworkEventDto {
  id: string;
  timestamp: number;
  request: {
    id: string;
    method: string;
    url: string;
    host: string;
    path: string;
    protocol: string;
    headers: Record<string, string>;
    clientType: string;
    body?: {
      contentType: string | null;
      sizeBytes: number;
      content: string | null;
      truncated: boolean;
      isBinary: boolean;
    };
  };
  response?: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
    durationMs: number;
    sizeBytes: number;
    protocol: string;
    body?: {
      content: string | null;
      truncated: boolean;
      isBinary: boolean;
    };
  };
  durationMs?: number;
  error?: {
    errorType: string;
    message: string;
  };
}

console.log('==================================================');
console.log('  BlameBackend CLI (TypeScript/Node.js Engine)');
console.log('  Raw TCP Socket Reader for Android Network Traffic');
console.log('==================================================');
console.log(`Connecting to Android device on ${ADB_HOST}:${ADB_PORT}...`);
console.log(`(Make sure you ran: adb forward tcp:${ADB_PORT} tcp:${ADB_PORT})\n`);

// Create raw TCP Socket connection to ADB forwarded port
const socket = net.createConnection({ host: ADB_HOST, port: ADB_PORT }, () => {
  console.log(`\x1b[32m[CONNECTED]\x1b[0m Successfully hooked into Android TCP socket on ${ADB_HOST}:${ADB_PORT}!`);
  console.log('Streaming live HTTP traffic from OkHttp and Ktor:\n');
});

// Buffer incoming chunks and split by newline delimiter
let buffer = '';

socket.on('data', (chunk) => {
  buffer += chunk.toString('utf-8');
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep any incomplete fragment in the buffer

  for (const line of lines) {
    if (!line.trim()) continue;
    handleRawWireMessage(line);
  }
});

socket.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
    console.error(`\x1b[31m[CONNECTION REFUSED]\x1b[0m Could not connect to ${ADB_HOST}:${ADB_PORT}.`);
    console.error('1. Did you run: \x1b[33madb forward tcp:10245 tcp:10245\x1b[0m ?');
    console.error('2. Is your debug Android app running with NetworkInspector.install(context)?');
  } else {
    console.error(`\x1b[31m[SOCKET ERROR]\x1b[0m ${err.message}`);
  }
});

socket.on('close', () => {
  console.log('\n\x1b[33m[DISCONNECTED]\x1b[0m Android device disconnected.');
  process.exit(0);
});

function handleRawWireMessage(rawJson: string) {
  try {
    const envelope: WireEnvelope = JSON.parse(rawJson);

    if (envelope.type === 'HELLO') {
      const hello = JSON.parse(envelope.payloadJson);
      console.log(`\x1b[36m[DEVICE DETECTED]\x1b[0m ${hello.deviceModel} (${hello.androidVersion}) - App: ${hello.appPackage}`);
      console.log('─────────────────────────────────────────────────────────────────────────────\n');
      return;
    }

    if (envelope.type === 'NETWORK_EVENT') {
      const event: NetworkEventDto = JSON.parse(envelope.payloadJson);
      renderTerminalEvent(event);
    }
  } catch (err: any) {
    console.error(`[PARSE ERROR] Invalid wire message: ${err.message}`);
  }
}

function renderTerminalEvent(event: NetworkEventDto) {
  const method = event.request.method.padEnd(7);
  const status = event.error
    ? '\x1b[31mERR\x1b[0m'
    : event.response
    ? event.response.statusCode >= 400
      ? `\x1b[33m${event.response.statusCode}\x1b[0m`
      : `\x1b[32m${event.response.statusCode}\x1b[0m`
    : '\x1b[33m...\x1b[0m';

  const hostAndPath = `${event.request.host}${event.request.path}`;
  const duration = event.durationMs !== undefined ? `${event.durationMs}ms` : 'pending';
  const client = `[${event.request.clientType}]`;

  console.log(`${method} ${status}  ${hostAndPath.padEnd(46)} \x1b[90m${client}\x1b[0m \x1b[36m${duration}\x1b[0m`);

  // If there's an error, print it
  if (event.error) {
    console.log(`  \x1b[31m↳ ${event.error.errorType}: ${event.error.message}\x1b[0m`);
  }
}
