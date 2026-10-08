(() => {
  'use strict';

  /* ---------------------------------------------------------------- *
   *  Lưu trữ
   * ---------------------------------------------------------------- */
  const KEY = {
    progress: 'tango.progress.v1',
    settings: 'tango.settings.v1',
    custom: 'tango.customDecks.v1',
    level: 'tango.level',
    session: 'tango.session.v1',
    streak: 'tango.streak.v1',
    hard: 'tango.hard.v1',
    theme: 'tango.theme',
  };
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };

  let progress = load(KEY.progress, {});            // { deckId: { cardKey: 'known' | 'learning' } }
  let settings = { direction: 'jp', shuffle: true, autoSpeak: false, ...load(KEY.settings, {}) };
  let customDecks = load(KEY.custom, []);
  let savedSessions = load(KEY.session, {});      // { cấp: lượt học đang dở }

  /* Cấp độ (N5…N1) — khai báo trong data/levels.js, dữ liệu mỗi cấp chỉ tải khi được chọn */
  const LEVELS = window.TANGO_LEVELS || [];
  const hasData = (lv) => Object.keys(lv.files || {}).length > 0;
  let LV = null;                                   // id cấp đang chọn, ví dụ 'n2'
  const level = () => LEVELS.find((l) => l.id === LV) || {};
  const lvData = () => window.TANGO_DATA?.[LV] || {};
  let streak = load(KEY.streak, { count: 0, last: null });
  let hard = load(KEY.hard, {});                   // { 'deckId|cardKey': thời điểm đánh dấu }

  /* ---------------------------------------------------------------- *
   *  Tiện ích
   * ---------------------------------------------------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const CIRC = 326.73;

  const ICONS = {
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-7.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
    volume: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    flip: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    play: '<path d="M6 3v18l15-9z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  };
  const ico = (name) =>
    `<svg width="1em" height="1em" style="display:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const hydrateIcons = (root = document) =>
    $$('[data-icon]', root).forEach((el) => { el.innerHTML = ico(el.dataset.icon); });

  const ACCENTS = [
    'from-rose-500 to-orange-400 shadow-rose-500/30',
    'from-indigo-500 to-sky-400 shadow-indigo-500/30',
    'from-emerald-500 to-teal-400 shadow-emerald-500/30',
    'from-violet-500 to-fuchsia-400 shadow-violet-500/30',
    'from-amber-500 to-yellow-400 shadow-amber-500/30',
    'from-cyan-500 to-blue-500 shadow-cyan-500/30',
  ];

  /* ---------------------------------------------------------------- *
   *  Dữ liệu & tiến độ
   * ---------------------------------------------------------------- */
  const allDecks = () => [
    ...(lvData().vocab || []).map((d) => ({ ...d, custom: false })),
    // Bộ thẻ tự thêm thuộc về cấp lúc tạo (bộ cũ chưa có cấp coi là N2)
    ...customDecks.filter((d) => (d.level || 'n2') === LV).map((d) => ({ ...d, custom: true })),
  ];
  const findDeck = (id) => allDecks().find((d) => d.id === id);
  // Thẻ có số thứ tự lưu theo số (sửa nghĩa không làm mất tiến độ); thẻ tự thêm lưu theo từ + nghĩa
  const cardKey = (c) => (c.no ? `#${c.no}` : `${c.word}::${c.meaning}`);

  // Chuyển khóa kiểu cũ "từ::nghĩa" sang "#số" cho các bộ thẻ có sẵn của cấp vừa tải
  function migrateCardKeys() {
    let changed = false;
    for (const d of lvData().vocab || []) {
      const bucket = progress[d.id];
      for (const c of d.cards) {
        if (!c.no) continue;
        const oldPrefix = `${c.word}::`;
        if (bucket) {
          const old = Object.keys(bucket).find((k) => k.startsWith(oldPrefix));
          if (old) { bucket[`#${c.no}`] ??= bucket[old]; delete bucket[old]; changed = true; }
        }
        const oldHard = Object.keys(hard).find((k) => k.startsWith(`${d.id}|${oldPrefix}`));
        if (oldHard) { hard[`${d.id}|#${c.no}`] ??= hard[oldHard]; delete hard[oldHard]; changed = true; }
      }
    }
    if (changed) { save(KEY.progress, progress); save(KEY.hard, hard); }
  }
  const statusOf = (deckId, c) => progress[deckId]?.[cardKey(c)];

  /* Từ khó nhớ */
  const HARD_ID = '__hard__';
  const hardKey = (deckId, c) => `${deckId}|${cardKey(c)}`;
  const isHard = (deckId, c) => !!hard[hardKey(deckId, c)];
  function toggleHard(deckId, c, force) {
    const k = hardKey(deckId, c);
    const on = force ?? !hard[k];
    if (on) hard[k] = hard[k] || Date.now();
    else delete hard[k];
    save(KEY.hard, hard);
    return on;
  }
  // Các từ đã đánh dấu, mới nhất trước
  const hardItems = () =>
    allDecks()
      .flatMap((d) => d.cards.filter((c) => isHard(d.id, c)).map((card) => ({ deckId: d.id, deckTitle: d.title, card })))
      .sort((a, b) => hard[hardKey(b.deckId, b.card)] - hard[hardKey(a.deckId, a.card)]);

  function setStatus(deckId, c, status) {
    const bucket = (progress[deckId] ||= {});
    if (status) bucket[cardKey(c)] = status;
    else delete bucket[cardKey(c)];
    save(KEY.progress, progress);
  }

  function deckStats(d) {
    let known = 0, learning = 0;
    for (const c of d.cards) {
      const s = statusOf(d.id, c);
      if (s === 'known') known++;
      else if (s === 'learning') learning++;
    }
    return { total: d.cards.length, known, learning, fresh: d.cards.length - known - learning };
  }

  const itemsOf = (d, filter) =>
    d.cards
      .filter((c) => !filter || filter(statusOf(d.id, c)))
      .map((card) => ({ deckId: d.id, deckTitle: d.title, card }));

  function smartItems(limit = 20) {
    const decks = allDecks();
    const learning = shuffle(decks.flatMap((d) => itemsOf(d, (s) => s === 'learning')));
    const fresh = shuffle(decks.flatMap((d) => itemsOf(d, (s) => !s)));
    return [...learning, ...fresh].slice(0, limit);
  }

  function bumpStreak() {
    const today = dayKey();
    if (streak.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    streak = { count: streak.last === dayKey(y) ? streak.count + 1 : 1, last: today };
    save(KEY.streak, streak);
  }
  function currentStreak() {
    const y = new Date(); y.setDate(y.getDate() - 1);
    return streak.last === dayKey() || streak.last === dayKey(y) ? streak.count : 0;
  }

  /* ---------------------------------------------------------------- *
   *  Phát âm
   * ---------------------------------------------------------------- */
  let jaVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    jaVoice =
      vs.find((v) => /^ja/i.test(v.lang) && /Google|Natural|Online|Kyoko|Nanami/i.test(v.name)) ||
      vs.find((v) => /^ja/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text, quiet = false) {
    if (!text) return;
    if (!('speechSynthesis' in window)) { if (!quiet) toast('Trình duyệt không hỗ trợ phát âm'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
  // Ưu tiên đọc bằng kana (chính xác hơn), lấy cách đọc đầu tiên nếu có nhiều
  const spokenText = (c) =>
    (c.kana || c.word).split(/[\/／・,、]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜~～…．.]/g, '').trim() || c.word;

  /* ---------------------------------------------------------------- *
   *  Toast & xác nhận
   * ---------------------------------------------------------------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    $('#toastText').textContent = msg;
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(12px)'; }, 2200);
  }

  let confirmCb = null;
  function confirmDialog(title, text, okLabel, cb) {
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;
    $('#confirmOk').textContent = okLabel;
    confirmCb = cb;
    $('#dlgConfirm').showModal();
  }
  $('#confirmOk').addEventListener('click', () => { $('#dlgConfirm').close(); confirmCb?.(); confirmCb = null; });

  /* ---------------------------------------------------------------- *
   *  Điều hướng
   * ---------------------------------------------------------------- */
  let view = 'home';
  function show(name) {
    view = name;
    for (const [n, el] of [['home', '#viewHome'], ['study', '#viewStudy'], ['done', '#viewDone'], ['grammar', '#viewGrammar']]) {
      const node = $(el);
      node.hidden = n !== name;
      if (n === name) { node.classList.remove('view-enter'); void node.offsetWidth; node.classList.add('view-enter'); }
    }
    $$('[data-section]').forEach((b) => {
      if (b.dataset.section === (name === 'grammar' ? 'grammar' : 'vocab')) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (LV) {
      const sec = name === 'grammar' ? 'grammar' : name === 'study' ? 'study' : 'vocab';
      const hash = `#/${LV}/${sec}`;
      if (location.hash !== hash) history.replaceState(null, '', location.href.split('#')[0] + hash);
    }
    if (name !== 'study' && 'speechSynthesis' in window) speechSynthesis.cancel();
    if (name === 'home') renderHome();
    if (name === 'grammar') renderGrammar();
    window.scrollTo({ top: 0 });
  }

  /* ---------------------------------------------------------------- *
   *  Trang chủ
   * ---------------------------------------------------------------- */
  function renderHome() {
    const decks = allDecks();
    let total = 0, known = 0, learning = 0;
    for (const d of decks) { const s = deckStats(d); total += s.total; known += s.known; learning += s.learning; }
    const pct = total ? Math.round((known / total) * 100) : 0;

    $('#stTotal').textContent = total;
    $('#stKnown').textContent = known;
    $('#stLearning').textContent = learning;
    $('#stStreak').textContent = `${currentStreak()} ngày`;
    $('#pctHome').textContent = `${pct}%`;
    requestAnimationFrame(() => { $('#ringHome').style.strokeDashoffset = CIRC * (1 - pct / 100); });

    const smart = Math.min(20, total - known);
    $('#smartCount').textContent = smart > 0 ? smart : '✓';
    $('#deckCount').textContent = `${decks.length} bộ thẻ · ${total} từ vựng`;

    const h = new Date().getHours();
    $('#greeting').textContent = h < 11 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    $$('[data-dir]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dir === settings.direction)));
    $('#tglShuffle').setAttribute('aria-pressed', String(settings.shuffle));
    $('#tglSpeak').setAttribute('aria-pressed', String(settings.autoSpeak));

    const grid = $('#deckGrid');
    if (!decks.length) {
      grid.innerHTML = `
        <div class="glass col-span-full rounded-3xl p-10 text-center">
          <p class="font-jp text-4xl">空っぽ</p>
          <p class="mt-3 text-sm text-stone-500">Chưa có bộ thẻ nào. Bấm <b>Thêm bộ thẻ</b> để bắt đầu.</p>
        </div>`;
      return;
    }

    renderResumeBar();
    const sv = savedSession();
    const svDeck = sv && (sv.source?.kind === 'deck' || sv.source?.kind === 'review') ? sv.source.id : null;
    grid.innerHTML = hardDeckHTML(sv?.source?.kind === 'hard' ? sv : null) + decks.map((d, i) => {
      const resume = svDeck === d.id ? sv : null;
      const s = deckStats(d);
      const pctD = s.total ? Math.round((s.known / s.total) * 100) : 0;
      const wK = s.total ? (s.known / s.total) * 100 : 0;
      const wL = s.total ? (s.learning / s.total) * 100 : 0;
      const review = s.total - s.known;
      const icon = d.icon || [...(d.cards[0]?.word || d.title)][0];
      return `
        <article class="group relative flex flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-900/[0.06] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]">
          <span aria-hidden="true" class="pointer-events-none absolute -bottom-6 -right-2 select-none font-jp text-[7rem] font-black leading-none text-stone-900/[0.035] transition duration-500 group-hover:scale-110 dark:text-white/[0.04]">${esc(icon)}</span>
          <div class="flex items-start justify-between">
            <div class="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${ACCENTS[i % ACCENTS.length]} font-jp text-xl font-bold text-white shadow-lg">${esc(icon)}</div>
            <div class="flex gap-1 opacity-70 transition group-hover:opacity-100">
              <button data-act="list" data-id="${esc(d.id)}" title="Xem danh sách từ" class="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-900/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white">${ico('list')}</button>
              <button data-act="reset" data-id="${esc(d.id)}" title="Đặt lại tiến độ" class="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-900/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white">${ico('undo')}</button>
              ${d.custom ? `<button data-act="delete" data-id="${esc(d.id)}" title="Xóa bộ thẻ" class="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-stone-400">${ico('trash')}</button>` : ''}
            </div>
          </div>
          <h3 class="mt-4 text-lg font-bold tracking-tight">${esc(d.title)}</h3>
          <p class="font-jpsans text-sm text-stone-500 dark:text-stone-400">${esc(d.subtitle || '')}${d.subtitle ? ' · ' : ''}${s.total} thẻ</p>

          <div class="mt-5 flex items-center justify-between text-xs">
            <span class="text-stone-500 dark:text-stone-400">${s.known}/${s.total} đã thuộc${s.learning ? ` · <span class="text-amber-600 dark:text-amber-400">${s.learning} đang học</span>` : ''}</span>
            <span class="font-semibold tabular-nums">${pctD}%</span>
          </div>
          <div class="mt-2 flex h-1.5 overflow-hidden rounded-full bg-stone-200/80 dark:bg-white/10">
            <div class="h-full bg-emerald-500 transition-all duration-700" style="width:${wK}%"></div>
            <div class="h-full bg-amber-400 transition-all duration-700" style="width:${wL}%"></div>
          </div>

          <div class="relative mt-5 flex gap-2">
            ${resume ? `
            <button data-act="resume" data-id="${esc(d.id)}" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-500/20 transition hover:brightness-105 active:scale-[.98]">
              <span class="inline-flex text-xs">${ico('play')}</span>Tiếp tục ${resume.i + 1}/${resume.items.length}
            </button>
            <button data-act="${resume.source.kind === 'review' ? 'review' : 'study'}" data-id="${esc(d.id)}" title="Bắt đầu lại lượt học từ thẻ đầu tiên" class="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white/70 px-3.5 text-sm font-semibold text-stone-700 transition hover:bg-white active:scale-[.98] dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10">
              Từ đầu
            </button>` : `
            <button data-act="study" data-id="${esc(d.id)}" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 active:scale-[.98] dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100">
              <span class="inline-flex text-xs">${ico('play')}</span>Học ${s.total} thẻ
            </button>`}
            ${!resume && review > 0 && review < s.total ? `
            <button data-act="review" data-id="${esc(d.id)}" class="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white/70 px-3.5 text-sm font-semibold text-stone-700 transition hover:bg-white active:scale-[.98] dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10">
              Ôn ${review}
            </button>` : ''}
          </div>
        </article>`;
    }).join('');
  }

  function renderResumeBar() {
    const bar = $('#resumeBar');
    const sv = savedSession();
    if (!sv) { bar.hidden = true; bar.innerHTML = ''; return; }
    const pct = Math.round((sv.i / sv.items.length) * 100);
    bar.hidden = false;
    bar.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl border border-rose-200/80 bg-gradient-to-r from-rose-50 to-orange-50 px-5 py-4 dark:border-rose-400/20 dark:from-rose-500/10 dark:to-orange-500/10">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-md shadow-rose-500/25">${ico('play')}</span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-widest text-rose-600/80 dark:text-rose-300/80">Đang học dở</p>
          <p class="truncate font-semibold">${esc(sv.title)} <span class="font-normal text-stone-500 dark:text-stone-400">· thẻ ${sv.i + 1}/${sv.items.length} · ${sv.known} đã nhớ, ${sv.learning} chưa nhớ</span></p>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-rose-200/60 dark:bg-white/10"><div class="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400" style="width:${pct}%"></div></div>
        </div>
        <div class="flex shrink-0 gap-2">
          <button data-resume class="btn-primary py-2.5">Tiếp tục</button>
          <button data-resume-drop class="btn-ghost px-4 py-2.5" title="Bỏ lượt học này (tiến độ từng thẻ vẫn giữ)">Bỏ</button>
        </div>
      </div>`;
  }
  $('#resumeBar').addEventListener('click', (e) => {
    if (e.target.closest('[data-resume]')) resumeSession();
    else if (e.target.closest('[data-resume-drop]')) { clearSavedSession(); renderHome(); toast('Đã bỏ lượt học dở'); }
  });

  // Bộ thẻ đặc biệt "Từ khó nhớ" — luôn đứng đầu danh sách
  function hardDeckHTML(resume = null) {
    const items = hardItems();
    const n = items.length;
    const preview = items.slice(0, 6).map((it) =>
      `<span class="rounded-lg bg-white/80 px-2 py-0.5 font-jp text-sm font-bold text-amber-700 shadow-sm dark:bg-white/10 dark:text-amber-200">${esc(it.card.word)}</span>`).join('');
    return `
      <article class="group relative flex flex-col overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50/80 to-rose-50/70 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 dark:border-amber-400/20 dark:from-amber-500/[0.12] dark:via-orange-500/[0.06] dark:to-rose-500/[0.06]">
        <span aria-hidden="true" class="pointer-events-none absolute -bottom-6 -right-2 select-none font-jp text-[7rem] font-black leading-none text-amber-900/[0.05] transition duration-500 group-hover:scale-110 dark:text-amber-200/[0.06]">難</span>
        <div class="flex items-start justify-between">
          <div class="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl text-white shadow-lg shadow-amber-500/30 [&_svg]:fill-current">${ico('star')}</div>
          ${n ? `<div class="flex gap-1 opacity-70 transition group-hover:opacity-100">
            <button data-act="list" data-id="${HARD_ID}" title="Xem danh sách từ khó" class="grid h-8 w-8 place-items-center rounded-lg text-amber-700/70 hover:bg-amber-900/5 hover:text-amber-900 dark:text-amber-200/70 dark:hover:bg-white/10 dark:hover:text-white">${ico('list')}</button>
            <button data-act="clear-hard" data-id="${HARD_ID}" title="Xóa toàn bộ danh sách" class="grid h-8 w-8 place-items-center rounded-lg text-amber-700/70 hover:bg-rose-500/10 hover:text-rose-600 dark:text-amber-200/70">${ico('trash')}</button>
          </div>` : ''}
        </div>
        <h3 class="mt-4 text-lg font-bold tracking-tight">Từ khó nhớ</h3>
        <p class="text-sm text-amber-800/70 dark:text-amber-200/60"><span class="font-jpsans">むずかしい</span> · ${n} từ đã đánh dấu</p>
        ${n ? `<div class="relative mt-4 flex flex-wrap gap-1.5">${preview}${n > 6 ? `<span class="px-1 py-0.5 text-sm text-amber-700/70 dark:text-amber-200/60">+${n - 6}</span>` : ''}</div>`
            : `<p class="relative mt-4 text-sm leading-relaxed text-amber-900/70 dark:text-amber-100/60">Khi học, bấm <span class="inline-flex translate-y-0.5 text-amber-500 [&_svg]:fill-current">${ico('star')}</span> trên thẻ (hoặc phím <kbd>H</kbd>) để gom những từ khó vào đây.</p>`}
        <div class="relative mt-auto flex gap-2 pt-5">
          ${resume ? `<button data-act="resume" data-id="${HARD_ID}" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-500/20 transition hover:brightness-105 active:scale-[.98]"><span class="inline-flex text-xs">${ico('play')}</span>Tiếp tục ${resume.i + 1}/${resume.items.length}</button>` : ''}
          <button data-act="study" data-id="${HARD_ID}" ${n ? '' : 'disabled'} ${resume ? 'hidden' : ''} class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition hover:brightness-105 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
            <span class="inline-flex text-xs">${ico('play')}</span>${n ? `Học ${n} từ khó` : 'Chưa có từ nào'}
          </button>
        </div>
      </article>`;
  }

  $('#deckGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.id === HARD_ID) {
      if (btn.dataset.act === 'study') startSession({ title: 'Từ khó nhớ', sub: 'Những từ bạn đã đánh dấu', items: hardItems(), source: { kind: 'hard' } });
      else if (btn.dataset.act === 'resume') resumeSession();
      else if (btn.dataset.act === 'list') openHardList();
      else if (btn.dataset.act === 'clear-hard')
        confirmDialog('Xóa danh sách từ khó?', 'Tất cả từ đã đánh dấu sẽ được bỏ khỏi danh sách (tiến độ học vẫn giữ nguyên).', 'Xóa hết', () => {
          hard = {}; save(KEY.hard, hard); renderHome(); toast('Đã xóa danh sách từ khó');
        });
      return;
    }
    const d = findDeck(btn.dataset.id);
    if (!d) return;
    switch (btn.dataset.act) {
      case 'study':
        startSession({ title: d.title, sub: `${d.subtitle || ''} · toàn bộ`, items: itemsOf(d), source: { kind: 'deck', id: d.id } });
        break;
      case 'review':
        startSession({ title: d.title, sub: `${d.subtitle || ''} · ôn thẻ chưa thuộc`, items: itemsOf(d, (s) => s !== 'known'), source: { kind: 'review', id: d.id } });
        break;
      case 'resume':
        resumeSession();
        break;
      case 'list':
        openList(d);
        break;
      case 'reset':
        confirmDialog('Đặt lại tiến độ?', `Toàn bộ trạng thái "đã nhớ / chưa nhớ" của bộ "${d.title}" sẽ bị xóa.`, 'Đặt lại', () => {
          delete progress[d.id]; save(KEY.progress, progress); renderHome(); toast('Đã đặt lại tiến độ');
        });
        break;
      case 'delete':
        confirmDialog('Xóa bộ thẻ?', `Bộ "${d.title}" và tiến độ của nó sẽ bị xóa vĩnh viễn.`, 'Xóa', () => {
          customDecks = customDecks.filter((x) => x.id !== d.id); save(KEY.custom, customDecks);
          delete progress[d.id]; save(KEY.progress, progress);
          renderHome(); toast('Đã xóa bộ thẻ');
        });
        break;
    }
  });

  $('#btnSmart').addEventListener('click', () => {
    let items = smartItems();
    if (!items.length) {
      items = shuffle(allDecks().flatMap((d) => itemsOf(d))).slice(0, 20);
      if (items.length) toast('Bạn đã thuộc hết! Ôn ngẫu nhiên 20 thẻ nhé 🎉');
    }
    startSession({ title: 'Ôn tập thông minh', sub: 'Ưu tiên thẻ chưa nhớ từ mọi bộ', items, shuffle: false, source: { kind: 'smart' } });
  });

  $$('[data-dir]').forEach((b) => b.addEventListener('click', () => {
    settings.direction = b.dataset.dir; save(KEY.settings, settings); renderHome();
  }));
  $('#tglShuffle').addEventListener('click', () => {
    settings.shuffle = !settings.shuffle; save(KEY.settings, settings); renderHome();
  });
  $('#tglSpeak').addEventListener('click', () => {
    settings.autoSpeak = !settings.autoSpeak; save(KEY.settings, settings); renderHome();
    if (settings.autoSpeak) speak('はい', true);
  });

  /* ---------------------------------------------------------------- *
   *  Phiên học
   * ---------------------------------------------------------------- */
  let session = null;
  const wrap = $('#cardWrap');
  const cardEl = $('#card');

  // source: { kind: 'deck' | 'review' | 'hard' | 'smart' | 'other', id? } — để biết lượt học thuộc bộ thẻ nào
  function startSession({ title, sub, items, shuffle: doShuffle = settings.shuffle, source = { kind: 'other' } }) {
    if (!items.length) { toast('Không có thẻ nào để học'); return; }
    const list = doShuffle ? shuffle([...items]) : [...items];
    session = { title, sub, source, items: list, i: 0, known: 0, learning: 0, history: [], flipped: false, busy: false, hint: 0, hintsUsed: 0 };
    saveSession();
    openStudy();
  }

  function openStudy() {
    $('#studyTitle').textContent = session.title;
    $('#studySub').textContent = session.sub.replace(/^ · /, '');
    show('study');
    bumpStreak();
    renderCard(true);
    wrap.focus({ preventScroll: true });
  }

  /* Lưu lượt học đang dở để tải lại trang / quay lại sau vẫn học tiếp được */
  const itemKey = (it) => `${it.deckId}|${cardKey(it.card)}`;
  function saveSession() {
    if (!session || !LV) return;
    savedSessions[LV] = {
      title: session.title, sub: session.sub, source: session.source,
      keys: session.items.map(itemKey), i: session.i, known: session.known, learning: session.learning,
      history: session.history, hintsUsed: session.hintsUsed, ts: Date.now(),
    };
    save(KEY.session, savedSessions);
  }
  function clearSavedSession() {
    if (!LV || !savedSessions[LV]) return;
    delete savedSessions[LV];
    save(KEY.session, savedSessions);
  }
  // Dựng lại lượt học đã lưu từ dữ liệu hiện tại (bỏ qua thẻ không còn tồn tại)
  function savedSession() {
    const sv = LV && savedSessions[LV];
    if (!sv) return null;
    const byKey = new Map(allDecks().flatMap((d) => d.cards.map((card) => {
      const it = { deckId: d.id, deckTitle: d.title, card };
      return [itemKey(it), it];
    })));
    const items = sv.keys.map((k) => byKey.get(k));
    if (items.some((it) => !it) || sv.i >= items.length) return null;
    return { ...sv, items };
  }
  function resumeSession() {
    const sv = savedSession();
    if (!sv) { clearSavedSession(); renderHome(); toast('Không khôi phục được lượt học'); return false; }
    session = { ...sv, flipped: false, busy: false, hint: 0 };
    delete session.keys;
    openStudy();
    return true;
  }

  const sizeFor = (s) => {
    const n = [...(s || '')].length;
    if (n <= 2) return 'text-8xl sm:text-9xl';
    if (n <= 4) return 'text-7xl sm:text-8xl';
    if (n <= 6) return 'text-6xl sm:text-7xl';
    if (n <= 9) return 'text-4xl sm:text-6xl';
    return 'text-3xl sm:text-5xl';
  };
  const sizeForVi = (s) => ((s || '').length <= 14 ? 'text-4xl sm:text-5xl' : (s || '').length <= 32 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl');

  const faceTop = (item, label) => `
    <div class="flex items-center justify-between gap-3">
      <span class="truncate rounded-full bg-stone-900/5 px-2.5 py-1 text-[0.6875rem] font-medium text-stone-500 dark:bg-white/10 dark:text-stone-400">${esc(item.deckTitle)}${item.card.no ? ` · #${item.card.no}` : ''}</span>
      <div class="flex items-center gap-1">
        <span class="mr-1 text-[0.6875rem] font-medium uppercase tracking-widest text-stone-400">${label}</span>
        <button data-hard aria-pressed="${isHard(item.deckId, item.card)}" class="grid h-9 w-9 place-items-center rounded-full text-lg text-stone-400 transition hover:bg-amber-50 hover:text-amber-500 active:scale-90 aria-pressed:text-amber-400 dark:hover:bg-amber-500/10 [&[aria-pressed=true]_svg]:fill-current" title="Đánh dấu từ khó nhớ (H)">${ico('star')}</button>
        <button data-speakclass="grid h-9 w-9 place-items-center rounded-full text-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10" title="Phát âm">${ico('volume')}</button>
      </div>
    </div>`;

  function frontHTML(item) {
    const c = item.card;
    const vi = settings.direction === 'vi';
    const big = vi ? sizeForVi(c.meaning) : sizeFor(c.word);
    const small = vi ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl';
    const total = hintsFor(c).length;
    return `
      <div class="seal flex h-full flex-col p-6 sm:p-8">
        ${faceTop(item, vi ? 'Nghĩa' : '単語')}
        <div class="scroll-fade no-scrollbar -mx-2 mt-2 flex-1 overflow-y-auto px-2">
          <div class="flex min-h-full flex-col items-center justify-center py-2 text-center">
            <p data-headword data-big="${big}" data-small="${small}" class="${vi ? '' : 'font-jp'} ${big} font-bold leading-tight tracking-tight transition-all duration-300">${esc(vi ? c.meaning : c.word)}</p>
            ${vi ? '<p data-question class="mt-5 text-sm text-stone-400">Tiếng Nhật là gì?</p>' : ''}
            <ol data-hintbox class="mt-5 hidden w-full space-y-2 text-left"></ol>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3">
          <p class="text-xs text-stone-400">${vi ? 'Chạm để xem đáp án' : 'Chạm để lật thẻ'}</p>
          ${total ? `
          <button data-hint class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-95 disabled:cursor-default disabled:opacity-50 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20" title="Gợi ý (G)">
            <span class="text-sm">${ico('bulb')}</span><span data-hint-label>Gợi ý · 0/${total}</span>
          </button>` : ''}
        </div>
      </div>`;
  }

  /* Gợi ý từng bước, tạo từ dữ liệu sẵn có của thẻ */
  // Gợi ý nghĩa: hiện từ đầu tiên ("Quả …"); nghĩa chỉ có 1 từ thì hiện chữ cái đầu ("N__")
  const WORD = /[\p{L}\p{N}]+/gu;
  function meaningHint(s) {
    // Bỏ qua phần ghi chú trong ngoặc, ví dụ '(Khoảng cách) được rút ngắn'
    const words = String(s || '').replace(/[（(][^）)]*[）)]/g, ' ').match(WORD) || [];
    if (!words.length) return { label: 'Gợi ý nghĩa', html: '' };
    if (words.length === 1) {
      const w = [...words[0]];
      return {
        label: 'Chữ cái đầu của nghĩa',
        html: `${esc(w[0])}<span class="tracking-[0.2em] text-stone-300 dark:text-stone-600">${'_'.repeat(Math.max(1, w.length - 1))}</span>`,
      };
    }
    return { label: 'Từ đầu tiên của nghĩa', html: `${esc(words[0])} <span class="text-stone-300 dark:text-stone-600">…</span>` };
  }
  const blankTarget = (jp) =>
    esc(jp).replace(/\*\*(.+?)\*\*/g, (_, w) => `<span class="mx-0.5 inline-block rounded bg-amber-100 px-1 tracking-widest text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">${'＿'.repeat(Math.min([...w].length, 6))}</span>`);

  // Tách kana thành âm (mora): ゃゅょ… đi kèm chữ trước, っ và ー là một âm riêng
  const morae = (kana) => kana.match(/.[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]?/gu) || [];
  // Chỉ hiện khoảng nửa đầu cách đọc: しゅっきん -> しゅっ＿＿
  function partialReading(kana) {
    const m = morae(kana.split(/[・\/／]/)[0].replace(/[（(].*?[）)]/g, '').trim());
    const shown = Math.max(1, Math.floor(m.length / 2));
    return `<span class="font-jpsans text-base text-rose-500 dark:text-rose-400">${esc(m.slice(0, shown).join(''))}</span>`
      + `<span class="font-jpsans tracking-[0.3em] text-stone-300 dark:text-stone-600">${'＿'.repeat(m.length - shown)}</span>`
      + ` <span class="text-xs text-stone-400">(${m.length} âm)</span>`;
  }

  function hintsFor(c) {
    const ex = examplesOf(c)[0];
    const reading = c.kana || c.word;
    const hasKanji = c.kana && c.kana !== c.word;
    const H = [];
    if (settings.direction === 'vi') {
      if (c.hanviet) H.push({ label: 'Âm Hán Việt', html: `<span class="font-semibold tracking-[0.15em] text-indigo-600 dark:text-indigo-300">${esc(c.hanviet)}</span>` });
      const chars = [...reading.replace(/[（(].*?[）)]/g, '')];
      H.push({ label: 'Chữ đầu', html: `<span class="font-jpsans text-base">${esc(chars[0])}<span class="tracking-[0.3em] text-stone-300 dark:text-stone-600">${'＿'.repeat(Math.max(0, chars.length - 1))}</span></span> <span class="text-xs text-stone-400">(${chars.length} ký tự)</span>` });
      if (ex) H.push({ label: 'Điền vào chỗ trống', html: `<span class="font-jpsans">${blankTarget(ex.jp)}</span><span class="mt-0.5 block text-xs text-stone-400">${esc(ex.vi)}</span>` });
      if (hasKanji) H.push({ label: 'Chữ Hán', html: `<span class="font-jp text-2xl font-bold">${esc(c.word)}</span>` });
      if (c.kanjiAlt) H.push({ label: 'Chữ Hán', html: `<span class="font-jp text-2xl font-bold">${esc(c.kanjiAlt)}</span>` });
    } else {
      if (hasKanji) H.push({ label: 'Cách đọc (phần đầu)', html: partialReading(c.kana) });
      if (c.hanviet) H.push({ label: 'Âm Hán Việt', html: `<span class="font-semibold tracking-[0.15em] text-indigo-600 dark:text-indigo-300">${esc(c.hanviet)}</span>` });
      if (ex) H.push({ label: 'Ngữ cảnh', html: `<span class="font-jpsans">${markTarget(ex.jp)}</span>` });
      if (c.kanjiAlt) H.push({ label: 'Chữ Hán', html: `<span class="font-jp text-2xl font-bold">${esc(c.kanjiAlt)}</span>` });
      const mh = meaningHint(c.meaning);
      if (mh.html) H.push({ label: mh.label, html: `<span class="font-medium">${mh.html}</span>` });
    }
    return H;
  }

  function showNextHint() {
    if (!session || session.busy || session.flipped) return;
    const hints = hintsFor(session.items[session.i].card);
    if (session.hint >= hints.length) return;
    const h = hints[session.hint++];
    const box = $('[data-hintbox]', wrap);
    box.classList.remove('hidden');
    box.insertAdjacentHTML('beforeend', `
      <li class="view-enter flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3.5 py-2.5 dark:border-amber-400/15 dark:bg-amber-500/[0.07]">
        <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400 text-[0.625rem] font-bold text-white">${session.hint}</span>
        <div class="min-w-0 flex-1">
          <p class="text-[0.625rem] font-semibold uppercase tracking-widest text-amber-700/70 dark:text-amber-300/70">${h.label}</p>
          <div class="mt-0.5 text-sm leading-relaxed">${h.html}</div>
        </div>
      </li>`);
    // Thu nhỏ từ chính để nhường chỗ cho gợi ý
    const head = $('[data-headword]', wrap);
    head.classList.remove(...head.dataset.big.split(' '));
    head.classList.add(...head.dataset.small.split(' '));
    $('[data-question]', wrap)?.classList.add('hidden');
    const btn = $('[data-hint]', wrap);
    $('[data-hint-label]', btn).textContent = session.hint >= hints.length ? 'Hết gợi ý' : `Gợi ý · ${session.hint}/${hints.length}`;
    btn.disabled = session.hint >= hints.length;
    box.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    session.hintsUsed++;
    saveSession();
  }

  function backHTML(item) {
    const c = item.card;
    const showKana = c.kana && c.kana !== c.word;
    const exs = examplesOf(c);
    const n = [...c.word].length;
    const wordSize = exs.length
      ? (n <= 4 ? 'text-4xl sm:text-5xl' : n <= 8 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl')
      : (n <= 4 ? 'text-5xl sm:text-6xl' : n <= 8 ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl');
    return `
      <div class="flex h-full flex-col bg-gradient-to-b from-rose-50/60 to-transparent p-6 sm:p-8 dark:from-rose-500/[0.06]">
        ${faceTop(item, '答え')}
        <div class="scroll-fade no-scrollbar -mx-2 mt-2 flex-1 overflow-y-auto px-2">
          <div class="flex min-h-full flex-col items-center justify-center py-3 text-center">
            ${showKana ? `<p class="font-jpsans text-lg font-medium tracking-wider text-rose-500 dark:text-rose-400">${esc(c.kana)}</p>` : ''}
            <p class="font-jp ${wordSize} font-bold leading-tight">${esc(c.word)}</p>
            ${c.romaji ? `<p class="mt-1.5 text-sm italic text-stone-400">${esc(c.romaji)}</p>` : ''}
            ${c.kanjiAlt ? `<p class="mt-2 inline-flex items-baseline gap-2 text-sm text-stone-500 dark:text-stone-400"><span class="text-[0.6875rem] font-semibold uppercase tracking-widest">Chữ Hán</span><span class="font-jp text-xl font-bold text-stone-700 dark:text-stone-200">${esc(c.kanjiAlt)}</span><span class="text-xs">(thường viết bằng kana)</span></p>` : ''}
            ${c.hanviet ? `<p class="mt-3 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-[0.15em] text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">${esc(c.hanviet)}</p>` : ''}
            <div class="${exs.length ? 'my-4' : 'my-5'} h-px w-20 shrink-0 bg-gradient-to-r from-transparent via-stone-300 to-transparent dark:via-white/20"></div>
            <p class="${exs.length ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold leading-snug tracking-tight">${esc(c.meaning)}</p>
            ${synonymsHTML(c, 'mt-4')}
            ${exs.length ? `
              <ul class="mt-5 w-full divide-y divide-stone-200/70 rounded-2xl border border-stone-200/70 bg-white/70 text-left dark:divide-white/5 dark:border-white/10 dark:bg-white/5">
                ${exs.map((ex, i) => `
                  <li class="flex items-start gap-3 px-4 py-3">
                    <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-900/5 text-[0.625rem] font-bold text-stone-400 dark:bg-white/10">${i + 1}</span>
                    <div class="min-w-0 flex-1">
                      <p class="font-jpsans text-[0.9375rem] leading-relaxed">${markTarget(ex.jp)}</p>
                      ${ex.vi ? `<p class="mt-0.5 text-[0.8125rem] leading-snug text-stone-500 dark:text-stone-400">${esc(ex.vi)}</p>` : ''}
                    </div>
                    <button data-speak-example="${i}" class="mt-0.5 shrink-0 text-stone-400 transition hover:text-rose-500" title="Đọc câu ví dụ">${ico('volume')}</button>
                  </li>`).join('')}
              </ul>` : ''}
          </div>
        </div>
      </div>`;
  }

  // Câu ví dụ: `examples` [{jp, vi}], kiểu cũ `example`/`exampleMeaning`, hoặc tra từ examples.js theo số thứ tự
  function examplesOf(c) {
    if (Array.isArray(c.examples)) return c.examples;
    if (c.example) return [{ jp: c.example, vi: c.exampleMeaning || '' }];
    return (c.no && lvData().examples?.[c.no]) || [];
  }

  // Từ đồng nghĩa: [{ w, r, m, no? }] — `no` có khi từ đó cũng nằm trong bộ thẻ
  const synonymsOf = (c) => c.synonyms || (c.no && lvData().synonyms?.[c.no]) || [];
  function synonymsHTML(c, cls = '') {
    const syns = synonymsOf(c);
    if (!syns.length) return '';
    return `
      <div class="${cls} w-full text-left">
        <p class="mb-2 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-stone-400">
          <span class="text-emerald-500">≈</span>Từ đồng nghĩa</p>
        <div class="flex flex-wrap gap-2">${syns.map((s) => `
          <button data-syn="${esc(s.r || s.w)}" title="Nghe phát âm" class="group/syn inline-flex max-w-full items-baseline gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-[.98] dark:border-emerald-400/15 dark:bg-emerald-500/[0.07] dark:hover:bg-emerald-500/15">
            <span class="font-jp text-[0.9375rem] font-bold text-emerald-800 dark:text-emerald-200">${esc(s.w)}</span>
            ${s.r ? `<span class="font-jpsans text-[0.6875rem] text-emerald-600/80 dark:text-emerald-300/70">${esc(s.r)}</span>` : ''}
            <span class="min-w-0 text-[0.75rem] text-stone-600 dark:text-stone-300">${esc(s.m)}</span>
            ${s.no ? `<span class="rounded-md bg-emerald-600/10 px-1 text-[0.625rem] font-semibold text-emerald-700 dark:text-emerald-300" title="Có trong bộ thẻ">#${s.no}</span>` : ''}
          </button>`).join('')}
        </div>
      </div>`;
  }
  // Bấm vào một từ đồng nghĩa (ở thẻ học hoặc ô tìm kiếm) để nghe
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-syn]');
    if (b) { e.stopPropagation(); speak(b.dataset.syn); }
  }, true);
  // **từ** -> tô màu từ đang học
  const markTarget = (jp) =>
    esc(jp).replace(/\*\*(.+?)\*\*/g, '<b class="font-bold text-rose-500 dark:text-rose-400">$1</b>');
  const plain = (jp) => String(jp || '').replace(/\*\*/g, '');

  function updateStudyHeader() {
    const total = session.items.length;
    $('#studyCounter').textContent = `${Math.min(session.i + 1, total)} / ${total}`;
    $('#studyBar').style.width = `${(session.i / total) * 100}%`;
    $('#cntKnown').textContent = session.known;
    $('#cntLearning').textContent = session.learning;
    const left = total - session.i;
    $('#stack1').style.opacity = left > 1 ? '1' : '0';
    $('#stack2').style.opacity = left > 2 ? '1' : '0';
    $('#btnUndo').disabled = !session.history.length;
    $('#btnUndo').classList.toggle('opacity-40', !session.history.length);
  }

  function renderCard(enter = false) {
    const item = session.items[session.i];
    session.flipped = false;
    session.hint = 0;
    cardEl.classList.add('no-anim');
    cardEl.classList.remove('is-flipped');
    $('#faceFront').innerHTML = frontHTML(item);
    $('#faceBack').innerHTML = backHTML(item);
    void cardEl.offsetWidth;
    cardEl.classList.remove('no-anim');
    updateStudyHeader();

    if (enter) {
      wrap.style.transition = 'none';
      wrap.style.opacity = '0';
      wrap.style.transform = 'translateY(18px) scale(.96)';
      void wrap.offsetWidth;
      wrap.style.transition = 'transform .45s cubic-bezier(.2,.85,.25,1), opacity .35s ease';
      wrap.style.opacity = '1';
      wrap.style.transform = '';
    }
    if (settings.autoSpeak && settings.direction === 'jp') speak(spokenText(item.card), true);
  }

  function flip() {
    if (!session || session.busy) return;
    session.flipped = !session.flipped;
    cardEl.classList.toggle('is-flipped', session.flipped);
    if (session.flipped && settings.autoSpeak && settings.direction === 'vi') speak(spokenText(session.items[session.i].card), true);
  }

  function mark(status) {
    if (!session || session.busy) return;
    session.busy = true;
    const item = session.items[session.i];
    session.history.push({ i: session.i, prev: statusOf(item.deckId, item.card), status });
    setStatus(item.deckId, item.card, status);
    session[status]++;

    const dir = status === 'known' ? 1 : -1;
    $(status === 'known' ? '#stampYes' : '#stampNo').style.opacity = '1';
    wrap.style.transition = 'transform .4s cubic-bezier(.4,0,.6,1), opacity .4s ease';
    wrap.style.transform = `translateX(${dir * 120}%) rotate(${dir * 16}deg)`;
    wrap.style.opacity = '0';

    setTimeout(() => {
      resetStamps();
      session.i++;
      session.busy = false;
      if (session.i >= session.items.length) { clearSavedSession(); finish(); }
      else { saveSession(); renderCard(true); }
    }, 360);
  }

  function undo() {
    if (!session || session.busy) return;
    const h = session.history.pop();
    if (!h) { toast('Đây là thẻ đầu tiên'); return; }
    const item = session.items[h.i];
    setStatus(item.deckId, item.card, h.prev);
    session[h.status]--;
    session.i = h.i;
    saveSession();
    renderCard(true);
  }

  function toggleDirection() {
    settings.direction = settings.direction === 'jp' ? 'vi' : 'jp';
    save(KEY.settings, settings);
    if (session && view === 'study') renderCard();
    toast(settings.direction === 'jp' ? 'Mặt trước: tiếng Nhật' : 'Mặt trước: tiếng Việt');
  }

  function toggleHardCurrent() {
    if (!session || session.busy) return;
    const { deckId, card } = session.items[session.i];
    const on = toggleHard(deckId, card);
    $$('[data-hard]', wrap).forEach((b) => b.setAttribute('aria-pressed', String(on)));
    toast(on ? '⭐ Đã thêm vào Từ khó nhớ' : 'Đã bỏ khỏi Từ khó nhớ');
  }

  function resetStamps() { $('#stampYes').style.opacity = '0'; $('#stampNo').style.opacity = '0'; }

  /* Kéo / vuốt thẻ */
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => {
    if (!session || session.busy || e.button > 0 || e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, moved: false };
    wrap.setPointerCapture(e.pointerId);
    wrap.style.transition = 'none';
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    const dy = (e.clientY - drag.y) * 0.25;
    if (Math.abs(drag.dx) > 6) drag.moved = true;
    if (!drag.moved) return;
    wrap.style.transform = `translate(${drag.dx}px, ${dy}px) rotate(${drag.dx / 20}deg)`;
    const p = Math.min(Math.abs(drag.dx) / 110, 1);
    $('#stampYes').style.opacity = drag.dx > 0 ? p : 0;
    $('#stampNo').style.opacity = drag.dx < 0 ? p : 0;
  });
  const endDrag = (cancelled) => {
    if (!drag) return;
    const { dx, moved } = drag;
    drag = null;
    if (!cancelled && Math.abs(dx) > 110) { mark(dx > 0 ? 'known' : 'learning'); return; }
    wrap.style.transition = 'transform .45s cubic-bezier(.2,1.4,.4,1)';
    wrap.style.transform = '';
    resetStamps();
    if (!cancelled && !moved) flip();
  };
  wrap.addEventListener('pointerup', () => endDrag(false));
  wrap.addEventListener('pointercancel', () => endDrag(true));

  wrap.addEventListener('click', (e) => {
    const item = session?.items[session.i];
    if (!item) return;
    let b;
    if (e.target.closest('[data-hint]')) showNextHint();
    else if (e.target.closest('[data-hard]')) toggleHardCurrent();
    else if (e.target.closest('[data-speak]')) speak(spokenText(item.card));
    else if ((b = e.target.closest('[data-speak-example]'))) speak(plain(examplesOf(item.card)[+b.dataset.speakExample]?.jp));
  });

  $('#btnFlip').addEventListener('click', flip);
  $('#btnYes').addEventListener('click', () => mark('known'));
  $('#btnNo').addEventListener('click', () => mark('learning'));
  $('#btnUndo').addEventListener('click', undo);
  $('#btnSpeak').addEventListener('click', () => session && speak(spokenText(session.items[session.i].card)));
  $('#btnDirection').addEventListener('click', toggleDirection);
  $('#btnExit').addEventListener('click', () => show('home'));

  document.addEventListener('keydown', (e) => {
    if (view !== 'study' || !session || document.querySelector('dialog[open]')) return;
    if (e.target.matches?.('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case ' ': case 'Enter': case 'ArrowUp': case 'ArrowDown': e.preventDefault(); flip(); break;
      case 'ArrowLeft': case '1': mark('learning'); break;
      case 'ArrowRight': case '2': mark('known'); break;
      case 'z': case 'Z': case 'Backspace': e.preventDefault(); undo(); break;
      case 's': case 'S': speak(spokenText(session.items[session.i].card)); break;
      case 'd': case 'D': toggleDirection(); break;
      case 'h': case 'H': toggleHardCurrent(); break;
      case 'g': case 'G': showNextHint(); break;
      case 'Escape': show('home'); break;
    }
  });

  /* ---------------------------------------------------------------- *
   *  Kết quả
   * ---------------------------------------------------------------- */
  function finish() {
    const total = session.items.length;
    const pct = Math.round((session.known / total) * 100);
    const [jp, vi] =
      pct === 100 ? ['完璧！', 'Hoàn hảo! Bạn nhớ tất cả các thẻ'] :
      pct >= 80 ? ['素晴らしい！', 'Xuất sắc! Tiếp tục phát huy nhé'] :
      pct >= 50 ? ['いいね！', 'Làm tốt lắm, ôn thêm chút nữa nhé'] :
                  ['がんばって！', 'Cố lên! Ôn lại vài lượt là nhớ thôi'];

    $('#donePct').textContent = `${pct}%`;
    $('#doneJp').textContent = jp;
    $('#doneTitle').textContent = vi;
    $('#doneKnown').textContent = session.known;
    $('#doneLearning').textContent = session.learning;
    $('#doneHints').textContent = session.hintsUsed ? `💡 Đã dùng ${session.hintsUsed} gợi ý trong lượt này` : '';

    const wrong = session.history.filter((h) => h.status === 'learning').length;
    $('#btnRetryWrong').hidden = wrong === 0;
    $('#retryWrongLabel').textContent = `Ôn lại ${wrong} thẻ chưa nhớ`;
    const notHard = wrongItems().filter((it) => !isHard(it.deckId, it.card)).length;
    $('#btnAddHard').hidden = notHard === 0;
    $('#addHardLabel').textContent = `Thêm ${notHard} thẻ chưa nhớ vào Từ khó nhớ`;

    const ring = $('#ringDone');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = CIRC;
    show('done');
    void ring.getBoundingClientRect();
    ring.style.transition = '';
    requestAnimationFrame(() => { ring.style.strokeDashoffset = CIRC * (1 - pct / 100); });
    if (pct >= 80) setTimeout(confetti, 350);
  }

  const wrongItems = () => session.history.filter((h) => h.status === 'learning').map((h) => session.items[h.i]);
  $('#btnRetryWrong').addEventListener('click', () => {
    startSession({ title: session.title, sub: 'Ôn lại thẻ chưa nhớ', items: wrongItems() });
  });
  $('#btnAddHard').addEventListener('click', () => {
    const items = wrongItems();
    items.forEach((it) => toggleHard(it.deckId, it.card, true));
    $('#btnAddHard').hidden = true;
    toast(`⭐ Đã thêm ${items.length} thẻ vào Từ khó nhớ`);
  });
  $('#btnRetryAll').addEventListener('click', () => startSession({ title: session.title, sub: session.sub, items: session.items }));
  $('#btnHome').addEventListener('click', () => show('home'));
  $('#logo').addEventListener('click', () => (LV ? navigate(LV, 'vocab') : show('home')));

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.className = 'pointer-events-none fixed inset-0 z-50';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    const colors = ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#818cf8', '#f472b6'];
    const ps = Array.from({ length: 160 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 160, y: H * 0.38,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4,
      s: Math.random() * 6 + 5, c: colors[(Math.random() * colors.length) | 0],
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
    }));
    let t = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.vy += 0.38; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 150);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (++t < 160) requestAnimationFrame(tick); else c.remove();
    })();
  }

  /* ---------------------------------------------------------------- *
   *  Danh sách từ
   * ---------------------------------------------------------------- */
  // list = { title, sub(), items: () => [{deckId, deckTitle, card}], hardOnly }
  let list = null;
  function openList(d) {
    list = {
      title: d.title,
      sub: () => { const s = deckStats(d); return `${s.total} thẻ · ${s.known} đã thuộc · ${s.learning} đang học`; },
      items: () => itemsOf(d),
    };
    showList();
  }
  function openHardList() {
    list = {
      title: 'Từ khó nhớ',
      sub: () => `${hardItems().length} từ · bấm ⭐ để bỏ đánh dấu`,
      items: hardItems,
      hardOnly: true,
    };
    showList();
  }
  function showList() {
    $('#listTitle').textContent = list.title;
    $('#listSearch').value = '';
    renderList();
    $('#dlgList').showModal();
    $('#listSearch').blur();
  }
  function renderList() {
    $('#listSub').textContent = list.sub();
    const q = $('#listSearch').value.trim().toLowerCase();
    const dot = { known: 'bg-emerald-500', learning: 'bg-amber-400' };
    list.rows = list.items().filter(({ card: c }) =>
      !q || [c.word, c.kana, c.kanjiAlt, c.romaji, c.hanviet, c.meaning].some((v) => v && v.toLowerCase().includes(q)));
    $('#listBody').innerHTML = list.rows.length ? list.rows.map(({ deckId, deckTitle, card: c }, idx) => `
      <li class="flex items-center gap-3 py-3">
        <span class="h-2 w-2 shrink-0 rounded-full ${dot[statusOf(deckId, c)] || 'bg-stone-300 dark:bg-white/20'}"></span>
        <div class="min-w-0 flex-1">
          <p class="font-jp text-lg font-bold leading-tight">${esc(c.word)}${c.kanjiAlt ? `<span class="ml-1.5 font-jp text-sm font-medium text-stone-400">（${esc(c.kanjiAlt)}）</span>` : ''}
            ${c.kana && c.kana !== c.word ? `<span class="ml-1.5 font-jpsans text-sm font-normal text-rose-500 dark:text-rose-400">${esc(c.kana)}</span>` : ''}</p>
          <p class="truncate text-sm text-stone-500 dark:text-stone-400">${c.hanviet ? `<span class="mr-1.5 text-[0.6875rem] font-semibold tracking-wide text-indigo-500 dark:text-indigo-300">${esc(c.hanviet)}</span>` : ''}${esc(c.meaning)}</p>
          ${list.hardOnly ? `<p class="mt-0.5 text-[0.6875rem] text-stone-400">${esc(deckTitle)}${c.no ? ` · #${c.no}` : ''}</p>` : ''}
        </div>
        <button data-star="${idx}" aria-pressed="${isHard(deckId, c)}" title="Từ khó nhớ" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-300 transition hover:bg-amber-50 hover:text-amber-500 active:scale-90 aria-pressed:text-amber-400 dark:text-stone-600 dark:hover:bg-amber-500/10 [&[aria-pressed=true]_svg]:fill-current">${ico('star')}</button>
        <button data-say="${idx}" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10">${ico('volume')}</button>
      </li>`).join('')
      : `<li class="py-10 text-center text-sm text-stone-500">${list.hardOnly && !q ? 'Danh sách đang trống' : 'Không tìm thấy từ nào'}</li>`;
  }
  $('#listSearch').addEventListener('input', renderList);
  $('#listBody').addEventListener('click', (e) => {
    const say = e.target.closest('[data-say]');
    if (say) { speak(spokenText(list.rows[+say.dataset.say].card)); return; }
    const star = e.target.closest('[data-star]');
    if (!star) return;
    const { deckId, card } = list.rows[+star.dataset.star];
    const on = toggleHard(deckId, card);
    if (list.hardOnly) renderList();
    else star.setAttribute('aria-pressed', String(on));
  });
  $('#dlgList').addEventListener('close', () => { if (view === 'home') renderHome(); });

  /* ---------------------------------------------------------------- *
   *  Thêm bộ thẻ
   * ---------------------------------------------------------------- */
  function parseImport(text) {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const p = l.split(/\s*[|\t]\s*/).map((s) => s.trim());
        if (p.length < 2 || !p[0]) return null;
        if (p.length === 2) return p[1] ? { word: p[0], meaning: p[1] } : null;
        if (!p[2]) return null;
        const card = { word: p[0], meaning: p[2] };
        if (p[1]) card.kana = p[1];
        if (p[3]) card.example = p[3];
        if (p[4]) card.exampleMeaning = p[4];
        return card;
      })
      .filter(Boolean);
  }

  $('#btnImport').addEventListener('click', () => {
    $('#impTitle').value = '';
    $('#impText').value = '';
    $('#impCount').textContent = '0 thẻ hợp lệ';
    $('#dlgImport').showModal();
  });
  $('#impText').addEventListener('input', () => {
    const n = parseImport($('#impText').value).length;
    $('#impCount').textContent = `${n} thẻ hợp lệ`;
  });
  $('#impSave').addEventListener('click', () => {
    const title = $('#impTitle').value.trim();
    const cards = parseImport($('#impText').value);
    if (!title) { $('#impTitle').focus(); toast('Hãy đặt tên cho bộ thẻ'); return; }
    if (!cards.length) { $('#impText').focus(); toast('Chưa có thẻ hợp lệ nào'); return; }
    customDecks.push({ id: `custom-${Date.now().toString(36)}`, level: LV, title, subtitle: '', cards });
    save(KEY.custom, customDecks);
    $('#dlgImport').close();
    renderHome();
    toast(`Đã thêm "${title}" với ${cards.length} thẻ`);
  });

  /* ---------------------------------------------------------------- *
   *  Tìm kiếm nhanh
   * ---------------------------------------------------------------- */
  // Bỏ dấu tiếng Việt: "chuẩn bị" -> "chuan bi"
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  // Katakana -> hiragana để gõ "こーど" vẫn ra コード
  const toHira = (s) => String(s || '').replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const hasDiacritics = (s) => fold(s) !== String(s).toLowerCase();

  let searchIndex = [];
  let search = { results: [], active: 0, open: -1 };

  function buildSearchIndex() {
    searchIndex = allDecks().flatMap((d) => d.cards.map((card) => ({
      deckId: d.id, deckTitle: d.title, card,
      jp: [card.word, card.kana, card.kanjiAlt].filter(Boolean).map((s) => toHira(s.toLowerCase())),
      syn: synonymsOf(card).flatMap((s) => [s.w, s.r]).filter(Boolean).map((s) => toHira(s.toLowerCase())),
      romaji: (card.romaji || '').toLowerCase(),
      hv: (card.hanviet || '').toLowerCase(), hvF: fold(card.hanviet), vi: card.meaning.toLowerCase(), viF: fold(card.meaning),
    })));
  }

  function runSearch(raw) {
    const q = raw.trim().toLowerCase();
    if (!q) return [];
    const num = q.match(/^#?(\d+)$/);
    const qj = toHira(q);
    const strict = hasDiacritics(q);              // gõ có dấu -> so khớp có dấu
    const qv = strict ? q : fold(q);
    const wordStart = new RegExp(`(^|[^\\p{L}\\p{N}])${qv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u');
    const out = [];
    for (const e of searchIndex) {
      let score = 0;
      if (num && e.card.no === +num[1]) score = 100;
      for (const s of e.jp) {
        if (s === qj) score = Math.max(score, 90);
        else if (s.startsWith(qj)) score = Math.max(score, 70);
        else if (s.includes(qj)) score = Math.max(score, 50);
      }
      if (e.romaji && e.romaji.startsWith(q)) score = Math.max(score, 45);
      // Khớp với từ đồng nghĩa: xếp sau các khớp trực tiếp
      if (e.syn.some((s) => s === qj)) score = Math.max(score, 28);
      else if (qj.length >= 2 && e.syn.some((s) => s.startsWith(qj))) score = Math.max(score, 18);
      const hv = strict ? e.hv : e.hvF;
      if (hv) {
        if (hv === qv) score = Math.max(score, 60);
        else if (hv.startsWith(qv)) score = Math.max(score, 40);
      }
      const vi = strict ? e.vi : e.viF;
      if (vi === qv) score = Math.max(score, 65);
      else if (wordStart.test(vi)) score = Math.max(score, vi.startsWith(qv) ? 38 : 32);
      else if (qv.length >= 3 && vi.includes(qv)) score = Math.max(score, 15);
      if (score) out.push({ e, score });
    }
    return out.sort((a, b) => b.score - a.score || (a.e.card.no || 0) - (b.e.card.no || 0)).map((r) => r.e);
  }

  function openSearch() {
    if (document.querySelector('dialog[open]')) return;
    buildSearchIndex();
    $('#dlgSearch').showModal();
    $('#searchInput').select();
    renderSearch();
  }

  const SEARCH_LIMIT = 60;
  function renderSearch() {
    const raw = $('#searchInput').value;
    search = { results: runSearch(raw), active: 0, open: -1 };
    const n = search.results.length;
    $('#searchMeta').textContent = !raw.trim() ? ''
      : n ? `${n} kết quả${n > SEARCH_LIMIT ? ` · hiện ${SEARCH_LIMIT} kết quả đầu` : ''}` : '';
    if (!raw.trim()) {
      $('#searchResults').innerHTML = `
        <li class="px-3 py-8 text-center">
          <p class="font-jp text-3xl text-stone-300 dark:text-stone-600">探す</p>
          <p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Gõ <b>Kanji</b>, <b>kana</b>, <b>Âm Hán</b> hoặc <b>nghĩa tiếng Việt</b> (có dấu hay không dấu đều được).
            Gõ <b>#123</b> để tìm theo số thứ tự.</p>
          <div class="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            ${['出勤', 'しゅっ', 'nhân', 'chuan bi', '#500'].map((s) => `<button data-try="${s}" class="rounded-full border border-stone-200 px-3 py-1 font-jpsans text-stone-600 transition hover:bg-stone-100 dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/10">${s}</button>`).join('')}
          </div>
        </li>`;
      return;
    }
    if (!n) {
      $('#searchResults').innerHTML = `<li class="px-3 py-10 text-center text-sm text-stone-500">Không tìm thấy từ nào cho “${esc(raw.trim())}”</li>`;
      return;
    }
    $('#searchResults').innerHTML = search.results.slice(0, SEARCH_LIMIT).map((e, i) => searchRowHTML(e, i)).join('');
    paintActive();
  }

  function searchRowHTML(e, i) {
    const c = e.card;
    const dot = { known: 'bg-emerald-500', learning: 'bg-amber-400' }[statusOf(e.deckId, c)] || 'bg-stone-300 dark:bg-white/20';
    const exs = search.open === i ? examplesOf(c) : [];
    return `
      <li data-row="${i}" class="group rounded-2xl transition data-[active=true]:bg-stone-100 dark:data-[active=true]:bg-white/[0.06]">
        <div class="flex items-center gap-3 px-3 py-2.5">
          <span class="h-2 w-2 shrink-0 rounded-full ${dot}"></span>
          <button data-open-row="${i}" class="min-w-0 flex-1 text-left">
            <p class="font-jp text-lg font-bold leading-tight">${esc(c.word)}${c.kanjiAlt ? `<span class="ml-1.5 font-jp text-sm font-medium text-stone-400">（${esc(c.kanjiAlt)}）</span>` : ''}
              ${c.kana && c.kana !== c.word ? `<span class="ml-1.5 font-jpsans text-sm font-normal text-rose-500 dark:text-rose-400">${esc(c.kana)}</span>` : ''}</p>
            <p class="truncate text-sm text-stone-500 dark:text-stone-400">${c.hanviet ? `<span class="mr-1.5 text-[0.6875rem] font-semibold tracking-wide text-indigo-500 dark:text-indigo-300">${esc(c.hanviet)}</span>` : ''}${esc(c.meaning)}</p>
          </button>
          <span class="hidden shrink-0 rounded-full bg-stone-900/5 px-2 py-0.5 text-[0.6875rem] text-stone-500 sm:inline dark:bg-white/10 dark:text-stone-400">${esc(e.deckTitle)}${c.no ? ` · #${c.no}` : ''}</span>
          <button data-star-row="${i}" aria-pressed="${isHard(e.deckId, c)}" title="Từ khó nhớ" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-300 transition hover:bg-amber-50 hover:text-amber-500 aria-pressed:text-amber-400 dark:text-stone-600 dark:hover:bg-amber-500/10 [&[aria-pressed=true]_svg]:fill-current">${ico('star')}</button>
          <button data-say-row="${i}" title="Phát âm" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10">${ico('volume')}</button>
        </div>
        ${search.open === i ? `
        <div class="view-enter px-3 pb-3 pl-8">
          <p class="mb-2 text-[0.6875rem] text-stone-400 sm:hidden">${esc(e.deckTitle)}${c.no ? ` · #${c.no}` : ''}</p>
          ${exs.length ? `<ul class="divide-y divide-stone-200/70 rounded-xl border border-stone-200/70 bg-white/80 dark:divide-white/5 dark:border-white/10 dark:bg-white/5">
            ${exs.map((ex, k) => `
              <li class="flex items-start gap-3 px-3.5 py-2.5">
                <div class="min-w-0 flex-1">
                  <p class="font-jpsans text-[0.9375rem] leading-relaxed">${markTarget(ex.jp)}</p>
                  <p class="text-[0.8125rem] text-stone-500 dark:text-stone-400">${esc(ex.vi)}</p>
                </div>
                <button data-say-ex="${i}:${k}" class="mt-1 shrink-0 text-stone-400 transition hover:text-rose-500">${ico('volume')}</button>
              </li>`).join('')}
          </ul>` : '<p class="text-sm text-stone-400">Từ này chưa có câu ví dụ.</p>'}
          ${synonymsHTML(c, 'mt-3')}
        </div>` : ''}
      </li>`;
  }

  function paintActive(scroll = false) {
    $$('#searchResults [data-row]').forEach((li) => {
      const on = +li.dataset.row === search.active;
      li.dataset.active = String(on);
      if (on && scroll) li.scrollIntoView({ block: 'nearest' });
    });
  }

  function toggleRow(i) {
    search.open = search.open === i ? -1 : i;
    search.active = i;
    // Vẽ lại dòng được chọn và dòng đang mở trước đó
    $$('#searchResults [data-row]').forEach((row) => {
      const k = +row.dataset.row;
      if (k === i || row.querySelector('.view-enter')) row.outerHTML = searchRowHTML(search.results[k], k);
    });
    paintActive();
    $(`#searchResults [data-row="${i}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  $('#btnSearch').addEventListener('click', openSearch);
  $('#searchInput').addEventListener('input', renderSearch);
  $('#searchInput').addEventListener('keydown', (e) => {
    const n = Math.min(search.results.length, SEARCH_LIMIT);
    if (!n) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); search.active = (search.active + 1) % n; paintActive(true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); search.active = (search.active - 1 + n) % n; paintActive(true); }
    else if (e.key === 'Enter') { e.preventDefault(); toggleRow(search.active); }
  });
  $('#searchResults').addEventListener('click', (e) => {
    const t = e.target.closest('[data-try],[data-open-row],[data-star-row],[data-say-row],[data-say-ex]');
    if (!t) return;
    if (t.dataset.try) { $('#searchInput').value = t.dataset.try; renderSearch(); $('#searchInput').focus(); return; }
    if (t.dataset.sayEx) {
      const [i, k] = t.dataset.sayEx.split(':').map(Number);
      speak(plain(examplesOf(search.results[i].card)[k]?.jp));
      return;
    }
    const i = +(t.dataset.openRow ?? t.dataset.starRow ?? t.dataset.sayRow);
    const r = search.results[i];
    if (t.dataset.openRow !== undefined) toggleRow(i);
    else if (t.dataset.sayRow !== undefined) speak(spokenText(r.card));
    else t.setAttribute('aria-pressed', String(toggleHard(r.deckId, r.card)));
  });
  $('#dlgSearch').addEventListener('close', () => { if (view === 'home') renderHome(); });

  // Phím tắt mở tìm kiếm: "/" hoặc Ctrl/⌘ + K
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]') || e.target.matches?.('input, textarea')) return;
    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      if (view === 'grammar' && e.key === '/') { $('#gmSearch').focus(); return; }
      openSearch();
    }
  });

  /* ---------------------------------------------------------------- *
   *  Ngữ pháp
   * ---------------------------------------------------------------- */
  const GRAMMAR = () => lvData().grammar || [];
  let gDone = load(KEY.grammar, {});              // { 'n2:nhóm.vị trí': true }
  // Khóa cũ không có tiền tố cấp -> thuộc N2
  if (Object.keys(gDone).some((k) => !k.includes(':'))) {
    gDone = Object.fromEntries(Object.keys(gDone).map((k) => [k.includes(':') ? k : `n2:${k}`, true]));
    save(KEY.grammar, gDone);
  }
  let gFilter = 'all';
  const gKey = (g, i) => `${LV}:${g.no}.${i}`;
  const gTotal = () => GRAMMAR().reduce((a, g) => a + g.items.length, 0);
  // ~~ます~~ (chữ bị gạch trong sách) -> <s>
  // Furigana trong dữ liệu ngữ pháp: {漢字|かんじ}
  const RUBY = /\{([^|{}]+)\|([^{}]+)\}/g;
  const plainJ = (s) => String(s || '').replace(RUBY, '$1');   // chỉ chữ Hán
  const readJ = (s) => String(s || '').replace(RUBY, '$2');    // thay chữ Hán bằng cách đọc
  const fmtG = (s) => esc(s)
    .replace(/~~(.+?)~~/g, '<s class="decoration-rose-400/80 decoration-2 opacity-60">$1</s>')
    .replace(RUBY, '<ruby>$1<rt>$2</rt></ruby>');
  const speakablePattern = (p) => readJ(p).replace(/~~.*?~~/g, '').replace(/[～〜~…・]/g, ' ').replace(/[（(]([^）)]*)[）)]/g, '$1').trim();

  function gMatches(g, it, q) {
    if (!q) return true;
    const qf = fold(q), qj = toHira(q.toLowerCase());
    const raw = [g.title, ...it.patterns, it.structure, ...it.examples.map((e) => e.jp)].join(' ');
    const jp = `${plainJ(raw)} ${readJ(raw)}`;
    const vi = fold([it.meaning, it.usage, ...it.examples.map((e) => e.vi)].join(' '));
    return toHira(jp.toLowerCase()).includes(qj) || vi.includes(qf);
  }

  const groupDone = (g) => g.items.filter((_, i) => gDone[gKey(g, i)]).length;
  function renderGrammarSummary() {
    const total = gTotal();
    const done = Object.keys(gDone).filter((k) => k.startsWith(`${LV}:`)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $('#gmSub').textContent = total
      ? `${GRAMMAR().length} nhóm · ${total} mẫu ngữ pháp. Đánh dấu "Đã nắm" để theo dõi tiến độ, bấm 🔊 để nghe câu ví dụ.`
      : 'Chưa có dữ liệu ngữ pháp.';
    $('#gmDone').textContent = done;
    $('#gmTotal').textContent = total;
    $('#gmPct').textContent = `${pct}%`;
    requestAnimationFrame(() => { $('#ringGram').style.strokeDashoffset = CIRC * (1 - pct / 100); });
  }
  // Cập nhật số "đã nắm" của một nhóm ở mục lục, tiêu đề nhóm và thanh tiến độ
  function renderGroupProgress(g) {
    const d = groupDone(g), n = g.items.length;
    const cnt = $(`#gmToc [data-gcount="${g.no}"]`);
    if (cnt) {
      cnt.textContent = `${d}/${n}`;
      cnt.classList.toggle('text-emerald-500', d === n);
      cnt.classList.toggle('text-stone-400', d !== n);
    }
    const head = $(`[data-ghead="${g.no}"]`);
    if (head) head.textContent = `${n} mẫu · ${d} đã nắm`;
    const bar = $(`[data-gbar="${g.no}"]`);
    if (bar) bar.style.width = `${(d / n) * 100}%`;
  }

  function renderGrammar() {
    renderGrammarSummary();
    $$('[data-gfilter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gfilter === gFilter)));
    $('#tglFuri').setAttribute('aria-pressed', String(settings.furigana !== false));
    $('#viewGrammar').classList.toggle('no-furi', settings.furigana === false);

    const q = $('#gmSearch').value.trim();
    const groups = GRAMMAR().map((g) => ({
      g,
      items: g.items
        .map((it, i) => ({ it, i, on: !!gDone[gKey(g, i)] }))
        .filter(({ it, on }) => gMatches(g, it, q) && (gFilter === 'all' || (gFilter === 'done') === on)),
    })).filter((x) => x.items.length);

    $('#gmToc').innerHTML = `
      <p class="mb-3 px-3 text-[0.6875rem] font-semibold uppercase tracking-widest text-stone-400">Mục lục</p>
      <ul class="space-y-0.5">${groups.map(({ g }) => `
        <li><button data-goto="${g.no}" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-stone-600 transition hover:bg-stone-900/5 data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 dark:text-stone-300 dark:hover:bg-white/5 dark:data-[active=true]:bg-indigo-500/10 dark:data-[active=true]:text-indigo-200">
          <span class="w-5 shrink-0 text-right text-xs tabular-nums text-stone-400">${g.no}</span>
          <span class="min-w-0 flex-1 truncate font-jpsans">${esc(plainJ(g.title))}</span>
          <span data-gcount="${g.no}" class="text-[0.6875rem] tabular-nums ${groupDone(g) === g.items.length ? 'text-emerald-500' : 'text-stone-400'}">${groupDone(g)}/${g.items.length}</span>
        </button></li>`).join('')}
      </ul>`;
    $('#gmChips').innerHTML = groups.map(({ g }) => `
      <button data-goto="${g.no}" class="shrink-0 rounded-full border border-stone-200/80 bg-white/70 px-3 py-1.5 text-sm text-stone-600 transition data-[active=true]:border-indigo-300 data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:data-[active=true]:border-indigo-400/30 dark:data-[active=true]:bg-indigo-500/10 dark:data-[active=true]:text-indigo-200">
        <span class="text-xs text-stone-400">${g.no}</span> <span class="font-jpsans">${esc(plainJ(g.title))}</span></button>`).join('');

    $('#gmList').innerHTML = groups.length ? groups.map(({ g, items }) => `
      <section id="grp-${g.no}" data-group="${g.no}" class="cv-auto scroll-mt-40 lg:scroll-mt-28">
        <header class="mb-5 flex items-end gap-4">
          <span class="font-jp text-5xl font-black leading-none text-stone-900/10 tabular-nums dark:text-white/10">${String(g.no).padStart(2, '0')}</span>
          <div class="min-w-0 flex-1">
            <h2 class="font-jp text-2xl font-bold tracking-tight">${fmtG(g.title)}</h2>
            <p data-ghead="${g.no}" class="text-sm text-stone-500 dark:text-stone-400">${g.items.length} mẫu · ${groupDone(g)} đã nắm</p>
          </div>
          <div class="mb-1.5 hidden h-1.5 w-28 overflow-hidden rounded-full bg-stone-200/80 sm:block dark:bg-white/10">
            <div data-gbar="${g.no}" class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-500" style="width:${(groupDone(g) / g.items.length) * 100}%"></div>
          </div>
        </header>
        <div class="space-y-4">${items.map(({ it, i, on }) => grammarCardHTML(g, it, i, on)).join('')}</div>
      </section>`).join('')
      : `<div class="glass rounded-3xl p-10 text-center">
           <p class="font-jp text-3xl text-stone-300 dark:text-stone-600">見つからない</p>
           <p class="mt-3 text-sm text-stone-500">Không có mẫu ngữ pháp nào phù hợp.</p>
         </div>`;
    spyGroups();
  }

  function grammarCardHTML(g, it, i, on) {
    const key = gKey(g, i);
    return `
      <article data-gitem="${key}" class="rounded-3xl border bg-white/90 p-5 shadow-sm transition sm:p-6 dark:bg-white/[0.05] ${on ? 'border-emerald-300/70 dark:border-emerald-400/25' : 'border-white/70 dark:border-white/10'}">
        <div class="flex items-start gap-4">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 text-sm font-bold text-white shadow-md shadow-indigo-500/20">${it.no}</span>
          <div class="min-w-0 flex-1 pt-0.5">
            ${it.patterns.map((p) => `<h3 class="font-jp text-xl font-bold leading-snug text-indigo-700 sm:text-2xl dark:text-indigo-300">${fmtG(p)}</h3>`).join('')}
            ${it.meaning ? `
            <p class="mt-2 inline-flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-[0.9375rem] font-semibold leading-snug text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <span class="mt-0.5 shrink-0 text-[0.625rem] font-bold uppercase tracking-widest text-amber-600/80 dark:text-amber-300/70">Ý nghĩa</span>
              <span>${esc(it.meaning)}</span>
            </p>` : ''}
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button data-gspeak="${key}" title="Nghe mẫu" class="grid h-9 w-9 place-items-center rounded-full text-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10">${ico('volume')}</button>
            <button data-gdone="${key}" aria-pressed="${on}" class="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-500 transition hover:border-emerald-300 hover:text-emerald-600 active:scale-95 aria-pressed:border-emerald-500 aria-pressed:bg-emerald-500 aria-pressed:text-white dark:border-white/10 dark:text-stone-400">
              <span class="text-sm">${ico('check')}</span><span class="hidden sm:inline">${on ? 'Đã nắm' : 'Đánh dấu đã nắm'}</span>
            </button>
          </div>
        </div>
        <div class="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div class="space-y-4">
            ${it.structure ? `
            <div>
              <p class="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-stone-400">Cấu trúc</p>
              <p class="whitespace-pre-line rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 font-jpsans text-[0.9375rem] leading-relaxed text-stone-800 dark:border-indigo-400/10 dark:bg-indigo-500/[0.07] dark:text-stone-100">${fmtG(it.structure)}</p>
            </div>` : ''}
            ${it.usage ? `
            <div>
              <p class="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-stone-400">Cách dùng</p>
              <p class="whitespace-pre-line text-[0.9375rem] leading-relaxed text-stone-700 dark:text-stone-300">${fmtG(it.usage)}</p>
            </div>` : ''}
          </div>
          ${it.examples.length ? `
          <div>
            <p class="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-stone-400">Ví dụ</p>
            <ul class="space-y-2">${it.examples.map((ex, k) => `
              <li class="flex items-start gap-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div class="min-w-0 flex-1">
                  <p class="font-jpsans text-[0.9375rem] leading-relaxed">${fmtG(ex.jp)}</p>
                  ${ex.vi ? `<p class="mt-0.5 text-[0.8125rem] leading-snug text-stone-500 dark:text-stone-400">${fmtG(ex.vi)}</p>` : ''}
                </div>
                <button data-gex="${key}:${k}" title="Nghe câu ví dụ" class="mt-1 shrink-0 text-stone-400 transition hover:text-rose-500">${ico('volume')}</button>
              </li>`).join('')}
            </ul>
          </div>` : ''}
        </div>
      </article>`;
  }

  const gFind = (key) => {
    const [gn, i] = key.split(':')[1].split('.').map(Number);
    const g = GRAMMAR().find((x) => x.no === gn);
    return { g, it: g?.items[i], i };
  };

  $('#gmList').addEventListener('click', (e) => {
    const t = e.target.closest('[data-gdone],[data-gspeak],[data-gex]');
    if (!t) return;
    if (t.dataset.gex) {
      const [key, k] = t.dataset.gex.split(':');
      speak(readJ(gFind(key).it.examples[+k].jp).replace(/^[①-⑳]\s*/, ''));
    } else if (t.dataset.gspeak) {
      speak(gFind(t.dataset.gspeak).it.patterns.map(speakablePattern).join('、'));
    } else {
      const key = t.dataset.gdone;
      if (gDone[key]) delete gDone[key]; else gDone[key] = true;
      save(KEY.grammar, gDone);
      if (gFilter === 'all') {
        const { g, it, i } = gFind(key);
        t.closest('[data-gitem]').outerHTML = grammarCardHTML(g, it, i, !!gDone[key]);
        renderGrammarSummary();
        renderGroupProgress(g);
      } else {
        const y = window.scrollY;
        renderGrammar();
        window.scrollTo({ top: y });
      }
      if (gDone[key]) toast('✓ Đã đánh dấu mẫu này là đã nắm');
    }
  });

  const scrollToGroup = (no) => $(`#grp-${no}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#gmToc').addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (b) scrollToGroup(b.dataset.goto); });
  $('#gmChips').addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (b) scrollToGroup(b.dataset.goto); });
  let gSearchTimer;
  $('#gmSearch').addEventListener('input', () => {
    clearTimeout(gSearchTimer);
    gSearchTimer = setTimeout(renderGrammar, 150);
  });
  $$('[data-gfilter]').forEach((b) => b.addEventListener('click', () => { gFilter = b.dataset.gfilter; renderGrammar(); }));
  $('#tglFuri').addEventListener('click', () => {
    settings.furigana = settings.furigana === false;
    save(KEY.settings, settings);
    $('#tglFuri').setAttribute('aria-pressed', String(settings.furigana));
    $('#viewGrammar').classList.toggle('no-furi', !settings.furigana);
  });

  // Tô sáng nhóm đang xem trong mục lục
  let gObserver;
  function spyGroups() {
    gObserver?.disconnect();
    gObserver = new IntersectionObserver((entries) => {
      const vis = entries.filter((en) => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!vis) return;
      const no = vis.target.dataset.group;
      $$('#gmToc [data-goto], #gmChips [data-goto]').forEach((b) => {
        const on = b.dataset.goto === no;
        b.dataset.active = String(on);
        if (on && b.closest('#gmChips')) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    $$('#gmList [data-group]').forEach((s) => gObserver.observe(s));
  }

  /* ---------------------------------------------------------------- *
   *  Cấp độ & điều hướng: #/<cấp>/<vocab|grammar>
   * ---------------------------------------------------------------- */
  // Lưu file dữ liệu vào bộ nhớ offline ngay từ lần mở đầu (trùng tên cache với DATA_CACHE trong sw.js)
  const OFFLINE_DATA_CACHE = 'tango-v1-data';
  function saveForOffline(url) {
    if (!location.protocol.startsWith('http') || !window.caches) return;
    caches.open(OFFLINE_DATA_CACHE)
      .then((c) => c.match(url).then((hit) => hit || c.add(url)))
      .catch(() => { /* bỏ qua */ });
  }

  const scripts = {};
  const loadScript = (src) => (scripts[src] ||= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    // Đổi TANGO_DATA_VERSION (data/levels.js) mỗi khi sửa dữ liệu để trình duyệt tải bản mới
    el.src = `${src}?v=${window.TANGO_DATA_VERSION || '1'}`;
    el.onload = () => { saveForOffline(el.src); resolve(); };
    el.onerror = () => { delete scripts[src]; reject(new Error(src)); };
    document.head.appendChild(el);
  }));

  // File bắt buộc phải có trước khi hiện từng trang; các file còn lại (ví dụ, đồng nghĩa…) tải ngầm sau
  const PRIMARY = { vocab: ['vocab'], grammar: ['grammar'] };
  const ensureFiles = (lv, kinds) => Promise.all(kinds.filter((k) => lv.files[k]).map((k) => loadScript(lv.files[k])));
  const migrated = new Set();
  function afterVocab(id) {
    if (LV !== id || migrated.has(id) || !lvData().vocab) return;
    migrated.add(id);
    migrateCardKeys();
  }

  async function useLevel(id, sec) {
    const lv = LEVELS.find((l) => l.id === id);
    await ensureFiles(lv, PRIMARY[sec]);
    LV = id;
    afterVocab(id);
    try { localStorage.setItem(KEY.level, id); } catch { /* bỏ qua */ }
    renderLevelMenu();
    ensureFiles(lv, Object.keys(lv.files))
      .then(() => { if (LV === id) { afterVocab(id); onLevelDataReady(); } })
      .catch((err) => console.error(err));
  }

  // Câu ví dụ / từ đồng nghĩa vừa tải xong: vẽ lại những chỗ đang dùng tới chúng
  function onLevelDataReady() {
    if (view === 'study' && session && !session.busy) {
      const item = session.items[session.i];
      if (session.hint === 0) $('#faceFront').innerHTML = frontHTML(item);
      $('#faceBack').innerHTML = backHTML(item);
      $$('[data-hard]', wrap).forEach((b) => b.setAttribute('aria-pressed', String(isHard(item.deckId, item.card))));
    }
    if ($('#dlgSearch').open) { buildSearchIndex(); renderSearch(); }
  }

  const section = () => (view === 'grammar' ? 'grammar' : 'vocab');
  function navigate(levelId, sec = section()) {
    const hash = `#/${levelId}/${sec}`;
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  async function route() {
    const [, lvId, sec] = location.hash.match(/^#\/(\w+)\/(\w+)/) || [];
    let saved = null;
    try { saved = localStorage.getItem(KEY.level); } catch { /* bỏ qua */ }
    const pick = [lvId, LV, saved].map((id) => LEVELS.find((l) => l.id === id && hasData(l))).find(Boolean)
      || LEVELS.find(hasData);
    if (!pick) { show('home'); return; }
    const want = sec === 'grammar' || location.hash === '#grammar' ? 'grammar' : 'vocab';
    try {
      if (pick.id !== LV) await useLevel(pick.id, want);
      else { await ensureFiles(pick, PRIMARY[want]); afterVocab(pick.id); }
    } catch (err) {
      toast(`Không tải được dữ liệu ${pick.label}`);
      console.error(err);
      return;
    }
    const hash = `#/${pick.id}/${want}`;
    if (location.hash !== hash) history.replaceState(null, '', location.href.split('#')[0] + hash);
    if (sec === 'study' && savedSessions[pick.id] && resumeSession()) return;
    show(want === 'grammar' ? 'grammar' : 'home');
  }
  window.addEventListener('hashchange', route);
  $$('[data-section]').forEach((b) => b.addEventListener('click', () => navigate(LV, b.dataset.section)));

  /* Menu chọn cấp */
  function renderLevelMenu() {
    const lv = level();
    $('#levelLabel').textContent = lv.label || '—';
    $$('[data-level-label]').forEach((el) => { el.textContent = lv.label || ''; });
    $('#gmSource').textContent = lv.grammarSource || `JLPT ${lv.label || ''}`;
    $('#levelMenu').innerHTML = `
      <p class="px-3 pb-1.5 pt-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-stone-400">Cấp độ JLPT</p>
      ${LEVELS.map((l) => {
        const ok = hasData(l);
        const sub = ok ? [l.vocabSource, l.grammarSource].filter(Boolean).join(' · ') || 'Đã có dữ liệu' : 'Sắp có';
        return `
        <button data-level="${l.id}" ${ok ? '' : 'disabled'} aria-current="${l.id === LV}"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-stone-900/5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent aria-[current=true]:bg-rose-50 dark:hover:bg-white/5 dark:aria-[current=true]:bg-rose-500/10">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${l.id === LV ? 'bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-md shadow-rose-500/25' : 'bg-stone-900/5 text-stone-600 dark:bg-white/10 dark:text-stone-300'}">${esc(l.label)}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">JLPT ${esc(l.label)}</span>
            <span class="block truncate text-xs text-stone-500 dark:text-stone-400">${esc(sub)}</span>
          </span>
          ${l.id === LV ? `<span class="text-rose-500">${ico('check')}</span>` : ''}
        </button>`;
      }).join('')}`;
  }
  const levelMenu = $('#levelMenu');
  const setLevelMenu = (open) => {
    levelMenu.hidden = !open;
    $('#levelBtn').setAttribute('aria-expanded', String(open));
  };
  $('#levelBtn').addEventListener('click', (e) => { e.stopPropagation(); setLevelMenu(levelMenu.hidden); });
  levelMenu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b || b.disabled) return;
    setLevelMenu(false);
    if (b.dataset.level !== LV) navigate(b.dataset.level);
  });
  document.addEventListener('click', (e) => { if (!levelMenu.hidden && !e.target.closest('#levelMenu')) setLevelMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !levelMenu.hidden) setLevelMenu(false); });

  /* Đóng dialog: nút [data-close] hoặc bấm ra ngoài */
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
  });

  /* ---------------------------------------------------------------- *
   *  Theme
   * ---------------------------------------------------------------- */
  $('#btnTheme').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem(KEY.theme, dark ? 'dark' : 'light'); } catch { /* bỏ qua */ }
  });

  /* ---------------------------------------------------------------- *
   *  Nút lên đầu trang: hiện khi đã cuộn xuống
   * ---------------------------------------------------------------- */
  const btnTop = $('#btnTop');
  const HIDDEN_TOP = ['opacity-0', 'translate-y-4', 'pointer-events-none'];
  let topTick = false;
  window.addEventListener('scroll', () => {
    if (topTick) return;
    topTick = true;
    requestAnimationFrame(() => {
      const show = window.scrollY > 400;
      HIDDEN_TOP.forEach((c) => btnTop.classList.toggle(c, !show));
      topTick = false;
    });
  }, { passive: true });
  btnTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------------------------------------------------------------- *
   *  Khởi động
   * ---------------------------------------------------------------- */
  hydrateIcons();
  route();

  // PWA: service worker chỉ chạy khi mở qua web (http/https), không chạy khi mở file trực tiếp
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((err) => console.error(err)));
  }
})();
