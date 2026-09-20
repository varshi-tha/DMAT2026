
(function(){
  "use strict";

  // ===================== Figure Sequences generation logic =====================
  const GRID = 4;
  const BORDER = (() => {
    const cells = [];
    for (let c = 0; c < GRID; c++) cells.push([0, c]);
    for (let r = 1; r < GRID; r++) cells.push([r, GRID - 1]);
    for (let c = GRID - 2; c >= 0; c--) cells.push([GRID - 1, c]);
    for (let r = GRID - 2; r >= 1; r--) cells.push([r, 0]);
    return cells;
  })();

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function choice(arr) { return arr[randInt(0, arr.length - 1)]; }

  function posFromLine(axis, fixedIndex, pos) {
    return axis === 'row' ? { row: fixedIndex, col: pos } : { row: pos, col: fixedIndex };
  }

  function pickMovement(difficulty) {
    const type = choice(['lineBounce', 'diagBounce', 'border']);
    // Chance that this shape's movement accelerates by +1 unit-step each
    // transition (1 step, then 2, then 3...), per the exam's x+1 rule.
    const accelChance = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 0.22 : 0.4;
    const incrementStep = Math.random() < accelChance;
    if (type === 'lineBounce') {
      return { type, axis: choice(['row', 'col']), fixedIndex: randInt(0, GRID - 1),
        startPos: randInt(0, GRID - 1), dir: choice([1, -1]), incrementStep };
    }
    if (type === 'diagBounce') {
      return { type, startRow: randInt(0, GRID - 1), startCol: randInt(0, GRID - 1),
        dr: choice([1, -1]), dc: choice([1, -1]), incrementStep };
    }
    // border: travels around the 12-cell perimeter
    const stepSize = incrementStep ? 1 : (difficulty === 'easy' ? 1 : choice([1, 2]));
    return { type, startIdx: randInt(0, 11), dir: choice([1, -1]), incrementStep, stepSize };
  }

  function initSnap(movement) {
    if (movement.type === 'lineBounce') return { pos: movement.startPos, dir: movement.dir };
    if (movement.type === 'diagBounce') return { row: movement.startRow, col: movement.startCol, dr: movement.dr, dc: movement.dc };
    return { idx: movement.startIdx, dir: movement.dir };
  }

  // Advances a shape by exactly one grid unit, respecting bounce/wrap rules.
  function unitStep(movement, snap) {
    if (movement.type === 'lineBounce') {
      let { pos, dir } = snap;
      let next = pos + dir;
      if (next < 0 || next > GRID - 1) { dir = -dir; next = pos + dir; }
      return { pos: next, dir };
    }
    if (movement.type === 'diagBounce') {
      let { row, col, dr, dc } = snap;
      let nr = row + dr, nc = col + dc;
      if (nr < 0 || nr > GRID - 1) { dr = -dr; nr = row + dr; }
      if (nc < 0 || nc > GRID - 1) { dc = -dc; nc = col + dc; }
      return { row: nr, col: nc, dr, dc };
    }
    // border: step one cell around the 12-cell perimeter
    let { idx, dir } = snap;
    const nidx = ((idx + dir) % 12 + 12) % 12;
    return { idx: nidx, dir };
  }

  // A transition can move a shape by more than one unit: a fixed stepSize
  // (border-only) or, for any movement type, an accelerating x+1 count
  // (transitionIndex = 1 on image1→2, 2 on image2→3, ... 5 on image5→6).
  function stepOnce(movement, snap, transitionIndex) {
    let count;
    if (movement.type === 'border' && !movement.incrementStep) count = movement.stepSize;
    else if (movement.incrementStep) count = transitionIndex;
    else count = 1;
    let cur = snap;
    for (let i = 0; i < count; i++) cur = unitStep(movement, cur);
    return cur;
  }

  function snapToCell(movement, snap) {
    if (movement.type === 'lineBounce') return posFromLine(movement.axis, movement.fixedIndex, snap.pos);
    if (movement.type === 'diagBounce') return { row: snap.row, col: snap.col };
    const [r, c] = BORDER[snap.idx];
    return { row: r, col: c };
  }

  function simulateFull(movement) {
    const snaps = [initSnap(movement)];
    for (let k = 1; k <= 5; k++) snaps.push(stepOnce(movement, snaps[k - 1], k));
    return snaps;
  }

  function simulateAttributes(attrs) {
    let color = attrs.startColor, rot = attrs.startRotation;
    const colors = [color], rots = [rot];
    for (let t = 2; t <= 6; t++) {
      const k = t - 1; // transition index 1..5
      if (attrs.colorChange) { const step = attrs.colorAccelerate ? k : 1; color = (color + step) % attrs.colorPaletteLen; }
      if (attrs.rotationChange) { const step = attrs.rotationAccelerate ? k : 1; rot = (rot + step) % 4; }
      colors.push(color); rots.push(rot);
    }
    return { colors, rots };
  }

  function serializeState(s) { return `${s.row},${s.col},${s.color},${s.rot},${s.shape||''}`; }
  function makeState(cell, color, rot) { return { row: cell.row, col: cell.col, color, rot }; }
  function randomFallbackState(colorPaletteLen) {
    return { row: randInt(0, GRID - 1), col: randInt(0, GRID - 1), color: randInt(0, colorPaletteLen - 1), rot: randInt(0, 3) };
  }
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = randInt(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }

  // ---- multi-object (multi-shape) support ----
  const DIFFICULTY_OBJECT_COUNT = { easy: 1, medium: 2, hard: 3, expert: 4 };

  // Rotation is only visually perceptible on an asymmetric silhouette, so we
  // keep a pool of "rotatable" shapes distinct from plain symmetric ones.
  // With 3 rotatable + 3 static shapes, any number of shapes up to 4 can be
  // assigned without a repeat, and up to 3 shapes can rotate at once in the
  // same question.
  const STATIC_SHAPES = ['circle', 'square', 'diamond'];
  const ROTATABLE_SHAPES = ['triangle', 'wedge', 'chevron'];
  const ALL_SHAPES = STATIC_SHAPES.concat(ROTATABLE_SHAPES);

  // Decide colour/rotation-change rules per shape, and whether each change
  // accelerates by +1 step per transition (the exam's x+1 rule).
  function pickAttributesSet(difficulty, numObjects) {
    const colorPaletteLen = 3;
    const attrsList = [];
    for (let i = 0; i < numObjects; i++) {
      attrsList.push({
        colorChange: false, rotationChange: false,
        colorAccelerate: false, rotationAccelerate: false,
        colorPaletteLen, startColor: randInt(0, colorPaletteLen - 1), startRotation: randInt(0, 3)
      });
    }
    if (difficulty === 'medium') {
      const idx = randInt(0, numObjects - 1);
      if (Math.random() < 0.5) attrsList[idx].colorChange = true; else attrsList[idx].rotationChange = true;
      if (Math.random() < 0.22) {
        if (attrsList[idx].colorChange) attrsList[idx].colorAccelerate = true;
        if (attrsList[idx].rotationChange) attrsList[idx].rotationAccelerate = true;
      }
    } else if (difficulty === 'hard' || difficulty === 'expert') {
      for (let i = 0; i < numObjects; i++) {
        if (Math.random() < 0.5) attrsList[i].colorChange = true;
        if (Math.random() < 0.45) attrsList[i].rotationChange = true;
      }
      // Cap concurrent rotators at the number of rotatable shapes available.
      let rotIdxs = attrsList.map((a, i) => a.rotationChange ? i : -1).filter(i => i >= 0);
      if (rotIdxs.length > ROTATABLE_SHAPES.length) {
        shuffleArray(rotIdxs);
        rotIdxs.slice(ROTATABLE_SHAPES.length).forEach(i => { attrsList[i].rotationChange = false; attrsList[i].colorChange = true; });
      }
      for (let i = 0; i < numObjects; i++) {
        if (attrsList[i].colorChange && Math.random() < 0.35) attrsList[i].colorAccelerate = true;
        if (attrsList[i].rotationChange && Math.random() < 0.35) attrsList[i].rotationAccelerate = true;
      }
      if (!attrsList.some(a => a.colorChange || a.rotationChange)) {
        attrsList[randInt(0, numObjects - 1)].colorChange = true;
      }
    }
    return attrsList;
  }

  // Give every shape in the question a distinct silhouette so it can be
  // tracked across images regardless of colour changes. Shapes that rotate
  // always get an asymmetric (rotatable) silhouette.
  function assignShapes(attrsList) {
    const shapes = new Array(attrsList.length);
    const rotIdxs = attrsList.map((a, i) => a.rotationChange ? i : -1).filter(i => i >= 0);
    const rotPool = shuffleArray(ROTATABLE_SHAPES.slice());
    rotIdxs.forEach((idx, k) => { shapes[idx] = rotPool[k]; });
    const used = new Set(shapes.filter(Boolean));
    const remaining = shuffleArray(ALL_SHAPES.filter(s => !used.has(s)));
    let p = 0;
    for (let i = 0; i < shapes.length; i++) { if (!shapes[i]) shapes[i] = remaining[p++]; }
    return shapes;
  }

  function computeObjectFull(movement, attrs) {
    const snaps = simulateFull(movement); // index 0..5 -> image 1..6
    const cells = snaps.map(s => snapToCell(movement, s));
    const { colors, rots } = simulateAttributes(attrs);
    const states = cells.map((c, i) => makeState(c, colors[i], rots[i]));
    return { movement, attrs, snaps, cells, colors, rots, states };
  }

  function buildObjects(difficulty, numObjects) {
    const attrsList = pickAttributesSet(difficulty, numObjects);
    const shapes = assignShapes(attrsList);
    const objects = [];
    for (let i = 0; i < numObjects; i++) {
      const movement = pickMovement(difficulty);
      const full = computeObjectFull(movement, attrsList[i]);
      objects.push({ ...full, shape: shapes[i] });
    }
    return objects;
  }

  function hasCollision(objects) {
    for (let t = 0; t < 6; t++) {
      const seen = new Set();
      for (const obj of objects) {
        const key = obj.cells[t].row + ',' + obj.cells[t].col;
        if (seen.has(key)) return true;
        seen.add(key);
      }
    }
    return false;
  }

  // Same alternative-continuation strategies as before (reversed direction,
  // one extra step, swapped 5/6, frozen attribute), but scoped to a single object
  // so they can be mixed-and-matched across shapes for distractor options.
  function computeObjectCandidates(o) {
    const { movement, attrs, snaps, cells, colors, rots } = o;
    const candidates = [];
    {
      const flipped = { ...snaps[3] };
      if (flipped.dir !== undefined) flipped.dir = -flipped.dir;
      if (flipped.dr !== undefined) { flipped.dr = -flipped.dr; flipped.dc = -flipped.dc; }
      const a5 = stepOnce(movement, flipped, 4);
      const a6 = stepOnce(movement, a5, 5);
      const c5 = snapToCell(movement, a5), c6 = snapToCell(movement, a6);
      candidates.push([makeState(c5, colors[4], rots[4]), makeState(c6, colors[5], rots[5])]);
    }
    {
      const mid = stepOnce(movement, snaps[3], 4);
      const c5s = stepOnce(movement, mid, 4);
      const c6s = stepOnce(movement, c5s, 5);
      const c5 = snapToCell(movement, c5s), c6 = snapToCell(movement, c6s);
      candidates.push([makeState(c5, colors[4], rots[4]), makeState(c6, colors[5], rots[5])]);
    }
    candidates.push([makeState(cells[5], colors[5], rots[5]), makeState(cells[4], colors[4], rots[4])]);
    if (attrs.colorChange || attrs.rotationChange) {
      const fc5 = attrs.colorChange ? colors[3] : colors[4];
      const fc6 = attrs.colorChange ? colors[3] : colors[5];
      const fr5 = attrs.rotationChange ? rots[3] : rots[4];
      const fr6 = attrs.rotationChange ? rots[3] : rots[5];
      candidates.push([makeState(cells[4], fc5, fr5), makeState(cells[5], fc6, fr6)]);
    }
    return candidates;
  }


  function describeObjectRule(o) {
    const m = o.movement, a = o.attrs;
    let movement = '';
    if (m.type === 'lineBounce') movement = `moves along the ${m.axis === 'row' ? 'horizontal' : 'vertical'} line and bounces at the edge`;
    else if (m.type === 'diagBounce') movement = 'moves diagonally and bounces when it reaches an edge';
    else movement = `moves around the outer border ${m.dir === 1 ? 'clockwise' : 'counter-clockwise'}`;
    if (m.incrementStep) movement += ', increasing its movement by one step on each transition';
    else if (m.type === 'border' && m.stepSize > 1) movement += ` by ${m.stepSize} cells at a time`;
    const attrs = [];
    if (a.colorChange) attrs.push(a.colorAccelerate ? 'its colour changes by an increasing number of steps' : 'its colour changes each step');
    if (a.rotationChange) attrs.push(a.rotationAccelerate ? 'its rotation increases by an extra quarter-turn each step' : 'it rotates by a quarter-turn each step');
    return movement + (attrs.length ? '; ' + attrs.join(' and ') : '');
  }
  function serializeMulti(arr5, arr6) {
    return arr5.map(serializeState).join(';') + '|' + arr6.map(serializeState).join(';');
  }

  function generateFigureQuestion(difficultyParam) {
    const difficulty = difficultyParam === 'random'
      ? choice(['easy', 'medium', 'hard', 'expert'])
      : difficultyParam;
    const numObjects = DIFFICULTY_OBJECT_COUNT[difficulty] || 1;

    // Regenerate the whole shape set until no two shapes ever share a cell
    // across any of the six images (keeps every image readable).
    let objects;
    let guard = 0;
    do {
      objects = buildObjects(difficulty, numObjects);
      guard++;
    } while (hasCollision(objects) && guard < 100);

    const withShape = (state, shape) => ({ ...state, shape });

    const given = [0, 1, 2, 3].map(t => objects.map(o => withShape(o.states[t], o.shape)));
    const correct5 = objects.map(o => withShape(o.states[4], o.shape));
    const correct6 = objects.map(o => withShape(o.states[5], o.shape));
    const correctSerial = serializeMulti(correct5, correct6);

    const perObjectCandidates = objects.map(o => computeObjectCandidates(o));
    const candidatePairs = [];

    // Strategy A: every shape follows the same alternative rule at once.
    const maxAlt = Math.max(...perObjectCandidates.map(c => c.length));
    for (let k = 0; k < maxAlt; k++) {
      const s5 = objects.map((o, i) => withShape(perObjectCandidates[i][k % perObjectCandidates[i].length][0], o.shape));
      const s6 = objects.map((o, i) => withShape(perObjectCandidates[i][k % perObjectCandidates[i].length][1], o.shape));
      candidatePairs.push([s5, s6]);
    }

    // Strategy B: only one shape deviates from its correct rule (tests attention
    // to each individual shape rather than the whole picture).
    objects.forEach((o, i) => {
      perObjectCandidates[i].forEach(alt => {
        const s5 = objects.map((oo, j) => j === i ? withShape(alt[0], oo.shape) : withShape(oo.states[4], oo.shape));
        const s6 = objects.map((oo, j) => j === i ? withShape(alt[1], oo.shape) : withShape(oo.states[5], oo.shape));
        candidatePairs.push([s5, s6]);
      });
    });

    shuffleArray(candidatePairs);

    const usedSerials = new Set([correctSerial]);
    const distractors = [];
    for (const cand of candidatePairs) {
      const s = serializeMulti(cand[0], cand[1]);
      if (!usedSerials.has(s)) { usedSerials.add(s); distractors.push(cand); }
      if (distractors.length === 3) break;
    }
    let guard2 = 0;
    while (distractors.length < 3 && guard2 < 300) {
      guard2++;
      const r5 = objects.map(o => withShape(randomFallbackState(o.attrs.colorPaletteLen), o.shape));
      const r6 = objects.map(o => withShape(randomFallbackState(o.attrs.colorPaletteLen), o.shape));
      const s = serializeMulti(r5, r6);
      if (!usedSerials.has(s)) { usedSerials.add(s); distractors.push([r5, r6]); }
    }

    const options = [[correct5, correct6], ...distractors];
    const order = shuffleArray([0, 1, 2, 3]);
    const shuffledOptions = order.map(i => options[i]);
    const correctIndex = order.indexOf(0);

    const ruleText = objects.map((o, i) => `${o.shape}: ${describeObjectRule(o)}`).join('. ');
    return { difficulty, numObjects, given, options: shuffledOptions, correctIndex, explanation: `The correct continuation keeps the same rule for every shape. ${ruleText}. Therefore the correct pair is the one that applies these rules to images 5 and 6.` };
  }

  // ===================== Rendering =====================
  const COLORS = ['#c2185b', '#1e6fb8', '#2e7d32'];

  function shapeStyle(shape, rotIndex) {
    const rotDeg = (rotIndex || 0) * 90;
    if (shape === 'circle') return 'border-radius:50%;';
    if (shape === 'square') return 'border-radius:3px;';
    if (shape === 'diamond') return 'border-radius:3px; transform:rotate(45deg);';
    if (shape === 'triangle') return `clip-path:polygon(50% 0%,0% 100%,100% 100%); transform:rotate(${rotDeg}deg);`;
    if (shape === 'wedge') return `clip-path:polygon(0% 0%,100% 0%,0% 100%); transform:rotate(${rotDeg}deg);`;
    if (shape === 'chevron') return `clip-path:polygon(0% 0%,45% 0%,45% 55%,100% 55%,100% 100%,0% 100%); transform:rotate(${rotDeg}deg);`;
    return '';
  }

  // states: array of {row,col,color,rot,shape} — one entry per shape present in this image.
  function renderGrid(states, extraClass) {
    let html = `<div class="fig-grid ${extraClass||''}">`;
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const occ = states.find(s => s.row === r && s.col === c);
        if (occ) {
          const color = COLORS[occ.color % COLORS.length];
          html += `<div class="fig-cell"><div class="token" style="background:${color};${shapeStyle(occ.shape, occ.rot)}"></div></div>`;
        } else {
          html += `<div class="fig-cell"></div>`;
        }
      }
    }
    html += `</div>`;
    return html;
  }

  // ===================== App state / UI =====================
  let currentQuestion = null;
  let answered = false;
  let score = { correct: 0, total: 0, streak: 0 };


  window.DMATFigure = { generateFigureQuestion: generateFigureQuestion };

})();
