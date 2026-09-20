
(function(){
  "use strict";

  // ===================== Mathematical Equations generation logic =====================
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function choice(arr) { return arr[randInt(0, arr.length - 1)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const LETTERS = ['A', 'B', 'C', 'D'];
  function T(coef, v) { return { coef, v }; }
  function termValue(term, solution) { return term.v === null ? term.coef : term.coef * solution[term.v]; }
  function sumTerms(terms, solution) { return terms.reduce((acc, t) => acc + termValue(t, solution), 0); }

  function fmtTerm(term, isFirst) {
    const sign = term.coef < 0 ? '-' : '+';
    const absCoef = Math.abs(term.coef);
    let body;
    if (term.v === null) body = `${absCoef}`;
    else body = (absCoef === 1) ? `${term.v}` : `${absCoef} \u00D7 ${term.v}`;
    if (isFirst) return sign === '-' ? `-${body}` : `${body}`;
    return ` ${sign} ${body}`;
  }
  function fmtSide(terms) { return terms.map((t, i) => fmtTerm(t, i === 0)).join(''); }
  function makeLinearEquation(left, right) { return { left, right, display: `${fmtSide(left)} = ${fmtSide(right)}` }; }
  function makeDivEquation(xLetter, k, rightTerm) {
    const rightDisplay = rightTerm.v === null ? `${rightTerm.coef}` : rightTerm.v;
    return { _isDivDisplay: true, xLetter, k, rightTerm, display: `${xLetter} \u00F7 ${k} = ${rightDisplay}` };
  }
  function evalEquation(eq, solution) {
    if (eq._isDivDisplay) {
      const xVal = solution[eq.xLetter];
      const rhsVal = eq.rightTerm.v === null ? eq.rightTerm.coef : solution[eq.rightTerm.v];
      return { lhs: xVal, rhs: eq.k * rhsVal };
    }
    return { lhs: sumTerms(eq.left, solution), rhs: sumTerms(eq.right, solution) };
  }

  function kindAnchorPlus(newVar) {
    const newVal = randInt(1, 20); const c1 = randInt(1, 15); const c2 = c1 + newVal;
    return { eq: makeLinearEquation([T(c1, null), T(1, newVar)], [T(c2, null)]), newVal };
  }
  function kindAnchorConstMinusNew(newVar) {
    const newVal = randInt(1, 20); const c2 = randInt(1, 10); const c1 = c2 + newVal;
    return { eq: makeLinearEquation([T(c1, null), T(-1, newVar)], [T(c2, null)]), newVal };
  }
  function kindAnchorNewMinusConst(newVar) {
    const newVal = randInt(2, 20); const c1 = randInt(1, newVal - 1); const c2 = newVal - c1;
    return { eq: makeLinearEquation([T(1, newVar), T(-c1, null)], [T(c2, null)]), newVal };
  }
  function kindAnchorMultConst(newVar) {
    const k = randInt(2, 5); const newVal = randInt(1, 20); const c = k * newVal;
    return { eq: makeLinearEquation([T(k, newVar)], [T(c, null)]), newVal };
  }
  function kindAnchorDivConst(newVar) {
    const k = randInt(2, 5); const c = randInt(1, Math.floor(20 / k)); const newVal = c * k;
    return { eq: makeDivEquation(newVar, k, T(c, null)), newVal };
  }
  const ANCHOR_KINDS = [kindAnchorPlus, kindAnchorConstMinusNew, kindAnchorNewMinusConst, kindAnchorMultConst, kindAnchorDivConst];

  function kindVarPlusConst(newVar, known) {
    const kv = choice(known); if (kv.value >= 20) return null;
    const c = randInt(1, 20 - kv.value); const newVal = c + kv.value;
    return { eq: makeLinearEquation([T(c, null), T(1, kv.letter)], [T(1, newVar)]), newVal };
  }
  function kindVarMinusConst(newVar, known) {
    const kv = choice(known); if (kv.value < 2) return null;
    const c = randInt(1, kv.value - 1); const newVal = kv.value - c;
    return { eq: makeLinearEquation([T(1, kv.letter), T(-c, null)], [T(1, newVar)]), newVal };
  }
  function kindConstMinusVar(newVar, known) {
    const kv = choice(known); const newVal = randInt(1, 20); const c = kv.value + newVal;
    return { eq: makeLinearEquation([T(c, null), T(-1, kv.letter)], [T(1, newVar)]), newVal };
  }
  function kindMultVar(newVar, known) {
    const candidates = known.filter(kv => kv.value >= 1); if (candidates.length === 0) return null;
    const kv = choice(candidates); const maxK = Math.floor(20 / kv.value); if (maxK < 2) return null;
    const k = randInt(2, Math.min(4, maxK)); const newVal = k * kv.value;
    return { eq: makeLinearEquation([T(k, kv.letter)], [T(1, newVar)]), newVal };
  }
  function kindVarDivConst(newVar, known) {
    const options = [];
    for (const kv of known) for (let k = 2; k <= 5; k++) if (kv.value % k === 0 && kv.value / k >= 1) options.push({ kv, k });
    if (options.length === 0) return null;
    const { kv, k } = choice(options); const newVal = kv.value / k;
    return { eq: makeDivEquation(kv.letter, k, T(1, newVar)), newVal };
  }
  function kindTwoVarSum(newVar, known) {
    if (known.length < 2) return null;
    const [a, b] = shuffle(known).slice(0, 2); const newVal = a.value + b.value; if (newVal > 20) return null;
    return { eq: makeLinearEquation([T(1, a.letter), T(1, b.letter)], [T(1, newVar)]), newVal };
  }
  function kindTwoVarDiff(newVar, known) {
    if (known.length < 2) return null;
    let [a, b] = shuffle(known).slice(0, 2); if (a.value === b.value) return null;
    if (a.value < b.value) [a, b] = [b, a]; const newVal = a.value - b.value; if (newVal < 1) return null;
    return { eq: makeLinearEquation([T(1, a.letter), T(-1, b.letter)], [T(1, newVar)]), newVal };
  }
  function kindWeightedTwoVar(newVar, known) {
    if (known.length < 2) return null;
    const [a, b] = shuffle(known).slice(0, 2); const k1 = randInt(1, 3), k2 = randInt(1, 3);
    const newVal = k1 * a.value + k2 * b.value; if (newVal > 20 || newVal < 1) return null;
    return { eq: makeLinearEquation([T(k1, a.letter), T(k2, b.letter)], [T(1, newVar)]), newVal };
  }
  function kindMultVarMinusConst(newVar, known) {
    const kv = choice(known); const k = randInt(2, 4); const base = k * kv.value; if (base < 3) return null;
    const cMin = Math.max(1, base - 20); const cMax = Math.min(15, base - 1); if (cMin > cMax) return null;
    const c = randInt(cMin, cMax); const newVal = base - c; if (newVal < 1 || newVal > 20) return null;
    return { eq: makeLinearEquation([T(k, kv.letter), T(-c, null)], [T(1, newVar)]), newVal };
  }
  function kindThreeVarMix(newVar, known) {
    if (known.length < 3) return null;
    const [a, b, c] = shuffle(known).slice(0, 3); const newVal = a.value - b.value + c.value;
    if (newVal < 1 || newVal > 20) return null;
    return { eq: makeLinearEquation([T(1, a.letter), T(-1, b.letter), T(1, c.letter)], [T(1, newVar)]), newVal };
  }

  const CHAIN_KINDS_SIMPLE = [kindVarPlusConst, kindVarMinusConst, kindConstMinusVar, kindMultVar, kindVarDivConst];
  const CHAIN_KINDS_COMBO = [kindTwoVarSum, kindTwoVarDiff, kindWeightedTwoVar, kindMultVarMinusConst];
  const CHAIN_KINDS_HARD_EXTRA = [kindThreeVarMix];

  function guaranteedFallback(newVar, known) {
    const kv = known[0];
    if (kv.value < 20) {
      const c = randInt(1, 20 - kv.value); const newVal = c + kv.value;
      return { eq: makeLinearEquation([T(c, null), T(1, kv.letter)], [T(1, newVar)]), newVal };
    } else {
      const c = randInt(1, kv.value - 1); const newVal = kv.value - c;
      return { eq: makeLinearEquation([T(1, kv.letter), T(-c, null)], [T(1, newVar)]), newVal };
    }
  }

  function generateOneEquation(newVar, known, difficulty, isFirst) {
    if (isFirst) {
      const kind = choice(ANCHOR_KINDS);
      let res = kind(newVar);
      if (!res) res = kindAnchorPlus(newVar);
      return res;
    }
    let pool = CHAIN_KINDS_SIMPLE.slice();
    if (difficulty === 'medium' || difficulty === 'hard') pool = pool.concat(CHAIN_KINDS_COMBO);
    if (difficulty === 'hard') pool = pool.concat(CHAIN_KINDS_HARD_EXTRA);
    const shuffledPool = shuffle(pool);
    for (const kind of shuffledPool) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const res = kind(newVar, known);
        if (res) return res;
      }
    }
    return guaranteedFallback(newVar, known);
  }

  function difficultyVarCount(difficulty) {
    if (difficulty === 'easy') return 2;
    if (difficulty === 'medium') return 3;
    return 4;
  }

  function generateEquationSystem(difficultyParam) {
    const difficulty = difficultyParam === 'random' ? choice(['easy', 'medium', 'hard']) : difficultyParam;
    const n = difficultyVarCount(difficulty);
    const vars = LETTERS.slice(0, n);
    const solution = {}; const known = []; const equations = [];

    for (let i = 0; i < n; i++) {
      const newVar = vars[i];
      const { eq, newVal } = generateOneEquation(newVar, known, difficulty, i === 0);
      solution[newVar] = newVal; known.push({ letter: newVar, value: newVal }); equations.push(eq);
    }

    // Validation: recompute both sides of every displayed equation from the claimed
    // solution and require exact equality before this question is ever shown.
    for (const eq of equations) {
      const { lhs, rhs } = evalEquation(eq, solution);
      if (lhs !== rhs) throw new Error('Equation validation failed, regenerating');
    }
    for (const v of vars) {
      if (!Number.isInteger(solution[v]) || solution[v] < 1 || solution[v] > 20) throw new Error('Out of range, regenerating');
    }

    const displayEquations = shuffle(equations.map(e => e.display));
    const answerVar = choice(vars);
    const explanation = `Solve the equations step by step to determine each variable. The requested variable ${answerVar} evaluates to ${solution[answerVar]}, and substituting these values satisfies the complete system.`;
    return { difficulty, vars, equations: displayEquations, solution, answerVar, answerValue: solution[answerVar], explanation };
  }

  function generateSafely(difficulty) {
    for (let i = 0; i < 25; i++) {
      try { return generateEquationSystem(difficulty); } catch (e) { /* retry */ }
    }
    // should never happen, but final fallback:
    return generateEquationSystem('easy');
  }

  // ===================== App state / UI =====================
  let currentQuestion = null;
  let answered = false;
  let score = { correct: 0, total: 0, streak: 0 };


  window.DMATMath = { generateSafely: generateSafely };

})();
