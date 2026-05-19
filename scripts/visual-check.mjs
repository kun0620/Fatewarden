import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const baseUrl = process.env.VISUAL_URL || 'http://127.0.0.1:5173/';
const outDir = resolve('.tmp/visual-checks');
const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 832 },
];

async function isReachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) {
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startDevServer() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawn(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], {
    stdio: 'inherit',
    shell: false,
  });
}

mkdirSync(outDir, { recursive: true });

let serverProcess;
if (!(await isReachable(baseUrl))) {
  serverProcess = startDevServer();
  await waitForServer(baseUrl);
}

const browser = await chromium.launch({
  headless: process.env.HEADED !== '1',
});

const captures = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.addStyleTag({
      content: `*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; animation-delay: 0s !important; }`,
    });

    const outputPath = resolve(outDir, `${viewport.name}.png`);
    await page.screenshot({ path: outputPath, fullPage: false });
    captures.push(outputPath);
    await page.close();
  }
} finally {
  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }
}

console.log(`Captured ${captures.length} screenshots:`);
for (const capture of captures) {
  console.log(capture);
}
