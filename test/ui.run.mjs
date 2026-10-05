// Serves this folder, opens test/ui.html in headless Chrome (it drives the real
// page in a phone-sized frame) and fails on any FAIL line.
//   node test/ui.run.mjs
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(root, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'wt-ui-'));
let dom = '';
try {
  ({ stdout: dom } = await promisify(execFile)(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--virtual-time-budget=90000', '--dump-dom', `http://127.0.0.1:${server.address().port}/test/ui.html`], { timeout: 120000, maxBuffer: 1 << 26 }));
} catch (e) {
  dom = e.stdout || '';
}
server.close();
const out = (dom.match(/<pre id="out">([\s\S]*?)<\/pre>/) || [])[1] || 'no output';
console.log(out.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
process.exit(/^FAIL/m.test(out) || !/DONE/.test(out) ? 1 : 0);
