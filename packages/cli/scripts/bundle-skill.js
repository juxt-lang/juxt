// Copies the portable Agent Skill and the licence into the package before npm pack/publish.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', '..');
const src = path.join(root, 'agent-skills', 'juxt'), dst = path.join(__dirname, '..', 'skill');
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(__dirname, '..', 'LICENSE'));
console.log('bundled agent-skills/juxt -> packages/cli/skill');
