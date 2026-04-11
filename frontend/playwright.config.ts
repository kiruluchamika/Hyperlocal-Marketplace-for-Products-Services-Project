import { defineConfig } from '@playwright/test';
import module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendNodeModules = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules');
process.env.NODE_PATH = [frontendNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
(module as typeof module & { Module: { _initPaths(): void } }).Module._initPaths();

export default defineConfig({
  testDir: '../tests',
  timeout: 30 * 1000,
  workers: 1,
  use: {
    headless: true,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
