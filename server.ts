import express, { Request, Response } from 'express';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ADB_PORT = 10245;
const ADB_HOST = '127.0.0.1';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Connected SSE clients for live web UI streaming
  const sseClients: Response[] = [];

  // Active state of real Android socket connection
  let isAdbConnected = false;
  let detectedDevice: any = null;
  let adbSocket: net.Socket | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;

  function connectToAdbSocket() {
    if (adbSocket) {
      adbSocket.destroy();
      adbSocket = null;
    }

    adbSocket = net.createConnection({ host: ADB_HOST, port: ADB_PORT }, () => {
      isAdbConnected = true;
      console.log(`[BlameBackend Server] Connected to Android TCP socket at ${ADB_HOST}:${ADB_PORT}`);
      broadcastSse({ type: 'STATUS', connected: true });
    });

    let buffer = '';

    adbSocket.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const envelope = JSON.parse(line);
          if (envelope.type === 'HELLO') {
            detectedDevice = JSON.parse(envelope.payloadJson);
            broadcastSse({ type: 'DEVICE_INFO', device: detectedDevice });
          } else if (envelope.type === 'NETWORK_EVENT') {
            const event = JSON.parse(envelope.payloadJson);
            broadcastSse({ type: 'NETWORK_EVENT', event });
          }
        } catch (e: any) {
          console.error('[BlameBackend Server] Failed to parse wire message:', e.message);
        }
      }
    });

    adbSocket.on('error', (err: any) => {
      isAdbConnected = false;
      // Normal when no device is forwarded or device is sleeping; silence spam
    });

    adbSocket.on('close', () => {
      isAdbConnected = false;
      broadcastSse({ type: 'STATUS', connected: false });
      // Schedule background reconnect attempt
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectToAdbSocket();
        }, 3000);
      }
    });
  }

  // Initial attempt to connect to ADB port
  connectToAdbSocket();

  function broadcastSse(data: any) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (let i = sseClients.length - 1; i >= 0; i--) {
      try {
        sseClients[i].write(payload);
      } catch {
        sseClients.splice(i, 1);
      }
    }
  }

  // API endpoint: Status of the real ADB socket connection
  app.get('/api/adb-status', (req: Request, res: Response) => {
    res.json({
      connected: isAdbConnected,
      port: ADB_PORT,
      host: ADB_HOST,
      device: detectedDevice
    });
  });

  // API endpoint: Live event stream for browser
  app.get('/api/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial status
    res.write(`data: ${JSON.stringify({ type: 'STATUS', connected: isAdbConnected, device: detectedDevice })}\n\n`);

    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // Attach Vite middleware in development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BlameBackend Server] Running on http://localhost:${PORT}`);
    console.log(`[BlameBackend Server] Raw TCP socket listener targeting 127.0.0.1:${ADB_PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BlameBackend Server] Failed to start:', err);
  process.exit(1);
});
