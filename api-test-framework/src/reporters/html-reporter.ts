/**
 * Custom node:test reporter that writes a self-contained HTML report.
 *
 * Usage:
 *   node --test --test-reporter=./src/reporters/html-reporter.ts --test-reporter-destination=reports/report.html
 *
 * node:test streams events (test:pass, test:fail, ...). Children finish before their parent,
 * so we collect finished tests per nesting level and attach them when the parent finishes.
 */
import { basename } from 'node:path';

interface TestNode {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'todo';
  durationMs: number;
  error?: string;
  children: TestNode[];
}

interface FileResult {
  file: string;
  tests: TestNode[];
}

export default async function* htmlReporter(source: AsyncIterable<any>): AsyncGenerator<string> {
  const pendingByFile = new Map<string, TestNode[][]>();
  const startedAt = new Date();

  for await (const event of source) {
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const { name, nesting, file = 'unknown', details = {}, skip, todo } = event.data;
    // node:test also reports each test file as a top-level "test" named after the file path — skip those wrappers.
    if (nesting === 0 && file && name === file) continue;

    const levels = pendingByFile.get(file) ?? [];
    pendingByFile.set(file, levels);

    const node: TestNode = {
      name,
      status: skip !== undefined ? 'skip' : todo !== undefined ? 'todo' : event.type === 'test:pass' ? 'pass' : 'fail',
      durationMs: Math.round(details.duration_ms ?? 0),
      error: event.type === 'test:fail' ? formatError(details.error) : undefined,
      children: levels[nesting + 1] ?? [],
    };
    levels[nesting + 1] = [];
    (levels[nesting] ??= []).push(node);
  }

  const files: FileResult[] = [...pendingByFile.entries()].map(([file, levels]) => ({ file, tests: levels[0] ?? [] }));
  yield render(files, startedAt);
}

function formatError(err: any): string {
  if (!err) return 'Unknown error';
  const inner = err.cause ?? err;
  return String(inner.message ?? inner);
}

function leaves(nodes: TestNode[]): TestNode[] {
  return nodes.flatMap((n) => (n.children.length ? leaves(n.children) : [n]));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function renderNode(n: TestNode): string {
  if (n.children.length) {
    const failed = leaves(n.children).some((l) => l.status === 'fail');
    return `<details class="suite" ${failed ? 'open' : ''}><summary class="${failed ? 'fail' : 'pass'}">${esc(n.name)} <span class="ms">${n.durationMs}ms</span></summary>${n.children.map(renderNode).join('')}</details>`;
  }
  const icon = { pass: '✔', fail: '✘', skip: '↷', todo: '…' }[n.status];
  const err = n.error ? `<pre>${esc(n.error)}</pre>` : '';
  return `<div class="test ${n.status}"><span>${icon} ${esc(n.name)}</span><span class="ms">${n.durationMs}ms</span>${err}</div>`;
}

function render(files: FileResult[], startedAt: Date): string {
  const all = files.flatMap((f) => leaves(f.tests));
  const count = (s: TestNode['status']) => all.filter((t) => t.status === s).length;
  const passed = count('pass');
  const failed = count('fail');
  const skipped = count('skip') + count('todo');
  const rate = all.length ? Math.round((passed / all.length) * 100) : 0;

  const sections = files
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((f) => {
      const ls = leaves(f.tests);
      const ok = ls.every((t) => t.status !== 'fail');
      return `<section><h2 class="${ok ? 'pass' : 'fail'}">${esc(basename(f.file))} <small>${ls.filter((t) => t.status === 'pass').length}/${ls.length}</small></h2>${f.tests.map(renderNode).join('')}</section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>API Test Report</title>
<style>
  :root{--pass:#1a7f37;--fail:#cf222e;--skip:#9a6700;--bg:#f6f8fa;--fg:#1f2328;--muted:#656d76}
  body{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:var(--bg);color:var(--fg)}
  header{background:#fff;border-bottom:1px solid #d0d7de;padding:24px 32px}
  h1{margin:0 0 4px;font-size:22px} .muted{color:var(--muted)}
  .stats{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap}
  .stat{background:var(--bg);border-radius:8px;padding:10px 16px;min-width:90px}
  .stat b{display:block;font-size:22px}
  .bar{height:8px;background:#ffd8d3;border-radius:4px;overflow:hidden;margin-top:16px}
  .bar div{height:100%;background:var(--pass)}
  main{padding:24px 32px;max-width:1000px}
  section{background:#fff;border:1px solid #d0d7de;border-radius:8px;padding:12px 16px;margin-bottom:16px}
  h2{font-size:15px;margin:4px 0 8px} h2 small{color:var(--muted);font-weight:400}
  summary{cursor:pointer;font-weight:600;padding:4px 0}
  .suite{margin-left:4px;padding-left:12px;border-left:2px solid #eaeef2}
  .test{display:flex;justify-content:space-between;flex-wrap:wrap;padding:3px 0}
  .ms{color:var(--muted);font-size:12px;font-weight:400}
  .pass{color:var(--pass)} .fail{color:var(--fail)} .skip,.todo{color:var(--skip)}
  .test span:first-child{color:var(--fg)} .test.fail span:first-child{color:var(--fail)}
  pre{flex-basis:100%;background:#fff5f5;color:#82071e;padding:10px;border-radius:6px;white-space:pre-wrap;font-size:12px;margin:6px 0}
</style></head><body>
<header>
  <h1>API Test Report</h1>
  <div class="muted">Generated ${startedAt.toISOString()} · Target ${esc(process.env.API_BASE_URL ?? 'http://localhost:4000')}</div>
  <div class="stats">
    <div class="stat"><b>${all.length}</b>Total</div>
    <div class="stat pass"><b>${passed}</b>Passed</div>
    <div class="stat fail"><b>${failed}</b>Failed</div>
    <div class="stat skip"><b>${skipped}</b>Skipped</div>
    <div class="stat"><b>${rate}%</b>Pass rate</div>
  </div>
  <div class="bar"><div style="width:${rate}%"></div></div>
</header>
<main>${sections || '<p>No tests were reported.</p>'}</main>
</body></html>`;
}
