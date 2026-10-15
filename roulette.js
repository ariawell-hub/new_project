/*
 * 랜덤 식단 룰렛 — 화면(DOM)과 무관한 순수 로직.
 * 브라우저에서는 <script src="roulette.js">로 window.Roulette에 붙고,
 * Node 테스트에서는 require('./roulette.js')로 불러온다.
 * file://로 열어도 동작하도록 ES 모듈이 아닌 일반 스크립트로 둔다.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Roulette = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CATS = ['한식', '중식', '일식', '양식', '분식'];
  const CAT_EMOJI = { 한식: '🍚', 중식: '🥢', 일식: '🍣', 양식: '🍝', 분식: '🍢' };
  const PRESET = [
    ['한식', '김치찌개', '🍲'], ['한식', '된장찌개', '🥘'], ['한식', '제육볶음', '🐷'],
    ['한식', '비빔밥', '🍚'], ['한식', '국밥', '🍲'], ['한식', '냉면', '🍜'],
    ['중식', '짜장면', '🍜'], ['중식', '짬뽕', '🌶️'], ['중식', '탕수육', '🍖'],
    ['중식', '마라탕', '🌶️'], ['중식', '볶음밥', '🍳'], ['중식', '마파두부', '🥢'],
    ['일식', '초밥', '🍣'], ['일식', '돈까스', '🍱'], ['일식', '라멘', '🍜'],
    ['일식', '우동', '🍥'], ['일식', '규동', '🍚'], ['일식', '회덮밥', '🐟'],
    ['양식', '파스타', '🍝'], ['양식', '햄버거', '🍔'], ['양식', '피자', '🍕'],
    ['양식', '샐러드', '🥗'], ['양식', '리조또', '🧀'], ['양식', '샌드위치', '🥪'],
    ['분식', '떡볶이', '🌶️'], ['분식', '김밥', '🍙'], ['분식', '라볶이', '🍜'],
    ['분식', '쫄면', '🥢'], ['분식', '순대', '🌭'], ['분식', '만두', '🥟'],
  ];
  const DRIPS = [
    '오늘의 점심은…!',
    '한 번 더? 그럴 수 있죠',
    '결정장애 의심 단계 🤔',
    '팀장님이 기다리고 계십니다',
    '점심시간 끝나요 ⏰ 그냥 이거 드세요',
  ];
  const DAYS_OPTIONS = [1, 3, 7];
  const DEFAULT_DAYS = 3;
  const WHEEL_SIZE = 8;
  const SPIN_TURNS = 5;
  // 포인터가 칸 경계에 걸리지 않도록 칸 폭의 ±35% 안에서만 흔든다
  const JITTER_RATIO = 0.35;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  // ---------- 상태 ----------
  function defaults() {
    return {
      menus: PRESET.map(([cat, name, emoji], i) => ({ id: 'p' + i, name, cat, emoji, on: true, custom: false })),
      history: [],
      settings: { cats: [...CATS], exclude: true, days: DEFAULT_DAYS },
    };
  }

  // localStorage에서 읽은 값을 검증한다. 깨진 항목만 버리고 나머지는 살린다.
  function normalizeState(raw) {
    const base = defaults();
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.menus) || !Array.isArray(raw.history)) return base;

    const menus = raw.menus.filter((m) => m && typeof m.id === 'string' && typeof m.name === 'string' && CATS.includes(m.cat))
      .map((m) => ({ ...m, on: m.on !== false, custom: m.custom === true, emoji: m.emoji || CAT_EMOJI[m.cat] }));
    const history = raw.history.filter((h) => h && typeof h.name === 'string' && DATE_RE.test(h.date));

    const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const settings = {
      cats: Array.isArray(s.cats) ? CATS.filter((c) => s.cats.includes(c)) : [...CATS],
      exclude: s.exclude !== false,
      days: DAYS_OPTIONS.includes(s.days) ? s.days : DEFAULT_DAYS,
    };
    return { menus, history, settings };
  }

  // ---------- 날짜 (모두 로컬 날짜 'YYYY-MM-DD' 기준) ----------
  function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // a - b 를 달력 날짜 차이로 돌려준다. 24시간 단위로 계산하면 점심시간 전후로 결과가 달라지므로 쓰지 않는다.
  function dayDiff(a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000);
  }

  function isRecent(history, name, today, days) {
    return history.some((h) => h.name === name && dayDiff(today, h.date) <= days);
  }

  function fmtDay(date, today) {
    const [y, m, d] = date.split('-').map(Number);
    const diff = dayDiff(today, date);
    const rel = diff <= 0 ? '오늘' : diff === 1 ? '어제' : `${diff}일 전`;
    return `${m}/${d}(${'일월화수목금토'[new Date(y, m - 1, d).getDay()]}) · ${rel}`;
  }

  // ---------- 후보 ----------
  function buildPool(menus, settings, history, today) {
    return menus.filter((m) => m.on && settings.cats.includes(m.cat)
      && !(settings.exclude && isRecent(history, m.name, today, settings.days)));
  }

  function sample(arr, n, rand = Math.random) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  function isDuplicateName(menus, name) {
    const key = name.trim().toLowerCase();
    return menus.some((m) => m.name.trim().toLowerCase() === key);
  }

  // ---------- 원판 각도 ----------
  // 칸 i는 12시 방향에서 시계방향으로 [i·seg, (i+1)·seg) 를 차지한다.
  // 결과(winner)를 먼저 정하고, 그 칸 중심이 12시 포인터에 오도록 회전량을 계산한다.
  // jitter는 -1~1 사이 값이며 칸 폭의 ±JITTER_RATIO 만큼 멈추는 위치를 흔든다.
  function spinRotation(current, n, winner, jitter = 0, turns = SPIN_TURNS) {
    const seg = 360 / n;
    const target = mod360(360 - (winner + 0.5) * seg + jitter * JITTER_RATIO * seg);
    return current + turns * 360 + mod360(target - mod360(current));
  }

  // CSS rotate(rotation deg) 상태에서 12시 포인터 아래에 있는 칸 번호
  function indexAtPointer(rotation, n) {
    const seg = 360 / n;
    return Math.floor(mod360(360 - mod360(rotation)) / seg) % n;
  }

  function mod360(x) {
    return ((x % 360) + 360) % 360;
  }

  // ---------- 문구 ----------
  function dripMessage(spinCount) {
    return DRIPS[Math.min(Math.max(spinCount, 1), DRIPS.length) - 1];
  }

  function shareText(item) {
    return `오늘 점심은 ${item.emoji} ${item.name}! 룰렛이 정했으니 이의 없기 🎰`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return {
    CATS, CAT_EMOJI, PRESET, DRIPS, DAYS_OPTIONS, WHEEL_SIZE,
    defaults, normalizeState,
    fmtDate, dayDiff, isRecent, fmtDay,
    buildPool, sample, isDuplicateName,
    spinRotation, indexAtPointer,
    dripMessage, shareText, escapeHtml,
  };
});
