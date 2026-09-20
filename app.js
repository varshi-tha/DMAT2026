(() => {
  'use strict';

  const app = document.getElementById('app');
  const FIG_COLORS = ['#c2185b', '#1e6fb8', '#2e7d32'];
  const DIFFS = ['easy', 'medium', 'hard'];
  const SUBJECTS = window.Engine?.ALL_SUBJECTS || [];

  const state = {
    page: 'home',
    practice: { type: 'figure', difficulty: 'random', count: 10, timer: true, topicId: 'all', questions: [], index: 0, score: 0, answered: false },
    mock: null
  };

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }
  function cryptoSeed() { const a = new Uint32Array(4); crypto.getRandomValues(a); return Array.from(a).join('-') + '-' + Date.now(); }
  function seededRng(seed) { let h = 2166136261 >>> 0; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  function withSeed(seed, fn) { const old = Math.random; Math.random = seededRng(seed); try { return fn() } finally { Math.random = old } }
  function fmtTime(ms) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60; return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` }
  function now() { return Date.now() }
  const STORAGE_KEY = 'dmat_stats_v2';
  const MAX_HISTORY = 20;
  function saveStats() {
    try {
      const payload = { version: 2, history: (state.stats?.history || []).slice(-MAX_HISTORY) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // Storage is optional. The app continues to work fully in memory if storage is blocked/full.
    }
  }
  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{}';
      const parsed = JSON.parse(raw);
      return { version: 2, history: Array.isArray(parsed.history) ? parsed.history.slice(-MAX_HISTORY) : [] };
    } catch (e) { return { version: 2, history: [] } }
  }
  function persistResultSummary(summary) {
    state.stats = state.stats || { version: 2, history: [] };
    state.stats.history = (state.stats.history || []).concat(summary).slice(-MAX_HISTORY);
    // Persist only tiny summaries at completion, never the generated question set.
    if ('requestIdleCallback' in window) requestIdleCallback(saveStats, { timeout: 1500 }); else setTimeout(saveStats, 0);
  }

  state.stats = loadStats();

  function shell(content) {
    app.innerHTML = `<div class="app"><header class="top"><div class="top-inner"><div class="brand">dMAT Practice<small>Unofficial • free • browser-based</small></div><nav class="nav"><button data-nav="home">Home</button><button data-nav="practice">Practice</button><button data-nav="mockSetup">Mock Test</button><button data-nav="about">About</button></nav></div></header><main class="container">${content}</main><footer class="footer">Unofficial educational practice tool. Not affiliated with or endorsed by the dMAT test provider. No account required.</footer></div>`;
    document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { if (b.dataset.nav === 'mockSetup') route('mockSetup'); else route(b.dataset.nav) });
  }
  function route(p) { state.page = p; render() }

  function render() {
    if (state.page === 'home') return renderHome();
    if (state.page === 'practice') return renderPracticeSetup();
    if (state.page === 'practiceRun') return renderPracticeRun();
    if (state.page === 'practiceResults') return renderPracticeResults();
    if (state.page === 'mockSetup') return renderMockSetup();
    if (state.page === 'mockRun') return renderMockRun();
    if (state.page === 'mockResults') return renderMockResults();
    if (state.page === 'privacy') return renderPolicy('privacy');
    if (state.page === 'terms') return renderPolicy('terms');
    if (state.page === 'about') return renderAbout();
  }

  function renderHome() {
    shell(`<section class="hero"><h1>Practice smarter for dMAT.</h1><p>Generate fresh Figure Sequence, Latin Square, Mathematical Equation and General Academic Subject questions directly in your browser. No account and no paid API are required.</p><div class="actions"><button class="btn primary" id="startPractice">Start Practice</button><button class="btn secondary" id="startMock">Start Full Mock Test</button></div></section><div class="grid"><div class="card"><h2>Practice mode</h2><p class="muted">Choose one task type, difficulty and number of questions. Generated questions are checked before display.</p><ul><li>Figure Sequences</li><li>Latin Squares</li><li>Mathematical Equations</li><li>Subject Module topics</li></ul></div><div class="card"><h2>Mock mode</h2><p class="muted">A fresh session is generated when you start. Core sections contain 20 questions each; the Subject Module is a separate 90-minute section.</p><p class="small muted">Timing follows the supplied dMAT preparation material: 25 minutes for each Core task type and 90 minutes for the Subject Module.</p></div></div><div class="card" style="margin-top:16px"><h3>Privacy-first by design</h3><p class="muted">The application has no login, no database, no passwords and no user profile. Practice data stays in browser storage. Hosting infrastructure can still process normal technical request data.</p><div class="actions"><button class="btn ghost" id="privacyBtn">Privacy</button><button class="btn ghost" id="termsBtn">Terms</button></div></div>`);
    document.getElementById('startPractice').onclick = () => route('practice');
    document.getElementById('startMock').onclick = () => route('mockSetup');
    document.getElementById('privacyBtn').onclick = () => route('privacy');
    document.getElementById('termsBtn').onclick = () => route('terms');
  }

  const typeMeta = {
    figure: { title: 'Figure Sequences', desc: 'Find the logical continuation of moving, rotating and changing shapes.' },
    latin: { title: 'Latin Squares', desc: 'Complete the highlighted cell while respecting row and column constraints.' },
    math: { title: 'Mathematical Equations', desc: 'Solve a generated system and identify the requested variable.' },
    subject: { title: 'Subject Module', desc: 'Read an academic input and answer single-choice application questions.' }
  };

  function renderPracticeSetup() {
    const type = state.practice.type;
    const topicOptions = window.Engine ? window.Engine.TAXONOMY : [];
    const topics = topicOptions.filter(n => !SUBJECTS.length || SUBJECTS.includes(n.subject));
    shell(`<div class="hero"><h1>Practice</h1><p>Choose exactly what you want to practise. Every new question is generated in your browser.</p></div>${type === 'subject' ? `<div class="notice"><strong>Subject Module practice notice:</strong> These are original generated training questions, not real dMAT exam questions. The topics and subject areas in the real exam may vary. Use this section to train your ability to understand and apply unfamiliar concepts — do not rely on these questions alone for the official dMAT.</div>` : ''}<div class="card"><h2>Question type</h2><div class="choice-grid">${Object.entries(typeMeta).map(([k, v]) => `<button class="choice ${type === k ? 'active' : ''}" data-type="${k}"><strong>${v.title}</strong><span>${v.desc}</span></button>`).join('')}</div><div class="form-grid" style="margin-top:14px"><div><label>Difficulty</label><select id="pDiff">${['random', ...DIFFS].map(x => `<option ${state.practice.difficulty === x ? 'selected' : ''} value="${x}">${x[0].toUpperCase() + x.slice(1)}</option>`).join('')}</select></div><div><label>Questions</label><select id="pCount">${[5, 10, 15, 20, 30].map(x => `<option ${state.practice.count === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>${type === 'subject' ? `<div><label>Topic</label><select id="pTopic"><option value="all">Random topic</option>${topics.map(n => `<option value="${esc(n.id)}" ${state.practice.topicId === n.id ? 'selected' : ''}>${esc(n.subject)} — ${esc(n.topic)} — ${esc(n.concept)}</option>`).join('')}</select></div>` : ''}<label>Question timer</label><select id="pTimer"><option value="on" ${state.practice.timer ? 'selected' : ''}>On</option><option value="off" ${!state.practice.timer ? 'selected' : ''}>Off</option></select><div class="actions" style="margin-top:16px"><button class="btn primary" id="beginPractice">Generate & Start</button><button class="btn ghost" id="backHome">Back</button></div></div>`);
    document.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { state.practice.type = b.dataset.type; renderPracticeSetup() });
    document.getElementById('pDiff').onchange = e => state.practice.difficulty = e.target.value;
    document.getElementById('pCount').onchange = e => state.practice.count = +e.target.value;
    document.getElementById('pTimer').onchange = e => state.practice.timer = e.target.value === 'on';
    document.getElementById('pTopic')?.addEventListener('change', e => state.practice.topicId = e.target.value);
    document.getElementById('beginPractice').onclick = startPractice;
    document.getElementById('backHome').onclick = () => route('home');
  }

  function makeSubjectPack(diff, count, topicId = 'all', seed = '') {
    const E = window.Engine; const eligible = E.TAXONOMY.filter(n => !topicId || topicId === 'all' || n.id === topicId);
    const node = eligible[Math.floor(Math.random() * eligible.length)];
    if (!node) throw Error('No subject topic available');
    const questions = []; let sourceText = '', topicMeta = null; let attempts = 0;
    while (questions.length < count && attempts < 30) { attempts++; const candidate = node.fn(diff, node.scenarios?.length ? node.scenarios[(attempts - 1) % node.scenarios.length] : null); if (!candidate) continue; sourceText = candidate.sourceText || sourceText; topicMeta = candidate; for (const q of candidate.questions || []) { if (questions.length >= count) break; questions.push({ ...q, _sourceText: candidate.sourceText || '', _topic: node.topic, _subject: node.subject, _generator: node.id }) } }
    if (questions.length < count) throw Error('Could not generate enough subject questions');
    return { kind: 'subject', difficulty: diff, topic: node, sourceText, questions: shuffle(questions) };
  }

  function genPracticeQuestions(type, diff, count) {
    const seed = cryptoSeed(); return withSeed(seed, () => {
      const arr = [];
      if (type === 'figure') for (let i = 0; i < count; i++)arr.push({ kind: type, data: window.DMATFigure.generateFigureQuestion(diff) });
      if (type === 'latin') for (let i = 0; i < count; i++)arr.push({ kind: type, data: window.DMATLatin.generateSafely(diff) });
      if (type === 'math') for (let i = 0; i < count; i++)arr.push({ kind: type, data: window.DMATMath.generateSafely(diff) });
      if (type === 'subject') return [makeSubjectPack(diff, count, state.practice.topicId, seed)];
      return arr;
    });
  }

  function startPractice() {
    try {
      state.practice.questions = genPracticeQuestions(state.practice.type, state.practice.difficulty, state.practice.count);
      if (state.practice.type === 'subject') { state.practice.subjectPack = state.practice.questions[0]; state.practice.questions = state.practice.subjectPack.questions.map(q => ({ kind: 'subject', data: q, source: q._sourceText, meta: state.practice.subjectPack.topic })); }
      state.practice.index = 0; state.practice.score = 0; state.practice.answered = false; state.practice.answers = []; state.practice.startedAt = now(); state.practice.deadline = state.practice.timer ? now() + questionTime(state.practice.type) : null; route('practiceRun');
    } catch (e) { alert('Question generation failed. Please try again.'); console.error(e) }
  }
  function questionTime(type) { return type === 'subject' ? 3 * 60 * 1000 : 90 * 1000 }

  function renderPracticeRun() {
    const p = state.practice, q = p.questions[p.index]; if (!q) return route('practice');
    shell(`<div class="sticky-test"><div><strong>Practice · ${esc(typeMeta[p.type].title)}</strong><div class="small muted">Question ${p.index + 1} of ${p.questions.length}</div></div><div class="timer" id="timer">${p.deadline ? fmtTime(p.deadline - now()) : '∞'}</div></div><div class="progress"><div style="width:${(p.index / p.questions.length) * 100}%"></div></div><div id="practiceQuestion"></div>`);
    renderQuestionInto(document.getElementById('practiceQuestion'), q, (result) => {
      p.score += result.correct ? 1 : 0;
      p.answers[p.index] = result;
      p.answered = true;
    }, { mode: 'practice', index: p.index, total: p.questions.length });
    if (p.deadline) startTimer(() => { if (!p.answered) finishPractice(true); }, p.deadline);
  }
  function finishPractice(timeUp = false) {
    clearInterval(activeTimer);
    const p = state.practice;
    if (!p.answers) p.answers = [];
    if (p.index < p.questions.length && !p.answers[p.index]) p.answers[p.index] = { correct: false, unanswered: true, answeredAt: now() };
    p.finishedAt = now();
    persistResultSummary({ mode: 'practice', type: p.type, total: p.questions.length, correct: p.score, finishedAt: p.finishedAt });
    route('practiceResults');
  }

  function renderQuestionInto(root, q, onAnswered, nav = {}) {
    const kind = q.kind, d = q.data; let html = '';
    if (kind === 'figure') html = renderFigure(d, nav.mode, nav);
    else if (kind === 'latin') html = renderLatin(d, nav.mode, nav);
    else if (kind === 'math') html = renderMath(d, nav.mode, nav);
    else html = renderSubjectQuestion(d, q.source, q.meta, nav.mode, nav);
    root.innerHTML = html;
    wireQuestion(root, q, onAnswered, nav);
  }

  function nextLabel(mode, index, total) {
    if (mode === 'mock') return index + 1 < total ? 'Next Question' : 'Finish Mock';
    return index + 1 < total ? 'Next' : 'Finish';
  }

  function renderFigure(q, mode = 'practice', nav = {}) {
    const grid = s => { let h = '<div class="fig-grid">'; for (let r = 0; r < 4; r++)for (let c = 0; c < 4; c++) { const o = s.find(x => x.row === r && x.col === c); if (!o) h += '<div class="fig-cell"></div>'; else { let shape = o.shape || 'square', rot = (o.rot || 0) * 90, style = `background:${FIG_COLORS[o.color % FIG_COLORS.length]};`; if (shape === 'circle') style += 'border-radius:50%;'; else if (shape === 'diamond') style += 'border-radius:3px;transform:rotate(45deg);'; else if (shape === 'triangle') style += `clip-path:polygon(50% 0%,0% 100%,100% 100%);transform:rotate(${rot}deg);`; else if (shape === 'wedge') style += `clip-path:polygon(0% 0%,100% 0%,0% 100%);transform:rotate(${rot}deg);`; else if (shape === 'chevron') style += `clip-path:polygon(0% 0%,45% 0%,45% 55%,100% 55%,100% 100%,0% 100%);transform:rotate(${rot}deg);`; h += `<div class="fig-cell"><div class="token" style="${style}"></div></div>` } } return h + '</div>' };
    return `<div class="card question"><div class="q-head"><span class="tag">${esc(q.difficulty.toUpperCase())}</span><span class="small muted">${q.numObjects} shape${q.numObjects > 1 ? 's' : ''}</span></div><h2>What are images 5 and 6?</h2><div class="fig-row">${q.given.map((s, i) => `<div class="fig-box"><div class="small muted">Image ${i + 1}</div>${grid(s)}</div>`).join('')}</div><div class="fig-row" style="justify-content:center;margin:10px 0"><div class="fig-grid" style="display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--brand)">?</div><div class="fig-grid" style="display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--brand)">?</div></div><h3>Choose the correct pair</h3><div class="fig-options">${q.options.map((o, i) => `<button class="fig-option option" data-index="${i}"><span class="letter">${String.fromCharCode(65 + i)}</span><div class="fig-pair">${grid(o[0])}${grid(o[1])}</div></button>`).join('')}</div><div id="qfeedback"></div><div class="actions" style="margin-top:14px"><button class="btn ghost" data-action="show">Show answer</button><button class="btn primary" data-action="next">${nextLabel(mode, nav.index ?? 0, nav.total ?? 2)}</button></div></div>`;
  }

  function renderLatin(q, mode = 'practice', nav = {}) {
    const cells = q.displayGrid.flat().map(v => v === '?' ? '<div class="q">?</div>' : `<div>${esc(v)}</div>`).join('');
    const opts = q.options.map((x, i) => `<button class="option" data-index="${i}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${esc(x)}</span></button>`).join('');
    return `<div class="card question"><div class="q-head"><span class="tag">${esc(q.difficulty.toUpperCase())}</span><span class="small muted">${q.blankCount} blanks</span></div><h2>Which letter belongs where the ? is?</h2><div class="latin">${cells}</div><div class="options">${opts}</div><div id="qfeedback"></div><div class="actions" style="margin-top:14px"><button class="btn ghost" data-action="show">Show answer</button><button class="btn primary" data-action="next">${nextLabel(mode, nav.index ?? 0, nav.total ?? 2)}</button></div></div>`;
  }

  function renderMath(q, mode = 'practice', nav = {}) {
    return `<div class="card question"><div class="q-head"><span class="tag">${esc(q.difficulty.toUpperCase())}</span><span class="small muted">Solve the system</span></div><div class="eqs">${q.equations.map(e => `<div class="eq">${esc(e)}</div>`).join('')}</div><h3 style="text-align:center">What number does ${esc(q.answerVar)} correspond to? (click on submit to submit your answer for the question)</h3><input id="mathAnswer" type="number" inputmode="numeric" placeholder="Enter answer"><div id="qfeedback"></div><div class="actions" style="margin-top:14px"><button class="btn secondary" data-action="submitMath">Submit</button><button class="btn ghost" data-action="show">Show answer</button><button class="btn primary" data-action="next">${nextLabel(mode, nav.index ?? 0, nav.total ?? 2)}</button></div></div>`;
  }

  function renderSubjectQuestion(q, source, meta, mode = 'practice', nav = {}) {
    return `<div class="card question"><div class="q-head"><span class="tag">${esc(meta?.subject || q._subject || 'Subject Module')}</span><span class="small muted">${esc(meta?.topic || q._topic || 'Topic')}</span></div><div class="small notice"><strong>Training only:</strong> original generated practice, not a real exam question. Real dMAT topics may vary.</div><details open><summary><strong>Input text</strong></summary><div class="subject-source">${source || ''}</div></details><p class="prompt">${esc(q.prompt)}</p><div class="options">${(q.options || []).map((o, i) => `<button class="option" data-index="${i}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${esc(o.text)}</span></button>`).join('')}</div><div id="qfeedback"></div><div class="actions" style="margin-top:14px"><button class="btn ghost" data-action="show">Show answer</button><button class="btn primary" data-action="next">${nextLabel(mode, nav.index ?? 0, nav.total ?? 2)}</button></div></div>`;
  }

  function explanationFor(q, correctIndex) {
    const d = q.data;
    if (q.kind === 'figure') return d.explanation || 'Track each shape from image to image. The correct pair preserves the same movement, colour and rotation rule into images 5 and 6.';
    if (q.kind === 'latin') return `Every row and every column must contain A–E exactly once. The highlighted cell must therefore be ${esc(d.correctLetter)}; the completed square below shows the full solution.`;
    if (q.kind === 'math') return d.explanation || `Using the equations together gives ${esc(d.answerVar)} = ${d.answerValue}. Substituting this value satisfies the displayed system.`;
    return d.explanation || `The correct option is ${String.fromCharCode(65 + correctIndex)} because it follows the information given in the input text.`;
  }

  function fullLatinGrid(grid, targetPos) {
    if (!grid) return '';
    const html = grid.flatMap((row, r) => row.map((v, c) => `<div class="${targetPos && targetPos[0] === r && targetPos[1] === c ? 'solution-target' : ''}">${esc(v)}</div>`)).join('');
    return `<div class="answer-reveal"><strong>Completed Latin square</strong><div class="latin solution-latin">${html}</div><p class="small muted">The highlighted cell is the answer to the question mark.</p></div>`;
  }

  function correctAnswerText(q) {
    const d = q.data;
    if (q.kind === 'math') return `${d.answerVar} = ${d.answerValue}`;
    if (q.kind === 'subject') {
      const opt = (d.options || []).find(o => o.id === d.correctId);
      return `${d.correctId}${opt ? ' — ' + opt.text : ''}`;
    }
    const idx = d.correctIndex;
    return String.fromCharCode(65 + idx);
  }
  function userAnswerText(q, result) {
    if (!result) return 'Not answered';
    if (result.revealed) return 'Show answer used';
    if (result.unanswered) return 'Not answered';
    if (q.kind === 'math') return result.selectedAnswer == null ? 'Not answered' : String(result.selectedAnswer);
    if (q.kind === 'subject') {
      const id = result.selectedAnswer;
      const opt = (q.data.options || []).find(o => o.id === id);
      return id ? (id + ' — ' + (opt?.text || '')) : 'Not answered';
    }
    return result.selectedAnswer != null ? String.fromCharCode(65 + result.selectedAnswer) : 'Not answered';
  }
  function reviewExplanation(q) {
    return explanationFor(q, q.kind === 'subject' ? (q.data.options || []).findIndex(o => o.id === q.data.correctId) : q.data.correctIndex);
  }
  function reviewQuestionCard(q, result, index) {
    const correct = !!result?.correct;
    const status = result?.revealed ? 'Answer revealed' : result?.unanswered ? 'Not answered' : correct ? 'Correct' : 'Incorrect';
    const cls = result?.revealed ? 'ok' : result?.unanswered ? '' : ' ' + (correct ? 'ok' : 'bad');
    let visual = '';
    if (q.kind === 'figure') {
      visual = `<details class="review-details"><summary>View question</summary>${renderFigureReviewVisual(q.data)}</details>`;
    } else if (q.kind === 'latin') {
      visual = `<details class="review-details"><summary>View question and completed square</summary>${renderLatinReviewVisual(q.data)}</details>`;
    } else if (q.kind === 'math') {
      visual = `<details class="review-details"><summary>View question</summary><div class="eqs">${q.data.equations.map(e => `<div class="eq">${esc(e)}</div>`).join('')}</div><p><strong>Asked:</strong> What number does ${esc(q.data.answerVar)} correspond to?</p></details>`;
    } else {
      visual = `<details class="review-details"><summary>View question</summary><p class="prompt">${esc(q.data.prompt)}</p><div class="options review-subject-options">${(q.data.options || []).map(o => `<div class="option ${o.id === q.data.correctId ? 'correct' : ''}"><span class="letter">${esc(o.id)}</span><span>${esc(o.text)}</span></div>`).join('')}</div><details open><summary>Input text</summary><div class="subject-source">${q.source || ''}</div></details></details>`;
    }
    return `<article class="review-card"><div class="review-head"><strong>Question ${index + 1}</strong><span class="review-status ${cls}">${status}</span></div>${visual}<div class="review-answer-grid"><div><span class="small muted">Your answer</span><strong>${esc(userAnswerText(q, result))}</strong></div><div><span class="small muted">Correct answer</span><strong>${esc(correctAnswerText(q))}</strong></div></div><div class="answer-explanation"><strong>Why</strong><p>${esc(reviewExplanation(q))}</p></div></article>`;
  }
  function renderFigureReviewVisual(q) {
    const grid = s => { let h = '<div class="fig-grid">'; for (let r = 0; r < 4; r++)for (let c = 0; c < 4; c++) { const o = s.find(x => x.row === r && x.col === c); if (!o) h += '<div class="fig-cell"></div>'; else { let shape = o.shape || 'square', rot = (o.rot || 0) * 90, style = `background:${FIG_COLORS[o.color % FIG_COLORS.length]};`; if (shape === 'circle') style += 'border-radius:50%;'; else if (shape === 'diamond') style += 'border-radius:3px;transform:rotate(45deg);'; else if (shape === 'triangle') style += `clip-path:polygon(50% 0%,0% 100%,100% 100%);transform:rotate(${rot}deg);`; else if (shape === 'wedge') style += `clip-path:polygon(0% 0%,100% 0%,0% 100%);transform:rotate(${rot}deg);`; else if (shape === 'chevron') style += `clip-path:polygon(0% 0%,45% 0%,45% 55%,100% 55%,100% 100%,0% 100%);transform:rotate(${rot}deg);`; h += `<div class="fig-cell"><div class="token" style="${style}"></div></div>` } } return h + '</div>' };
    const pair = (pair) => `<div class="fig-pair">${grid(pair[0])}${grid(pair[1])}</div>`;
    return `<div class="small muted">Given sequence</div><div class="fig-row">${q.given.map((s, i) => `<div class="fig-box"><div class="small muted">Image ${i + 1}</div>${grid(s)}</div>`).join('')}</div><div class="small muted" style="margin-top:8px">Answer options</div><div class="fig-options review-fig-options">${q.options.map((o, i) => `<div class="fig-option ${i === q.correctIndex ? 'correct' : ''}"><span class="letter">${String.fromCharCode(65 + i)}</span>${pair(o)}</div>`).join('')}</div>`;
  }

  function renderLatinReviewVisual(q) {
    const cells = q.displayGrid.flat().map(v => v === '?' ? '<div class="q">?</div>' : `<div>${esc(v)}</div>`).join('');
    return `<div class="latin">${cells}</div>${fullLatinGrid(q.solutionGrid, q.questionPos)}`;
  }

  function renderPracticeResults() {
    const p = state.practice; if (!p?.questions?.length) return route('practice');
    const total = p.questions.length, correct = p.score;
    const review = p.questions.map((q, i) => reviewQuestionCard(q, p.answers?.[i], i)).join('');
    shell(`<div class="hero"><h1>Practice complete</h1><p>Review every question below. Your generated questions remain in memory for this session only.</p></div><div class="card"><div class="result-score">${correct}/${total}</div><p class="muted">${Math.round(correct / total * 100)}% correct</p><div class="actions"><button class="btn primary" id="again">Practice again</button><button class="btn ghost" id="home">Home</button></div></div><div class="review-list">${review}</div>`);
    document.getElementById('again').onclick = () => route('practice'); document.getElementById('home').onclick = () => route('home');
  }

  function wireQuestion(root, q, onAnswered, nav = {}) {
    let answered = false;
    const fb = root.querySelector('#qfeedback');
    const buttons = [...root.querySelectorAll('.option')];
    const correctIndex = q.kind === 'figure' ? q.data.correctIndex : q.kind === 'latin' ? q.data.correctIndex : q.kind === 'subject' ? (q.data.options || []).findIndex(o => o.id === q.data.correctId) : -1;
    function next() {
      if (nav.mode === 'mock') { if (!answered) { answered = true; onAnswered({ correct: false, unanswered: true }); } if (typeof nav.next === 'function') nav.next(); return; }
      if (!answered) { answered = true; onAnswered({ correct: false, unanswered: true }); }
      state.practice.index++; state.practice.answered = false;
      if (state.practice.index >= state.practice.questions.length) finishPractice(); else renderPracticeRun();
    }
    function finishAnswer(idx) {
      if (answered) return;
      answered = true;
      const ok = q.kind === 'math' ? Number(root.querySelector('#mathAnswer').value) === q.data.answerValue : idx === correctIndex;
      if (q.kind !== 'math') buttons.forEach((b, i) => { if (i === correctIndex) b.classList.add('correct'); else if (i === idx) b.classList.add('wrong') });
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = ok ? '✓ Correct' : `✗ Incorrect — correct answer: ${q.kind === 'subject' ? q.data.correctId : String.fromCharCode(65 + correctIndex)}`;
      const rawMath = q.kind === 'math' ? root.querySelector('#mathAnswer').value.trim() : null;
      onAnswered({ correct: ok, selectedAnswer: q.kind === 'math' ? (rawMath === '' ? null : Number(rawMath)) : idx, answeredAt: now() });
    }
    buttons.forEach((b, i) => b.onclick = () => finishAnswer(i));
    root.querySelector('[data-action="submitMath"]')?.addEventListener('click', () => finishAnswer(-1));
    root.querySelector('[data-action="show"]')?.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const answer = q.kind === 'math' ? q.data.answerValue : q.kind === 'subject' ? q.data.correctId : String.fromCharCode(65 + correctIndex);
      let extra = `<div class="answer-explanation"><strong>Answer: ${esc(answer)}</strong><p>${explanationFor(q, correctIndex)}</p>${q.kind === 'latin' ? fullLatinGrid(q.data.solutionGrid, q.data.questionPos) : ''}</div>`;
      fb.className = 'feedback ok'; fb.innerHTML = extra;
      onAnswered({ correct: false, revealed: true, answeredAt: now() });
    });
    root.querySelector('[data-action="next"]')?.addEventListener('click', next);
  }

  let activeTimer = null; function startTimer(cb, deadline) { clearInterval(activeTimer); activeTimer = setInterval(() => { const el = document.getElementById('timer'); const left = deadline - now(); if (el) el.textContent = fmtTime(left); if (left <= 0) { clearInterval(activeTimer); cb() } }, 250); }

  function renderMockSetup() {
    shell(`<div class="hero"><h1>Full Mock Test</h1><p>Every session receives a fresh random seed. The question generators run locally, so different users can generate different sessions without a shared database.</p></div><div class="card"><h2>Mock configuration</h2><div class="notice">Core: 20 Figure Sequences + 20 Mathematical Equations + 20 Latin Squares. Subject Module: 30 generated questions across 3 topic packs. Core sections use 25 minutes each; Subject Module uses 90 minutes. The 30-minute break is optional in this simulator.</div><label>Difficulty</label><select id="mDiff"><option value="random">Random</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><label>30-minute break</label><select id="mBreak"><option value="on">Include break</option><option value="off">Skip break</option></select><div class="actions" style="margin-top:16px"><button class="btn primary" id="beginMock">Generate fresh mock</button><button class="btn ghost" id="backHome">Back</button></div></div>`);
    document.getElementById('beginMock').onclick = () => startMock(document.getElementById('mDiff').value, document.getElementById('mBreak').value === 'on'); document.getElementById('backHome').onclick = () => route('home');
  }

  function startMock(diff, includeBreak) {
    const seed = cryptoSeed(); let session;
    try {
      session = withSeed(seed, () => { const q = []; for (let i = 0; i < 20; i++)q.push({ kind: 'figure', data: window.DMATFigure.generateFigureQuestion(diff) }); for (let i = 0; i < 20; i++)q.push({ kind: 'math', data: window.DMATMath.generateSafely(diff) }); for (let i = 0; i < 20; i++)q.push({ kind: 'latin', data: window.DMATLatin.generateSafely(diff) }); for (let t = 0; t < 3; t++) { const pack = makeSubjectPack(diff, 10, 'all', seed + '-' + t); pack.questions.forEach(x => q.push({ kind: 'subject', data: x, source: x._sourceText || pack.sourceText, meta: pack.topic })) } return q });
    } catch (e) { console.error(e); alert('Could not generate the mock. Please try again.'); return }
    state.mock = { seed, diff, includeBreak, questions: session, index: 0, answers: [], section: 'figure', sectionStart: now(), deadline: now() + 25 * 60 * 1000, breakUsed: false, startedAt: now() }; route('mockRun');
  }

  function mockSection(index) { if (index < 20) return 'figure'; if (index < 40) return 'math'; if (index < 60) return 'latin'; return 'subject' }
  function sectionLabel(s) { return s === 'figure' ? 'Figure Sequences' : s === 'math' ? 'Mathematical Equations' : s === 'latin' ? 'Latin Squares' : 'Subject Module' }
  function sectionDuration(s) { return s === 'subject' ? 90 * 60 * 1000 : 25 * 60 * 1000 }

  function renderMockRun() {
    const m = state.mock; if (!m) return route('mockSetup');
    const q = m.questions[m.index]; m.section = mockSection(m.index);
    shell(`<div class="sticky-test"><div><strong>Mock · ${sectionLabel(m.section)}</strong><div class="small muted">Question ${m.index + 1} of ${m.questions.length}</div></div><div><div class="timer" id="timer">${fmtTime(m.deadline - now())}</div><div class="small muted">${m.section === 'subject' ? '90 min section' : '25 min section'}</div></div></div><div class="progress"><div style="width:${(m.index / m.questions.length) * 100}%"></div></div><div id="mockQuestion"></div>`);
    renderQuestionInto(document.getElementById('mockQuestion'), q, (result) => { m.answers[m.index] = { correct: result.correct, answeredAt: now(), revealed: !!result.revealed, unanswered: !!result.unanswered }; }, { mode: 'mock', index: m.index, total: m.questions.length, next: () => advanceMock(false) });
    startTimer(() => advanceMock(true), m.deadline);
  }

  function advanceMock(timeUp = false) {
    const m = state.mock; if (!m) return; clearInterval(activeTimer); if (!m.answers[m.index]) m.answers[m.index] = { correct: false, unanswered: true, answeredAt: now() };
    const next = m.index + 1; if (next >= m.questions.length) return finishMock();
    const currentSection = mockSection(m.index), nextSection = mockSection(next);
    if (currentSection !== nextSection) { if (m.includeBreak && !m.breakUsed && currentSection === 'latin' && nextSection === 'subject') { m.breakUsed = true; m.index = next; startBreak(); return } m.index = next; m.deadline = now() + sectionDuration(nextSection); renderMockRun(); return }
    m.index = next; renderMockRun();
  }
  function startBreak() { shell(`<div class="hero"><h1>Break</h1><p>The mock has completed the Core Module. The simulator is pausing for 30 minutes before the Subject Module.</p><div class="card"><div class="timer" id="timer">30:00</div><p class="muted">You may skip the break if you are practising under time pressure.</p><div class="actions"><button class="btn primary" id="skipBreak">Skip break</button></div></div></div>`); const end = now() + 30 * 60 * 1000; startTimer(() => { state.mock.deadline = now() + 90 * 60 * 1000; renderMockRun() }, end); document.getElementById('skipBreak').onclick = () => { clearInterval(activeTimer); state.mock.deadline = now() + 90 * 60 * 1000; renderMockRun() } }
  function finishMock() {
    clearInterval(activeTimer);
    const m = state.mock;
    m.finishedAt = now();
    const correct = m.answers.filter(x => x?.correct).length;
    persistResultSummary({ mode: 'mock', total: m.questions.length, correct, finishedAt: m.finishedAt, sections: { figure: m.answers.slice(0, 20).filter(x => x?.correct).length, math: m.answers.slice(20, 40).filter(x => x?.correct).length, latin: m.answers.slice(40, 60).filter(x => x?.correct).length, subject: m.answers.slice(60).filter(x => x?.correct).length } });
    route('mockResults');
  }

  function renderMockResults() {
    const m = state.mock; if (!m) return route('home');
    const groups = { figure: [0, 20], math: [20, 40], latin: [40, 60], subject: [60, m.questions.length] };
    let total = 0, correct = 0;
    const cards = Object.entries(groups).map(([k, [a, b]]) => { const c = m.answers.slice(a, b).filter(x => x?.correct).length; const t = b - a; correct += c; total += t; return `<div class="metric"><span class="small muted">${sectionLabel(k)}</span><strong>${c}/${t}</strong><span class="small muted">${Math.round(c / t * 100)}%</span></div>` }).join('');
    const review = m.questions.map((q, i) => reviewQuestionCard(q, m.answers?.[i], i)).join('');
    shell(`<div class="hero"><h1>Mock complete</h1><p>Review all ${total} questions below. Open any question to inspect it, your answer, the correct answer and the explanation.</p></div><div class="card"><div class="result-score">${correct}/${total}</div><p class="muted">Overall correct answers · ${Math.round(correct / total * 100)}%</p><div class="result-grid">${cards}</div><div class="notice" style="margin-top:14px"><strong>Subject Module reminder:</strong> These are original generated training questions, not real dMAT exam questions. Real exam topics can vary. Use them to practise applying unfamiliar concepts, not as a prediction of the official exam.</div><div class="actions" style="margin-top:18px"><button class="btn primary" id="newMock">New unique mock</button><button class="btn ghost" id="home">Home</button></div></div><div class="review-list">${review}</div>`);
    document.getElementById('newMock').onclick = () => route('mockSetup'); document.getElementById('home').onclick = () => route('home');
  }

  function renderAbout() { shell(`<div class="card policy"><h1>About this project</h1><p>This is an unofficial, free practice website built for educational preparation. It is not the official dMAT test platform.</p><h2>Generation</h2><p>The supplied local generators were adapted into a common browser application. New questions are procedurally generated rather than served from a shared question database.</p><h2>Source use</h2><p>The official preparation material is used as a reference for publicly stated task rules and timing. Official copyrighted questions, images and screenshots should not be republished here without permission.</p><div class="actions"><button class="btn ghost" id="p">Privacy</button><button class="btn ghost" id="t">Terms</button></div></div>`); document.getElementById('p').onclick = () => route('privacy'); document.getElementById('t').onclick = () => route('terms') }
  function renderPolicy(kind) { const privacy = kind === 'privacy'; shell(`<div class="card policy"><h1>${privacy ? 'Privacy Policy' : 'Terms & Disclaimer'}</h1>${privacy ? `<p><strong>Application data:</strong> this site does not require an account and is designed not to intentionally collect names, emails, passwords or personal profiles. Practice scores and preferences may be stored in your browser using localStorage.</p><p><strong>Hosting:</strong> the site is hosted on third-party infrastructure. Normal web requests can involve technical information such as IP address, browser/device information and server logs. Do not interpret this page as a promise that the hosting provider stores no technical data.</p><p><strong>Third parties:</strong> the application is designed without analytics, advertising pixels, payment services or AI APIs.</p><p><strong>Storage optimization:</strong> only small result summaries are saved, capped at the most recent 20 completed sessions. Generated questions, full mock question sets and explanations are not written to localStorage.</p><p><strong>Your control:</strong> clearing this site's browser storage removes locally stored practice summaries on that device.</p>` : `<p>This is an unofficial educational practice tool. It is not affiliated with, administered by, or endorsed by the dMAT test provider.</p><p>Generated questions are original training material, not real dMAT exam questions. In particular, Subject Module topics and subject areas may differ in the real exam. They are intended to train reasoning and transfer to unfamiliar concepts, not to predict the official exam. Do not rely on these questions alone for official dMAT preparation.</p><p>Use of this website does not replace the official preparation materials or official test instructions.</p><p>The site should not reproduce official copyrighted questions, figures, screenshots, logos or other protected material without appropriate permission.</p>`}<div class="actions"><button class="btn ghost" id="back">Back</button></div></div>`); document.getElementById('back').onclick = () => route('home') }

  // Override browser back to the setup page rather than losing the SPA state.
  window.addEventListener('popstate', render);
  render();
})();
