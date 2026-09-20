
(function(){
  "use strict";

  // ===================== Latin Squares generation logic =====================
  const N = 5;
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function choice(arr) { return arr[randInt(0, arr.length - 1)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function generateLatinSquare() {
    const base = shuffle([0, 1, 2, 3, 4]);
    let grid = [];
    for (let r = 0; r < N; r++) {
      const row = [];
      for (let c = 0; c < N; c++) row.push(base[(c + r) % N]);
      grid.push(row);
    }
    const rowPerm = shuffle([0, 1, 2, 3, 4]);
    grid = rowPerm.map(r => grid[r]);
    const colPerm = shuffle([0, 1, 2, 3, 4]);
    grid = grid.map(row => colPerm.map(c => row[c]));
    const symPerm = shuffle([0, 1, 2, 3, 4]);
    grid = grid.map(row => row.map(v => symPerm[v]));
    return grid;
  }

  function validateLatinSquare(grid) {
    for (let r = 0; r < N; r++) if (new Set(grid[r]).size !== N) return false;
    for (let c = 0; c < N; c++) {
      const seen = new Set();
      for (let r = 0; r < N; r++) seen.add(grid[r][c]);
      if (seen.size !== N) return false;
    }
    return true;
  }

  function propagateSolve(givenMask, solutionGrid) {
    const result = [];
    for (let r = 0; r < N; r++) {
      result.push([]);
      for (let c = 0; c < N; c++) result[r].push(givenMask[r][c] ? solutionGrid[r][c] : null);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (result[r][c] !== null) continue;
          const rowUsed = new Set(result[r].filter(v => v !== null));
          const colUsed = new Set();
          for (let rr = 0; rr < N; rr++) if (result[rr][c] !== null) colUsed.add(result[rr][c]);
          const candidates = [];
          for (let v = 0; v < N; v++) if (!rowUsed.has(v) && !colUsed.has(v)) candidates.push(v);
          if (candidates.length === 1) { result[r][c] = candidates[0]; changed = true; }
          else if (candidates.length === 0) return { result, fullySolved: false, contradiction: true };
        }
      }
    }
    const fullySolved = result.every(row => row.every(v => v !== null));
    return { result, fullySolved, contradiction: false };
  }

  function difficultyBlankRange(difficulty) {
    if (difficulty === 'easy') return [7, 9];
    if (difficulty === 'medium') return [10, 13];
    return [14, 18];
  }

  function generateLatinPuzzle(difficultyParam) {
    const difficulty = difficultyParam === 'random' ? choice(['easy', 'medium', 'hard']) : difficultyParam;
    let attempt = 0;
    while (attempt < 60) {
      attempt++;
      const solutionGrid = generateLatinSquare();
      if (!validateLatinSquare(solutionGrid)) continue;

      const [minBlank, maxBlank] = difficultyBlankRange(difficulty);
      const targetBlanks = randInt(minBlank, maxBlank);

      const givenMask = [];
      for (let r = 0; r < N; r++) givenMask.push(new Array(N).fill(true));

      let hiddenCount = 0;
      const positions = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) positions.push([r, c]);

      for (let pass = 0; pass < 4 && hiddenCount < targetBlanks; pass++) {
        const order = shuffle(positions);
        for (const [r, c] of order) {
          if (hiddenCount >= targetBlanks) break;
          if (!givenMask[r][c]) continue;
          givenMask[r][c] = false;
          const { fullySolved } = propagateSolve(givenMask, solutionGrid);
          if (fullySolved) hiddenCount++;
          else givenMask[r][c] = true;
        }
      }

      if (hiddenCount < minBlank) continue;

      const finalCheck = propagateSolve(givenMask, solutionGrid);
      if (!finalCheck.fullySolved) continue;

      const hiddenPositions = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!givenMask[r][c]) hiddenPositions.push([r, c]);
      if (hiddenPositions.length === 0) continue;

      const [qr, qc] = choice(hiddenPositions);
      const correctValue = solutionGrid[qr][qc];
      const correctLetter = LETTERS[correctValue];

      const displayGrid = [];
      for (let r = 0; r < N; r++) {
        const row = [];
        for (let c = 0; c < N; c++) {
          if (r === qr && c === qc) row.push('?');
          else if (givenMask[r][c]) row.push(LETTERS[solutionGrid[r][c]]);
          else row.push('');
        }
        displayGrid.push(row);
      }

      // Independent re-verification: solve purely from the displayed grid (letters only),
      // with no reference to the internal solution, and confirm the deduced answer matches.
      const verify = independentSolveFromDisplay(displayGrid);
      if (!verify.solved || verify.grid[qr][qc] !== correctValue) continue;

      const wrongLetters = shuffle(LETTERS.filter(l => l !== correctLetter)).slice(0, 3);
      const options = shuffle([correctLetter, ...wrongLetters]);
      const correctIndex = options.indexOf(correctLetter);

      return { difficulty, displayGrid, solutionGrid: solutionGrid.map(row => row.map(v => LETTERS[v])), questionPos: [qr, qc], correctLetter, options, correctIndex, blankCount: hiddenCount };
    }
    throw new Error('Failed to generate a valid Latin square puzzle');
  }

  // Independent solver used purely as a final validation pass, working only from
  // the letters/blanks that will actually be displayed (closes the loop between
  // displayed question -> correct answer -> answer checker).
  function independentSolveFromDisplay(displayGrid) {
    const grid = [];
    for (let r = 0; r < N; r++) {
      grid.push(displayGrid[r].map(cell => (cell === '' || cell === '?') ? null : LETTERS.indexOf(cell)));
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (grid[r][c] !== null) continue;
          const rowUsed = new Set(grid[r].filter(v => v !== null));
          const colUsed = new Set();
          for (let rr = 0; rr < N; rr++) if (grid[rr][c] !== null) colUsed.add(grid[rr][c]);
          const cands = [];
          for (let v = 0; v < N; v++) if (!rowUsed.has(v) && !colUsed.has(v)) cands.push(v);
          if (cands.length === 1) { grid[r][c] = cands[0]; changed = true; }
          else if (cands.length === 0) return { solved: false, grid };
        }
      }
    }
    return { solved: grid.every(row => row.every(v => v !== null)), grid };
  }

  function generateSafely(difficulty) {
    for (let i = 0; i < 15; i++) {
      try { return generateLatinPuzzle(difficulty); } catch (e) { /* retry */ }
    }
    return generateLatinPuzzle('easy');
  }

  // ===================== App state / UI =====================
  let currentQuestion = null;
  let answered = false;
  let score = { correct: 0, total: 0, streak: 0 };


  window.DMATLatin = { generateSafely: generateSafely };

})();
