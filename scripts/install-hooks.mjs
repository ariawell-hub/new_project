// npm install 때(prepare) 실행된다. git 저장소라면 .githooks 폴더를 git 훅 경로로 지정한다.
import { spawnSync } from 'node:child_process';

const inRepo = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
if (inRepo.status !== 0) {
  console.log('git 저장소가 아니라서 git 훅 설정을 건너뜁니다.');
  process.exit(0);
}
const r = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
if (r.status === 0) console.log('git 훅 경로를 .githooks 로 설정했어요 (커밋 전 npm run check).');
process.exit(r.status ?? 1);
