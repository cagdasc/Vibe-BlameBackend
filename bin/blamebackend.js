#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const isCli = args.includes('--cli') || args.includes('-c');

const targetScript = isCli
  ? path.join(rootDir, 'desktop-cli.ts')
  : path.join(rootDir, 'server.ts');

const filteredArgs = args.filter(a => a !== '--cli' && a !== '-c');

const child = spawn(process.execPath, [
  path.join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  targetScript,
  ...filteredArgs
], {
  cwd: rootDir,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
