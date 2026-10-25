// Reference runner for spec/conformance: every case's declared outcome must hold.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { lint } = require('../lib/lint');
const { toTypedIR } = require('../lib/ir');

const DIR = path.join(__dirname, '..', '..', '..', 'spec', 'conformance');
const get = (o, p) => p.split('.').reduce((v, k) => (v == null ? undefined : v[/^\d+$/.test(k) ? +k : k]), o);

for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.juxt')).sort()) {
  test(`conformance: ${f}`, () => {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    const { prog, diags } = lint(src);
    const head = src.split('\n').filter(l => /^#\s*(expect|ir):/.test(l));
    assert.ok(head.length, 'case must declare # expect:');
    for (const line of head) {
      let m = line.match(/^#\s*expect:\s*(ok|error|warning)\s*(.*)$/);
      if (m) {
        if (m[1] === 'ok') assert.deepStrictEqual(diags, [], 'expected no diagnostics');
        else assert.ok(diags.some(d => d.level === m[1] && d.msg.includes(m[2].trim())),
          `expected ${m[1]} containing "${m[2].trim()}", got ${JSON.stringify(diags)}`);
        continue;
      }
      m = line.match(/^#\s*ir:\s*([\w.]+)\s*=\s*(.+)$/);
      if (m) assert.deepStrictEqual(get(toTypedIR(prog), m[1]), JSON.parse(m[2]), `ir.${m[1]}`);
    }
  });
}
