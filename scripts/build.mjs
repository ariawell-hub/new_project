// index.html의 <script src="roulette.js">를 파일 내용으로 바꿔 dist/index.html 한 파일로 만든다.
// 개발할 때는 파일 2개(테스트하기 쉬움), 배포할 때는 파일 1개(더블클릭·공유하기 쉬움).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_TAG = /<script src="roulette\.js"><\/script>/;

export function inlineScript(html, js) {
  if (!SCRIPT_TAG.test(html)) {
    throw new Error('index.html에서 <script src="roulette.js"></script>를 찾지 못했어요');
  }
  if (/<\/script/i.test(js)) {
    throw new Error('roulette.js에 "</script" 문자열이 있으면 인라인할 수 없어요');
  }
  // 함수로 넘겨야 js 안의 $&, $1 같은 패턴이 치환 문법으로 해석되지 않는다
  return html.replace(SCRIPT_TAG, () => `<script>\n${js}</script>`);
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const js = await readFile(path.join(root, 'roulette.js'), 'utf8');
  const out = inlineScript(html, js);
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await writeFile(path.join(root, 'dist', 'index.html'), out);
  console.log(`dist/index.html 생성 (${(Buffer.byteLength(out) / 1024).toFixed(1)} KB)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`빌드 실패: ${e.message}`);
    process.exit(1);
  });
}
