// Claude Code PreToolUse 훅: Claude가 Bash/PowerShell로 `git commit`을 실행하기 직전에
// `npm run check`(린트 → 빌드 → 테스트)를 돌리고, 실패하면 exit 2로 커밋을 막는다.
// exit 2일 때 stderr 내용이 Claude에게 전달되므로, 오류 끝부분을 그대로 넘겨 바로 고칠 수 있게 한다.
import { spawnSync } from 'node:child_process';

const GIT_COMMIT = /\bgit\s+(?:-C\s+\S+\s+)?commit\b/;
const MAX_LINES = 60;

let input = '';
for await (const chunk of process.stdin) input += chunk;

let command = '';
try {
  command = JSON.parse(input).tool_input?.command ?? '';
} catch {
  process.exit(0); // 입력을 못 읽으면 막지 않는다 (git pre-commit 훅이 한 번 더 지킨다)
}
if (!GIT_COMMIT.test(command)) process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const r = spawnSync('npm run check --silent', { cwd, encoding: 'utf8', shell: true });
if (r.status === 0) process.exit(0);

const output = `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? r.error.message : ''}`.trim();
const tail = output.split(/\r?\n/).slice(-MAX_LINES).join('\n');
process.stderr.write(
  '커밋 전 검사(npm run check: 린트 → 빌드 → 테스트)가 실패해서 커밋을 막았어요.\n'
  + '아래 오류를 고친 뒤 다시 커밋하세요. 훅을 건너뛰지(--no-verify) 마세요.\n\n'
  + tail + '\n',
);
process.exit(2);
