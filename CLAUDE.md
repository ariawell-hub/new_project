# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

랜덤 식단 룰렛 ("오늘 뭐 먹지?") — a lunch-picking roulette wheel. Vanilla JS, no framework, no runtime dependencies; npm is used only for dev tooling. UI text and code comments are in Korean.

## Commands

- `npm run check` — lint → build → test (what the pre-commit hooks run)
- `npm run lint` — `eslint .` and `html-validate index.html`
- `npm run build` — writes the single-file `dist/index.html` (gitignored)
- `npm test` — `node --test "test/**/*.test.js"`
- Single test file: `node --test test/roulette.test.js`; single test: `node --test --test-name-pattern="<name>" test/roulette.test.js`

`npm install` runs `prepare`, which sets `core.hooksPath` to `.githooks` so `git commit` runs `npm run check`. Claude Code also has a PreToolUse hook (`.claude/hooks/pre-commit-check.mjs`) that runs the same check before any `git commit` issued via Bash/PowerShell and blocks on failure. Don't bypass with `--no-verify`.

## Architecture

Two source files, deliberately split:

- `roulette.js` — pure logic, no DOM (state normalization, date math, candidate pool, wheel angle math, messages, `escapeHtml`). It is a UMD-style plain script (not an ES module, so it works from `file://`): it attaches to `window.Roulette` in the browser and `module.exports` under Node, which is how tests `require` it.
- `index.html` — markup, CSS, and an inline `<script>` that does all DOM/canvas/localStorage work via `const R = window.Roulette`. State is persisted under localStorage key `lunchRoulette.v1`; anything read back goes through `R.normalizeState`, which drops malformed entries instead of resetting everything. Keep stored shape backward compatible.

`scripts/build.mjs` inlines `<script src="roulette.js"></script>` into `index.html` to produce an offline single-file `dist/index.html`. The tag must match that exact string, and `roulette.js` must not contain `</script`.

Invariants worth knowing:
- The winner is chosen first, then `spinRotation` computes the rotation so that segment's center lands under the 12 o'clock pointer (with bounded jitter); `indexAtPointer` is the inverse. Wheel/pointer agreement is the most fragile behavior.
- Dates are local `YYYY-MM-DD` strings and `dayDiff` uses calendar-day (UTC of Y/M/D) arithmetic, not 24h deltas.
- User-provided strings (custom menu names) must go through `escapeHtml` before being put in `innerHTML`.
- `test/build.test.js` checks that every `R.*` name used in `index.html` exists in `roulette.js`, so new logic exposed to the UI must be added to the returned API object.

## Review tooling

`roulette-review` skill and `code-reviewer` agent (in `.claude/` and mirrored in `.agents/` / `.codex/`) define this project's review checklist; use them for "리뷰해줘" / pre-commit review requests.
