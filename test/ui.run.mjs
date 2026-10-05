// Serves this folder, opens test/ui.html in headless Chrome (it drives the real
// page in a phone-sized frame), reads the result over the DevTools protocol as
// soon as it says DONE, and fails on any FAIL line.
//   node test/ui.run.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(root, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const page = `http://127.0.0.1:${server.address().port}/test/ui.html`;
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'wt-ui-'))}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', page], { stdio: ['ignore', 'ignore', 'pipe'] });

let out = '';
try {
  const browser = await new Promise((ok, fail) => {
    let log = '';
    proc.stderr.on('data', (d) => {
      log += d;
      const m = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) ok(m[1]);
    });
    setTimeout(() => fail(new Error('Chrome did not start')), 20000);
  });
  const base = browser.replace(/^ws:\/\/([^/]+)\/.*$/, 'http://$1');
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    target = (await (await fetch(`${base}/json/list`)).json()).find((t) => t.type === 'page' && t.url === page);
    if (!target) await sleep(100);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener('open', ok));
  let seq = 0;
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (waiting.has(msg.id)) waiting.get(msg.id)(msg);
  });
  const read = () =>
    new Promise((ok) => {
      const id = ++seq;
      waiting.set(id, (msg) => ok(msg.result?.result?.value || ''));
      ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: "(document.getElementById('out') || {}).textContent || ''", returnByValue: true } }));
    });
  for (const end = Date.now() + 150000; Date.now() < end; await sleep(400)) {
    out = await read();
    if (/(^|\n)DONE|FAIL crashed/.test(out)) break;
  }
  ws.close();
} catch (e) {
  out = `${out}\nFAIL runner: ${e.message}`;
}
proc.kill();
server.close();
console.log(out || 'FAIL no output');
process.exit(/^FAIL/m.test(out) || !/DONE/.test(out) ? 1 : 0);
