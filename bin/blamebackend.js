#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const isCli = args.includes('--cli') || args.includes('-c');

const targetScript = isCli
  ? path.join(rootDir, 'desktop-cli.ts')
  : path.join(rootDir, 'server.ts');

const filteredArgs = args.filter(a => a !== '--cli' && a !== '-c');

let tsxCli;
try {
  tsxCli = require.resolve('tsx/cli');
} catch {
  tsxCli = path.join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

const child = spawn(process.execPath, [
  tsxCli,
  targetScript,
  ...filteredArgs
], {
  cwd: rootDir,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
