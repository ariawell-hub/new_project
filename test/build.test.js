const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../roulette.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('index.html이 쓰는 R.* 이름이 roulette.js에 모두 있다', () => {
  const used = [...html.matchAll(/\bR\.(\w+)/g)].map((m) => m[1]);
  const destructured = html.match(/const \{([^}]+)\} = R;/)[1].split(',').map((s) => s.trim());
  const missing = [...new Set([...used, ...destructured])].filter((name) => !(name in R));
  assert.deepEqual(missing, [], `roulette.js에 없는 이름: ${missing.join(', ')}`);
});

test('index.html은 roulette.js를 인라인 스크립트보다 먼저 불러온다', () => {
  const src = html.indexOf('<script src="roulette.js"></script>');
  const inline = html.indexOf('<script>');
  assert.ok(src > 0, 'roulette.js를 불러오는 태그가 없어요');
  assert.ok(src < inline, 'roulette.js가 인라인 스크립트보다 뒤에 있어요');
});

test('inlineScript는 script src 태그를 파일 내용으로 바꾼다', async () => {
  const { inlineScript } = await import('../scripts/build.mjs');
  const js = 'const a = `${1}$&$1`;\n';
  assert.equal(
    inlineScript('<head><script src="roulette.js"></script></head>', js),
    '<head><script>\nconst a = `${1}$&$1`;\n</script></head>',
  );
});

test('inlineScript는 태그가 없거나 JS에 </script가 있으면 실패한다', async () => {
  const { inlineScript } = await import('../scripts/build.mjs');
  assert.throws(() => inlineScript('<head></head>', ''), /찾지 못했어요/);
  assert.throws(() => inlineScript('<script src="roulette.js"></script>', 'x = "</script>"'), /인라인할 수 없어요/);
});

test('실제 index.html과 roulette.js로 빌드하면 외부 스크립트가 남지 않는다', async () => {
  const { inlineScript } = await import('../scripts/build.mjs');
  const js = fs.readFileSync(path.join(__dirname, '..', 'roulette.js'), 'utf8');
  const out = inlineScript(html, js);
  // roulette.js 주석에도 '<script src="roulette.js">' 문구가 있으므로 닫는 태그까지 포함해 실제 태그만 찾는다
  assert.ok(!out.includes('<script src="roulette.js"></script>'), '외부 스크립트 태그가 남아 있어요');
  assert.ok(out.includes('function spinRotation'), 'roulette.js 내용이 들어가지 않았어요');
});
