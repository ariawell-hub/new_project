const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../roulette.js');

const TODAY = '2026-10-14'; // 수요일
const menu = (name, cat = '한식', extra = {}) => ({ id: name, name, cat, emoji: '🍽️', on: true, custom: false, ...extra });
const settings = (over = {}) => ({ cats: [...R.CATS], exclude: true, days: 3, ...over });
const names = (list) => list.map((m) => m.name);

test('spinRotation 후 포인터가 가리키는 칸은 항상 당첨 칸이다', () => {
  for (let n = 2; n <= 12; n++) {
    for (let winner = 0; winner < n; winner++) {
      for (const jitter of [-1, -0.5, 0, 0.5, 1]) {
        for (const current of [0, 123.4, 1800, 7299.9]) {
          const next = R.spinRotation(current, n, winner, jitter);
          assert.equal(R.indexAtPointer(next, n), winner, `n=${n} winner=${winner} jitter=${jitter} current=${current}`);
          assert.ok(next - current >= 5 * 360 && next - current < 6 * 360, '항상 5바퀴 이상 6바퀴 미만으로 돈다');
        }
      }
    }
  }
});

test('dayDiff는 달력 날짜 차이를 계산한다 (월·연·윤년 경계 포함)', () => {
  assert.equal(R.dayDiff(TODAY, TODAY), 0);
  assert.equal(R.dayDiff(TODAY, '2026-10-11'), 3);
  assert.equal(R.dayDiff('2026-11-01', '2026-10-31'), 1);
  assert.equal(R.dayDiff('2027-01-01', '2026-12-31'), 1);
  assert.equal(R.dayDiff('2028-03-01', '2028-02-28'), 2);
});

test('fmtDate는 로컬 날짜를 YYYY-MM-DD로 만든다', () => {
  assert.equal(R.fmtDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('isRecent는 N일 전까지만 최근으로 본다', () => {
  const history = [{ name: '국밥', date: '2026-10-11' }];
  assert.equal(R.isRecent(history, '국밥', TODAY, 3), true);
  assert.equal(R.isRecent(history, '국밥', TODAY, 2), false);
  assert.equal(R.isRecent(history, '라멘', TODAY, 7), false);
});

test('buildPool은 체크 해제, 카테고리, 최근 제외를 모두 반영한다', () => {
  const menus = [menu('김치찌개'), menu('짜장면', '중식'), menu('초밥', '일식', { on: false }), menu('국밥')];
  const history = [{ name: '국밥', date: TODAY }];
  assert.deepEqual(names(R.buildPool(menus, settings(), history, TODAY)), ['김치찌개', '짜장면']);
  assert.deepEqual(names(R.buildPool(menus, settings({ cats: ['중식'] }), history, TODAY)), ['짜장면']);
  assert.deepEqual(names(R.buildPool(menus, settings({ exclude: false }), history, TODAY)), ['김치찌개', '짜장면', '국밥']);
  assert.deepEqual(R.buildPool(menus, settings({ cats: [] }), history, TODAY), []);
});

test('sample은 원본을 바꾸지 않고 중복 없이 최대 n개를 뽑는다', () => {
  const arr = Array.from({ length: 30 }, (_, i) => i);
  const before = [...arr];
  const picked = R.sample(arr, 8);
  assert.equal(picked.length, 8);
  assert.equal(new Set(picked).size, 8);
  assert.ok(picked.every((x) => arr.includes(x)));
  assert.deepEqual(arr, before);
  assert.equal(R.sample([1, 2, 3], 8).length, 3);
  assert.deepEqual(R.sample([], 8), []);
});

test('dripMessage는 돌린 횟수에 따라 바뀌고 마지막 멘트에서 멈춘다', () => {
  assert.equal(R.dripMessage(0), R.DRIPS[0]);
  assert.equal(R.dripMessage(1), R.DRIPS[0]);
  assert.equal(R.dripMessage(3), R.DRIPS[2]);
  assert.equal(R.dripMessage(99), R.DRIPS[R.DRIPS.length - 1]);
});

test('normalizeState는 빈 값이나 형식이 틀린 값이면 기본값을 돌려준다', () => {
  assert.deepEqual(R.normalizeState(null), R.defaults());
  assert.deepEqual(R.normalizeState('oops'), R.defaults());
  assert.deepEqual(R.normalizeState({ menus: 'x', history: [] }), R.defaults());
});

test('normalizeState는 깨진 항목만 버리고 나머지는 살린다', () => {
  const s = R.normalizeState({
    menus: [menu('회사앞순대국', '한식', { custom: true }), { id: 'bad', name: 3, cat: '한식' }, menu('타코', '멕시칸')],
    history: [{ name: '국밥', date: TODAY }, { name: '라멘', date: 'yesterday' }],
    settings: { cats: ['한식', '없는카테고리'], exclude: false, days: 5 },
  });
  assert.deepEqual(names(s.menus), ['회사앞순대국']);
  assert.deepEqual(names(s.history), ['국밥']);
  assert.deepEqual(s.settings, { cats: ['한식'], exclude: false, days: 3 });
});

test('normalizeState는 settings.cats가 배열이 아니어도 메뉴를 잃지 않는다', () => {
  const s = R.normalizeState({ menus: [menu('국밥')], history: [], settings: { cats: '한식' } });
  assert.deepEqual(names(s.menus), ['국밥']);
  assert.deepEqual(s.settings.cats, R.CATS);
});

test('isDuplicateName은 앞뒤 공백과 대소문자를 무시한다', () => {
  const menus = [menu('Pho')];
  assert.equal(R.isDuplicateName(menus, '  pho '), true);
  assert.equal(R.isDuplicateName(menus, '쌀국수'), false);
});

test('escapeHtml은 사용자가 입력한 HTML 특수문자를 이스케이프한다', () => {
  assert.equal(R.escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
});

test('fmtDay는 날짜, 요일, 상대 표현을 보여준다', () => {
  assert.equal(R.fmtDay('2026-10-14', TODAY), '10/14(수) · 오늘');
  assert.equal(R.fmtDay('2026-10-13', TODAY), '10/13(화) · 어제');
  assert.equal(R.fmtDay('2026-10-07', TODAY), '10/7(수) · 7일 전');
});

test('shareText는 이모지와 메뉴 이름을 넣는다', () => {
  assert.equal(R.shareText({ emoji: '🍲', name: '국밥' }), '오늘 점심은 🍲 국밥! 룰렛이 정했으니 이의 없기 🎰');
});

test('기본 메뉴는 카테고리당 6개이고 id와 이름이 겹치지 않는다', () => {
  const { menus } = R.defaults();
  assert.equal(menus.length, 30);
  for (const c of R.CATS) assert.equal(menus.filter((m) => m.cat === c).length, 6, c);
  assert.equal(new Set(menus.map((m) => m.id)).size, 30);
  assert.equal(new Set(names(menus)).size, 30);
});
