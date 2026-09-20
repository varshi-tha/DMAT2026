
/* ============================================================
   dMAT Subject Module (General Academic Module) — Engine
   Pure logic module: random generation, calculation, validation.
   No DOM access here so it can be unit-tested under Node.
   ============================================================ */
(function (root) {
  "use strict";

  /* ---------------- RNG helpers ---------------- */
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
  function pickN(arr, n) { const c = shuffle(arr.slice()); return c.slice(0, n); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function coinFlip(p) { return Math.random() < (p === undefined ? 0.5 : p); }

  function fmtNum(x) {
    if (Object.is(x, -0)) x = 0;
    let s = (Math.round(x * 100) / 100).toFixed(2);
    s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    return s;
  }
  function fmtInt(x) { return String(Math.round(x)); }

  /* Build a 4-option set from a correct text value + distractor text values.
     Ensures uniqueness (case/space-insensitive) and randomized position. */
  function buildOptions(correctText, distractorTexts) {
    const seen = new Set([norm(correctText)]);
    const finalDistractors = [];
    for (let d of distractorTexts) {
      let attempt = d;
      let tries = 0;
      while (seen.has(norm(attempt)) && tries < 6) {
        attempt = attempt + "\u200b"; // shouldn't normally trigger; safety valve
        tries++;
      }
      seen.add(norm(attempt));
      finalDistractors.push(attempt);
      if (finalDistractors.length === 3) break;
    }
    while (finalDistractors.length < 3) {
      // extremely defensive fallback, should not trigger with our generators
      const filler = correctText + " (alt " + finalDistractors.length + ")";
      finalDistractors.push(filler);
    }
    const items = shuffle([
      { text: correctText, correct: true },
      { text: finalDistractors[0], correct: false },
      { text: finalDistractors[1], correct: false },
      { text: finalDistractors[2], correct: false },
    ]);
    const ids = ["A", "B", "C", "D"];
    let correctId = null;
    const options = items.map((it, i) => {
      const id = ids[i];
      if (it.correct) correctId = id;
      return { id, text: it.text };
    });
    return { options, correctId };
  }
  function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, " "); }

  function numDistractors(correct, raws, unit) {
    unit = unit || "";
    const correctText = fmtNum(correct) + unit;
    const texts = raws.map((r) => fmtNum(r) + unit);
    return buildOptions(correctText, texts);
  }

  function q(type, prompt, optBundle, explanation) {
    return {
      type,
      prompt,
      options: optBundle.options,
      correctId: optBundle.correctId,
      explanation,
    };
  }

  /* ---------------- Validation ---------------- */
  function plainWordCount(html) {
    const text = String(html).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
    return text.split(/\s+/).filter(Boolean).length;
  }

  function validateTopic(t) {
    try {
      if (!t || !t.subject || !t.topicTitle || !t.sourceText) return false;
      const wc = plainWordCount(t.sourceText);
      if (wc < 150 || wc > 1400) return false;
      if (!Array.isArray(t.questions)) return false;
      if (t.questions.length < 5 || t.questions.length > 8) return false;
      for (const qq of t.questions) {
        if (!qq.prompt || typeof qq.prompt !== "string" || qq.prompt.trim().length < 5) return false;
        if (!Array.isArray(qq.options) || qq.options.length !== 4) return false;
        const ids = qq.options.map((o) => o.id);
        if (new Set(ids).size !== 4) return false;
        if (!["A", "B", "C", "D"].every((x) => ids.includes(x))) return false;
        const texts = qq.options.map((o) => norm(o.text));
        if (new Set(texts).size !== 4) return false;
        for (const o of qq.options) {
          if (o.text == null || /\bnan\b|\bundefined\b|\binfinity\b/i.test(String(o.text))) return false;
        }
        if (!qq.correctId || !ids.includes(qq.correctId)) return false;
        if (!qq.explanation || qq.explanation.trim().length < 15) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ============================================================
     Shared content pools
     ============================================================ */
  const NAMES = ["Alex", "Priya", "Jonas", "Mei", "Sofia", "Kwame", "Elena", "Daniel", "Yuki", "Omar", "Laila", "Tomas", "Ingrid", "Carlos", "Anya"];

  /* ============================================================
     1. MATHEMATICS — Descriptive statistics
     ============================================================ */
  function genMathStats(diff) {
    const contexts = [
      { label: "daily commute times", unit: "min", plural: "commute times", subject: "a group of office workers" },
      { label: "patient wait times at a clinic", unit: "min", plural: "wait times", subject: "a small clinic" },
      { label: "quiz scores", unit: "pts", plural: "scores", subject: "a first-year seminar" },
      { label: "package delivery times", unit: "hrs", plural: "delivery times", subject: "a regional courier" },
      { label: "weekly rainfall totals", unit: "mm", plural: "rainfall totals", subject: "a weather station" },
    ];
    const ctx = pick(contexts);
    const n = diff === "easy" ? 5 : diff === "medium" ? 6 : 7;
    const lo = diff === "easy" ? 8 : diff === "medium" ? 5 : 4;
    const hi = diff === "easy" ? 45 : diff === "medium" ? 70 : 95;
    let data = [];
    for (let i = 0; i < n; i++) data.push(randInt(lo, hi));
    // force at least one duplicate pair for interest (not required by any question, just realism)
    data[1] = data[0];
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const sorted = data.slice().sort((a, b) => a - b);
    const median = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const max = Math.max(...data), min = Math.min(...data);
    const range = max - min;

    const rows = data.map((v, i) => `<tr><td>${i + 1}</td><td>${v} ${ctx.unit}</td></tr>`).join("");
    const table = `<table class="table"><caption>Table 1. Recorded ${ctx.plural}</caption><thead><tr><th>Observation</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`;

    const sourceText = `
      <p>Descriptive statistics summarise the central tendency and spread of a dataset. The <strong>mean</strong> is the sum of all values divided by the number of observations. The <strong>median</strong> is the middle value once the data are sorted from smallest to largest (or the average of the two middle values when there is an even number of observations). The <strong>mode</strong> is the most frequently occurring value, and the <strong>range</strong> is the difference between the largest and the smallest value.</p>
      <p>The mean uses every observation in its calculation, which makes it sensitive to unusually large or small values (outliers). The median, in contrast, depends only on the position of values once they are ordered, so a single extreme value has little effect on it. When a dataset contains one or more extreme values, the median is generally considered a more robust summary of the "typical" observation than the mean.</p>
      <p>The relationship between the mean and the median also carries information about the shape of a distribution. If the mean is noticeably larger than the median, the dataset typically has a small number of unusually large values pulling the mean upward; this is called a right-skewed (positively skewed) distribution. If the mean is noticeably smaller than the median, the dataset is left-skewed (negatively skewed), usually because of unusually small values. When the mean and median are close to each other, the distribution is roughly symmetric.</p>
      <p>${ctx.subject[0].toUpperCase() + ctx.subject.slice(1)} recorded the following ${ctx.label} (in ${ctx.unit}), shown in Table 1.</p>
      ${table}
      <p>These summary statistics are often recalculated after new information becomes available, such as an additional observation or the removal of an unusual data point, which changes the sum and the number of observations used in the mean calculation.</p>
    `;

    const questions = [];

    questions.push(
      q(
        "calculation",
        `What is the mean of the ${n} recorded ${ctx.label} in Table 1?`,
        numDistractors(mean, [median, sum / (n - 1), (mean + range / 2)], " " + ctx.unit),
        `The mean is the sum of all values divided by the number of observations: (${data.join(" + ")}) ÷ ${n} = ${fmtNum(sum)} ÷ ${n} = ${fmtNum(mean)} ${ctx.unit}.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the median of the dataset?`,
        numDistractors(median, [mean, sorted[0], sorted[sorted.length - 1]], " " + ctx.unit),
        `To find the median, the ${n} values are sorted: ${sorted.join(", ")}. ${n % 2 === 1 ? `With an odd number of observations, the median is the middle value: ${fmtNum(median)} ${ctx.unit}.` : `With an even number of observations, the median is the average of the two middle values: (${sorted[n / 2 - 1]} + ${sorted[n / 2]}) ÷ 2 = ${fmtNum(median)} ${ctx.unit}.`}`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which measure of central tendency is generally the most affected by a single unusually extreme value in the dataset?`,
        buildOptions("The mean", ["The median", "The mode", "The range"]),
        `The mean is calculated using the sum of all values, so one very large or very small value shifts the sum — and therefore the mean — noticeably. The median only depends on which value is in the middle position after sorting, so it changes little in response to a single extreme value.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the range of the dataset?`,
        numDistractors(range, [max, min, mean], " " + ctx.unit),
        `The range is the difference between the largest and smallest recorded values: ${max} ${ctx.unit} − ${min} ${ctx.unit} = ${fmtNum(range)} ${ctx.unit}.`
      )
    );

    if (diff === "easy") {
      const k = randInt(2, 6);
      const newMean = mean + k;
      questions.push(
        q(
          "calculation",
          `Suppose every recorded value increases by a constant ${k} ${ctx.unit} (for example, due to a systematic measurement change). What would the new mean be?`,
          numDistractors(newMean, [mean, mean + k / 2, mean * k], " " + ctx.unit),
          `Adding the same constant to every value increases the mean by exactly that constant: ${fmtNum(mean)} ${ctx.unit} + ${k} ${ctx.unit} = ${fmtNum(newMean)} ${ctx.unit}.`
        )
      );
    } else if (diff === "medium") {
      const extra = max + randInt(10, 25);
      const newMean = (sum + extra) / (n + 1);
      questions.push(
        q(
          "calculation",
          `Suppose one additional observation of ${extra} ${ctx.unit} is added to the dataset. What would the new mean be (rounded to two decimals)?`,
          numDistractors(newMean, [(sum + extra) / n, mean, (sum + extra) / (n + 2)], " " + ctx.unit),
          `The new sum is ${fmtNum(sum)} + ${extra} = ${fmtNum(sum + extra)} ${ctx.unit}, now spread over ${n + 1} observations: ${fmtNum(sum + extra)} ÷ ${n + 1} = ${fmtNum(newMean)} ${ctx.unit}.`
        )
      );
    } else {
      const newSum = sum - max - min;
      const newMean = newSum / (n - 2);
      questions.push(
        q(
          "calculation",
          `Suppose both the largest and the smallest recorded values are removed from the dataset. What would the mean of the remaining observations be?`,
          numDistractors(newMean, [mean, newSum / n, newSum / (n - 1)], " " + ctx.unit),
          `Removing the largest (${max}) and smallest (${min}) values leaves a sum of ${fmtNum(sum)} − ${max} − ${min} = ${fmtNum(newSum)} ${ctx.unit}, spread over ${n - 2} remaining observations: ${fmtNum(newSum)} ÷ ${n - 2} = ${fmtNum(newMean)} ${ctx.unit}.`
        )
      );
    }

    const skewCorrect = mean - median > 0.05 ? "right-skewed (a few unusually large values pull the mean above the median)" : mean - median < -0.05 ? "left-skewed (a few unusually small values pull the mean below the median)" : "roughly symmetric (the mean and median are close to each other)";
    const skewDistractors = ["right-skewed (a few unusually large values pull the mean above the median)", "left-skewed (a few unusually small values pull the mean below the median)", "roughly symmetric (the mean and median are close to each other)"].filter((s) => s !== skewCorrect);
    questions.push(
      q(
        "interpretation",
        `In this dataset, the mean is ${fmtNum(mean)} ${ctx.unit} and the median is ${fmtNum(median)} ${ctx.unit}. Based on the relationship between these two values described in the text, how would the distribution best be described?`,
        buildOptions(skewCorrect.charAt(0).toUpperCase() + skewCorrect.slice(1), skewDistractors.slice(0, 3).map((s) => s.charAt(0).toUpperCase() + s.slice(1))),
        `The text explains that a mean noticeably above the median indicates right skew, a mean noticeably below the median indicates left skew, and similar values indicate a roughly symmetric distribution. Here the mean is ${fmtNum(mean)} and the median is ${fmtNum(median)}, which points to a ${skewCorrect} distribution.`
      )
    );

    return {
      topicTitle: `Descriptive Statistics: Analysing ${ctx.label.charAt(0).toUpperCase() + ctx.label.slice(1)}`,
      subject: "Mathematics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     2. MATHEMATICS — Linear cost/revenue functions (break-even)
     ============================================================ */
  function genMathBreakeven(diff) {
    const businesses = [
      { biz: "a small bakery", product: "custom cakes", verb: "bakes" },
      { biz: "a student-run workshop", product: "handmade candles", verb: "makes" },
      { biz: "a print shop", product: "custom posters", verb: "prints" },
      { biz: "a repair shop", product: "phone screen repairs", verb: "completes" },
      { biz: "a small design studio", product: "custom logos", verb: "delivers" },
    ];
    const b = pick(businesses);
    const F = randInt(diff === "easy" ? 200 : diff === "medium" ? 400 : 600, diff === "easy" ? 900 : diff === "medium" ? 1600 : 2600);
    const v = randInt(5, 20);
    const p = v + randInt(8, 25);
    const breakeven = F / (p - v);

    const sourceText = `
      <p>Many small businesses can model their finances with simple linear functions of the number of units produced, x. The <strong>total cost function</strong> combines a <strong>fixed cost</strong> F (costs that do not depend on how many units are produced, such as rent or equipment) with a <strong>variable cost</strong> v per unit (costs that scale with production, such as materials): Cost(x) = F + v·x.</p>
      <p>The <strong>total revenue function</strong> depends on the selling price p per unit: Revenue(x) = p·x. The <strong>profit function</strong> is the difference between revenue and cost: Profit(x) = Revenue(x) − Cost(x) = (p − v)·x − F.</p>
      <p>The quantity (p − v) is called the <strong>contribution margin</strong> per unit — the amount each additional unit contributes toward covering the fixed cost, after variable costs are paid. The <strong>break-even point</strong> x* is the number of units at which profit equals zero, found by solving (p − v)·x* − F = 0, which gives x* = F ÷ (p − v). Producing fewer units than x* results in a loss; producing more than x* results in a profit.</p>
      <p>${b.biz.charAt(0).toUpperCase() + b.biz.slice(1)} ${b.verb} ${b.product}. It has fixed costs of $${F} per month (rent and equipment). Each unit costs $${v} in materials and labour to produce (the variable cost), and each unit sells for $${p}.</p>
      <p>Because the cost and revenue functions are linear in x, the profit function is also linear, with the contribution margin (p − v) as its slope: each additional unit sold increases profit by the same fixed amount, (p − v) dollars, regardless of how many units have already been sold.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `Which expression correctly represents the shop's total cost function, Cost(x), for producing x units per month?`,
        buildOptions(`Cost(x) = ${F} + ${v}x`, [`Cost(x) = ${F}x + ${v}`, `Cost(x) = ${F} + ${p}x`, `Cost(x) = (${F} + ${v})x`]),
        `The cost function adds the fixed cost (which does not depend on x) to the variable cost per unit multiplied by the number of units: Cost(x) = F + v·x = ${F} + ${v}x.`
      )
    );
    questions.push(
      q(
        "calculation",
        `How many units must be sold per month to break even?`,
        numDistractors(breakeven, [F / p, F / v, (F + v) / p], " units"),
        `Break-even occurs where profit is zero: x* = F ÷ (p − v) = ${F} ÷ (${p} − ${v}) = ${F} ÷ ${p - v} = ${fmtNum(breakeven)} units.`
      )
    );
    const qty1 = diff === "easy" ? Math.round(breakeven) + randInt(5, 15) : Math.round(breakeven) - randInt(3, 10);
    const profit1 = p * qty1 - (F + v * qty1);
    questions.push(
      q(
        "calculation",
        `What is the shop's profit (or loss, shown as a negative number) in a month where it sells ${qty1} units?`,
        numDistractors(profit1, [p * qty1 - F, (p - v) * qty1, p * qty1], "$".length ? "" : ""),
        `Profit(x) = (p − v)·x − F = (${p} − ${v}) × ${qty1} − ${F} = ${p - v} × ${qty1} − ${F} = ${fmtNum((p - v) * qty1)} − ${F} = ${fmtNum(profit1)}. ${profit1 < 0 ? "This is a loss because it is below the break-even quantity." : "This is a profit because it exceeds the break-even quantity."}`
      )
    );

    if (diff !== "easy") {
      const target = randInt(500, 2500);
      const neededQty = (F + target) / (p - v);
      questions.push(
        q(
          "calculation",
          `How many units would need to be sold in a month for the shop to earn a target profit of $${target}?`,
          numDistractors(neededQty, [target / (p - v), (F + target) / p, (F - target) / (p - v)], " units"),
          `Setting profit equal to the target: (p − v)·x − F = ${target}, so x = (F + target) ÷ (p − v) = (${F} + ${target}) ÷ ${p - v} = ${fmtNum(F + target)} ÷ ${p - v} = ${fmtNum(neededQty)} units.`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `What does the value (p − v) represent in the profit function?`,
          buildOptions("The contribution margin: how much each additional unit adds to profit", ["The total monthly profit", "The fixed cost per month", "The break-even quantity"]),
          `As defined in the text, (p − v) is the contribution margin per unit — the amount each unit contributes toward covering fixed costs and, beyond the break-even point, toward profit.`
        )
      );
    }

    questions.push(
      q(
        "comparison",
        `If the variable cost per unit increased while the price and fixed cost stayed the same, what would happen to the break-even quantity x*?`,
        buildOptions("It would increase", ["It would decrease", "It would stay exactly the same", "It cannot be determined from the information given"]),
        `Because x* = F ÷ (p − v), a higher variable cost v makes the denominator (p − v) smaller while F stays the same, so the resulting break-even quantity x* increases — more units would need to be sold to cover the fixed cost.`
      )
    );

    questions.push(
      q(
        "interpretation",
        `What does the slope of the revenue function, Revenue(x) = ${p}x, represent in this context?`,
        buildOptions("The selling price per unit", ["The fixed cost per month", "The variable cost per unit", "The profit per unit"]),
        `Revenue(x) = p·x is a linear function of x with slope p, the selling price per unit — each additional unit sold increases total revenue by exactly $${p}.`
      )
    );

    return {
      topicTitle: `Linear Cost and Revenue Functions: ${b.biz.charAt(0).toUpperCase() + b.biz.slice(1)}`,
      subject: "Mathematics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     3. COMPUTATIONAL SCIENCES — Algorithmic complexity (Big-O)
     ============================================================ */
  function genCsBigO(diff) {
    const algoTypes = [
      { key: "const", label: "O(1) — constant time", desc: "checking whether a list is empty by looking only at its length field", opsFn: (n) => 1 },
      { key: "log", label: "O(log₂ n) — logarithmic time", desc: "binary search on a sorted list of n items, which discards half of the remaining items at each step", opsFn: (n) => Math.ceil(Math.log2(n)) },
      { key: "lin", label: "O(n) — linear time", desc: "a linear search that checks each of the n items in an unsorted list one by one until a match is found", opsFn: (n) => n },
      { key: "quad", label: "O(n²) — quadratic time", desc: "a nested loop that compares every item in a list of n items against every other item", opsFn: (n) => n * n },
    ];
    const chosen = pick(algoTypes.filter((a) => a.key !== "const" || diff !== "easy"));
    const others = algoTypes.filter((a) => a.key !== chosen.key);

    const n1 = diff === "easy" ? 10 : diff === "medium" ? 20 : 15;
    const n2 = diff === "easy" ? 100 : diff === "medium" ? 200 : 150;
    const n3 = diff === "easy" ? 1000 : diff === "medium" ? 2000 : 1500;
    const ops1 = chosen.opsFn(n1), ops2 = chosen.opsFn(n2), ops3 = chosen.opsFn(n3);

    const table = `<table class="table"><caption>Table 1. Typical growth of operation counts by complexity class</caption>
      <thead><tr><th>Complexity</th><th>n = 10</th><th>n = 100</th><th>n = 1,000</th></tr></thead>
      <tbody>
      <tr><td>O(1)</td><td>1</td><td>1</td><td>1</td></tr>
      <tr><td>O(log₂ n)</td><td>${Math.ceil(Math.log2(10))}</td><td>${Math.ceil(Math.log2(100))}</td><td>${Math.ceil(Math.log2(1000))}</td></tr>
      <tr><td>O(n)</td><td>10</td><td>100</td><td>1,000</td></tr>
      <tr><td>O(n²)</td><td>100</td><td>10,000</td><td>1,000,000</td></tr>
      </tbody></table>`;

    const sourceText = `
      <p>The time complexity of an algorithm describes, in general terms, how the number of basic operations it performs grows as the size of its input, n, grows. This is usually written using "Big-O" notation, which focuses on the dominant term for large n and ignores constant factors.</p>
      <p>Four common complexity classes, from fastest- to slowest-growing, are: <strong>O(1)</strong> (constant time — the number of operations does not depend on n at all), <strong>O(log₂ n)</strong> (logarithmic time — the number of operations grows very slowly, because the input is effectively halved at each step), <strong>O(n)</strong> (linear time — the number of operations grows in direct proportion to n), and <strong>O(n²)</strong> (quadratic time — the number of operations grows with the square of n, which typically happens when one loop is nested inside another over the same n items).</p>
      <p>Table 1 illustrates how the number of operations required by each complexity class grows as n increases from 10 to 1,000. Notice that O(n²) grows dramatically faster than the other classes as n increases, while O(log₂ n) grows only slightly even for very large n.</p>
       ${table}
      <p>Consider the following algorithm: ${chosen.desc}.</p>
      <p>Recognising which complexity class an algorithm belongs to is important for predicting how it will perform on large inputs, and for comparing different algorithms that solve the same problem.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `What is the time complexity of the algorithm described in the text?`,
        buildOptions(chosen.label, shuffle(others).slice(0, 3).map((o) => o.label)),
        `The description matches the definition of ${chosen.label.split(" — ")[0]} given in the text: ${chosen.desc}.`
      )
    );

    const testN = diff === "easy" ? n1 : diff === "medium" ? n2 : n3;
    const correctOps = chosen.opsFn(testN);
    const wrongFormulas = others.map((o) => o.opsFn(testN));
    questions.push(
      q(
        "calculation",
        `Approximately how many operations would this algorithm perform for an input of size n = ${testN}?`,
        numDistractors(correctOps, wrongFormulas, ""),
        `For ${chosen.label.split(" — ")[0]}, the operation count is calculated as ${chosen.key === "const" ? "1 (independent of n)" : chosen.key === "log" ? `⌈log₂(${testN})⌉ ≈ ${correctOps}` : chosen.key === "lin" ? `n = ${testN}` : `n² = ${testN}² = ${correctOps}`}, giving approximately ${fmtNum(correctOps)} operations.`
      )
    );

    const doublingMap = {
      const: "stays the same",
      log: "increases by only a small, roughly constant amount",
      lin: "approximately doubles",
      quad: "approximately quadruples",
    };
    const doublingOptions = ["stays the same", "increases by only a small, roughly constant amount", "approximately doubles", "approximately quadruples"];
    questions.push(
      q(
        "comparison",
        `If the input size n doubles, how does the number of operations change for an algorithm with this complexity class?`,
        buildOptions(doublingMap[chosen.key], doublingOptions.filter((o) => o !== doublingMap[chosen.key])),
        `${chosen.key === "const" ? "Since O(1) does not depend on n at all, doubling n has no effect on the operation count." : chosen.key === "log" ? "Since O(log₂ n) grows logarithmically, doubling n only adds one more halving step, so the operation count increases by a small, roughly constant amount." : chosen.key === "lin" ? "Since O(n) is directly proportional to n, doubling n approximately doubles the operation count." : "Since O(n²) grows with the square of n, doubling n multiplies the operation count by 2² = 4, so it approximately quadruples."}`
      )
    );

    const fillN = diff === "hard" ? 500 : 50;
    const fillOps = chosen.opsFn(fillN);
    questions.push(
      q(
        "table",
        `Based on the pattern shown in Table 1 and the algorithm's complexity class, approximately how many operations would it perform for n = ${fillN}?`,
        numDistractors(fillOps, others.map((o) => o.opsFn(fillN)), ""),
        `Following the same formula used for this complexity class, substituting n = ${fillN} gives approximately ${fmtNum(fillOps)} operations, consistent with the growth pattern shown in Table 1.`
      )
    );

    const matchCorrect = {
      const: "Reading the first item from a fixed-position field, regardless of list length",
      log: "Repeatedly halving a sorted list until the target range contains one item",
      lin: "Scanning through a list once to compute the sum of its items",
      quad: "Comparing every item in a list against every other item in the same list",
    };
    const matchAll = ["Reading the first item from a fixed-position field, regardless of list length", "Repeatedly halving a sorted list until the target range contains one item", "Scanning through a list once to compute the sum of its items", "Comparing every item in a list against every other item in the same list"];
    questions.push(
      q(
        "comparison",
        `Which of the following would belong to the same complexity class as the algorithm described in the text?`,
        buildOptions(matchCorrect[chosen.key], matchAll.filter((m) => m !== matchCorrect[chosen.key])),
        `This option performs work in the same pattern as ${chosen.label.split(" — ")[0]}: ${chosen.key === "const" ? "a fixed amount of work regardless of input size." : chosen.key === "log" ? "the problem size is repeatedly halved, just like the algorithm in the text." : chosen.key === "lin" ? "each item is visited once, in direct proportion to n." : "every item is compared against every other item, producing roughly n² operations."}`
      )
    );

    const askFastest = coinFlip();
    questions.push(
      q(
        "inference",
        askFastest ? `Among O(1), O(log₂ n), O(n), and O(n²), which complexity class grows fastest as n becomes very large?` : `Among O(1), O(log₂ n), O(n), and O(n²), which complexity class grows most slowly as n becomes very large?`,
        buildOptions(askFastest ? "O(n²)" : "O(1)", askFastest ? ["O(n)", "O(log₂ n)", "O(1)"] : ["O(n)", "O(log₂ n)", "O(n²)"]),
        askFastest ? `As shown in Table 1, O(n²) grows far faster than the other classes as n increases — for n = 1,000 it requires about 1,000,000 operations, compared to only 1,000 for O(n).` : `As shown in Table 1, O(1) never grows at all, since it performs the same fixed number of operations regardless of n.`
      )
    );

    return {
      topicTitle: `Algorithmic Time Complexity`,
      subject: "Computational Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     4. COMPUTATIONAL SCIENCES — Number systems (binary/hex)
     ============================================================ */
  function genCsNumberSystems(diff) {
    const decRange = diff === "easy" ? [10, 60] : diff === "medium" ? [50, 250] : [200, 900];
    const D1 = randInt(decRange[0], decRange[1]);
    const bits = randInt(4, 6);
    let B1 = "";
    for (let i = 0; i < bits; i++) B1 += coinFlip(0.5) ? "1" : "0";
    if (!/1/.test(B1)) B1 = "1" + B1.slice(1);
    const D2fromB1 = parseInt(B1, 2);

    const sourceText = `
      <p>Computers store and process information using the <strong>binary</strong> (base-2) number system, in which every digit ("bit") is either 0 or 1. Humans typically work with the <strong>decimal</strong> (base-10) system, and programmers also frequently use the <strong>hexadecimal</strong> (base-16) system as a compact way of writing binary values.</p>
      <p>In any positional number system, each digit represents the digit's value multiplied by the base raised to a power corresponding to its position, counting from 0 on the right. For binary, the position values are powers of 2: 2⁰ = 1, 2¹ = 2, 2² = 4, 2³ = 8, 2⁴ = 16, 2⁵ = 32, 2⁶ = 64, 2⁷ = 128, and so on. To convert a binary number to decimal, each 1-bit contributes the value of its position, and these values are summed. For example, the binary number 1011 equals (1 × 8) + (0 × 4) + (1 × 2) + (1 × 1) = 8 + 0 + 2 + 1 = 11 in decimal.</p>
      <p>To convert a decimal number to binary, the number can be repeatedly divided by 2, recording the remainder at each step; reading the remainders from last to first gives the binary representation. Equivalently, the number can be expressed as a sum of powers of 2, using each power at most once.</p>
      <p>Hexadecimal uses 16 symbols (0–9 and A–F, where A = 10 and F = 15) and position values that are powers of 16. Hexadecimal is popular because each hexadecimal digit corresponds to exactly four binary bits, making conversion between the two systems straightforward.</p>
      <p>With k available bits, the number of distinct values that can be represented ranges from 0 (all bits 0) up to 2^k − 1 (all bits 1), giving 2^k distinct possible values in total.</p>
    `;

    const questions = [];
    const binOfD1 = D1.toString(2);
    const wrongBin1 = (D1 + 1).toString(2);
    const wrongBin2 = (D1 - 1 >= 0 ? D1 - 1 : D1 + 2).toString(2);
    const wrongBin3 = binOfD1.split("").reverse().join("");
    questions.push(
      q(
        "calculation",
        `What is the decimal number ${D1} written in binary?`,
        buildOptions(binOfD1, [wrongBin1, wrongBin2, wrongBin3 === binOfD1 ? (D1 * 2).toString(2) : wrongBin3]),
        `Repeatedly dividing ${D1} by 2 and reading the remainders from last to first (or expressing ${D1} as a sum of powers of 2) gives ${D1} = ${binOfD1} in binary. As a check: ${binOfD1.split("").map((d, i) => (d === "1" ? Math.pow(2, binOfD1.length - 1 - i) : null)).filter((x) => x !== null).join(" + ")} = ${D1}.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the binary number ${B1} written in decimal?`,
        numDistractors(D2fromB1, [D2fromB1 + 1, D2fromB1 - 1 >= 0 ? D2fromB1 - 1 : D2fromB1 + 2, parseInt(B1.split("").reverse().join(""), 2)], ""),
        `Each 1-bit contributes the value of its position: ${B1.split("").map((d, i) => (d === "1" ? Math.pow(2, B1.length - 1 - i) : null)).filter((x) => x !== null).join(" + ")} = ${D2fromB1}.`
      )
    );

    const k = randInt(3, 8);
    questions.push(
      q(
        "conceptual",
        `With k = ${k} bits available, how many distinct values can be represented?`,
        numDistractors(Math.pow(2, k), [k * 2, k * k, Math.pow(2, k) - 2], ""),
        `As explained in the text, k bits can represent 2^k distinct values: 2^${k} = ${Math.pow(2, k)}.`
      )
    );

    if (diff === "easy") {
      questions.push(
        q(
          "conceptual",
          `Which number system uses base 16, with digits 0–9 followed by A–F?`,
          buildOptions("Hexadecimal", ["Binary", "Decimal", "Octal"]),
          `As stated in the text, hexadecimal is the base-16 system, using the ten decimal digits plus A–F to represent values 10 through 15.`
        )
      );
    } else {
      const hexOfD1 = D1.toString(16).toUpperCase();
      questions.push(
        q(
          "calculation",
          `What is the decimal number ${D1} written in hexadecimal?`,
          buildOptions(hexOfD1, [(D1 + 1).toString(16).toUpperCase(), (D1 - 1 >= 0 ? D1 - 1 : D1 + 2).toString(16).toUpperCase(), (D1 + 16).toString(16).toUpperCase()]),
          `Converting ${D1} to base 16 gives ${hexOfD1} — this can be checked by converting back: ${hexOfD1} in hexadecimal equals ${D1} in decimal.`
        )
      );
    }

    questions.push(
      q(
        "conceptual",
        `In the position-value system described in the text, what value does the bit in position 3 (counting from 0 on the right) contribute if it is a 1?`,
        buildOptions("2³ = 8", ["2² = 4", "3", "2⁴ = 16"]),
        `Position 3 (counting from 0 on the right) corresponds to 2³ = 8, so a 1-bit in that position contributes 8 to the total value.`
      )
    );

    if (diff === "hard") {
      let B2 = "";
      for (let i = 0; i < bits; i++) B2 += coinFlip(0.5) ? "1" : "0";
      if (!/1/.test(B2)) B2 = "1" + B2.slice(1);
      const sumDec = parseInt(B1, 2) + parseInt(B2, 2);
      const sumBin = sumDec.toString(2);
      questions.push(
        q(
          "calculation",
          `What is the sum of the binary numbers ${B1} and ${B2}, expressed in binary?`,
          buildOptions(sumBin, [(sumDec + 1).toString(2), (sumDec - 1 >= 0 ? sumDec - 1 : sumDec + 2).toString(2), (parseInt(B1, 2) * parseInt(B2, 2)).toString(2)]),
          `Converting both numbers to decimal first: ${B1} = ${parseInt(B1, 2)} and ${B2} = ${parseInt(B2, 2)}. Their sum is ${parseInt(B1, 2)} + ${parseInt(B2, 2)} = ${sumDec}, which converts back to binary as ${sumBin}.`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `Why is hexadecimal considered convenient for representing binary values?`,
          buildOptions("Each hexadecimal digit corresponds to exactly four binary bits", ["Hexadecimal numbers are always shorter than decimal numbers", "Computers can only process hexadecimal directly", "Hexadecimal avoids the need for a base at all"]),
          `As explained in the text, each hexadecimal digit maps to exactly four binary bits (since 16 = 2⁴), which makes converting between binary and hexadecimal straightforward.`
        )
      );
    }

    return {
      topicTitle: `Number Systems: Binary, Decimal, and Hexadecimal`,
      subject: "Computational Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     5. NATURAL SCIENCES — Kinematics
     ============================================================ */
  function genNatSciKinematics(diff) {
    const scenarios = [
      { obj: "a delivery drone", unitCtx: "accelerating after take-off" },
      { obj: "a cyclist", unitCtx: "accelerating out of a turn" },
      { obj: "a test vehicle on a track", unitCtx: "accelerating from a standing start" },
      { obj: "an elevator car", unitCtx: "accelerating upward from rest" },
    ];
    const sc = pick(scenarios);
    const v0 = diff === "easy" ? 0 : randInt(2, 10);
    const a = randInt(2, 6);
    const t = randInt(4, 10);

    const sourceText = `
      <p>For an object moving with constant (uniform) acceleration a, three equations relate velocity, time, and distance travelled. If v₀ is the initial velocity, v is the velocity after time t, and s is the distance travelled during that time, then:</p>
      <p>(1) v = v₀ + a·t</p>
      <p>(2) s = v₀·t + ½·a·t²</p>
      <p>(3) v² = v₀² + 2·a·s</p>
      <p>Equation (1) says that velocity increases at a constant rate a; after time t, the velocity has increased by a·t from its starting value. Equation (2) accounts for the fact that the object is speeding up throughout the interval: the distance covered is the distance it would cover at constant initial velocity (v₀·t) plus an additional term (½·a·t²) that captures the extra distance gained because it is accelerating. Equation (3), which does not involve time directly, is useful when time is unknown but the velocities and distance are related.</p>
      <p>Consider ${sc.obj}, ${sc.unitCtx} with a constant acceleration of a = ${a} m/s², starting from an initial velocity of v₀ = ${v0} m/s.</p>
      <p>These equations apply only while the acceleration remains constant; if the acceleration changes (for example, if the object stops accelerating or begins to decelerate), a new set of initial conditions and equations would be needed for the following interval.</p>
    `;

    const questions = [];
    const vAtT = v0 + a * t;
    questions.push(
      q(
        "calculation",
        `What is the velocity of ${sc.obj} after t = ${t} s?`,
        numDistractors(vAtT, [v0 + a, a * t, v0 * a * t], " m/s"),
        `Using v = v₀ + a·t = ${v0} + ${a} × ${t} = ${v0} + ${a * t} = ${vAtT} m/s.`
      )
    );

    const sAtT = v0 * t + 0.5 * a * t * t;
    questions.push(
      q(
        "calculation",
        `What distance does ${sc.obj} travel during the first ${t} seconds?`,
        numDistractors(sAtT, [v0 * t, a * t * t, v0 * t + a * t * t], " m"),
        `Using s = v₀·t + ½·a·t² = ${v0} × ${t} + 0.5 × ${a} × ${t}² = ${v0 * t} + ${fmtNum(0.5 * a * t * t)} = ${fmtNum(sAtT)} m.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What does the acceleration, a, physically represent?`,
        buildOptions("The rate at which velocity changes over time", ["The total distance travelled", "The velocity at the start of the interval", "The force required to move the object"]),
        `Acceleration is defined as the rate of change of velocity with respect to time — how much the velocity increases (or decreases) each second, which is why it appears as a·t in equation (1).`
      )
    );

    if (diff === "easy") {
      questions.push(
        q(
          "comparison",
          `Assuming the object starts from rest (v₀ = 0), if the acceleration were doubled while the time stayed the same, how would the distance travelled change?`,
          buildOptions("It would double", ["It would quadruple", "It would stay the same", "It would halve"]),
          `When v₀ = 0, distance simplifies to s = ½·a·t², which is directly proportional to a (not a²). Doubling a therefore doubles s, since t is unchanged.`
        )
      );
      questions.push(
        q(
          "calculation",
          `How long would it take ${sc.obj} to reach a velocity of ${vAtT} m/s from its initial velocity of ${v0} m/s?`,
          numDistractors(t, [t + 1, t - 1 > 0 ? t - 1 : t + 2, vAtT / a === t ? t + 2 : vAtT / a], " s"),
          `Rearranging v = v₀ + a·t gives t = (v − v₀) ÷ a = (${vAtT} − ${v0}) ÷ ${a} = ${vAtT - v0} ÷ ${a} = ${t} s.`
        )
      );
    } else if (diff === "medium") {
      const vHalf = v0 + a * (t / 2);
      const sHalf = v0 * (t / 2) + 0.5 * a * (t / 2) * (t / 2);
      questions.push(
        q(
          "calculation",
          `Using equation (3), what distance is needed for ${sc.obj} to reach a velocity of ${fmtNum(vHalf)} m/s from its initial velocity?`,
          numDistractors(sHalf, [sAtT, (vHalf * vHalf - v0 * v0) / a, vHalf * t], " m"),
          `Rearranging v² = v₀² + 2·a·s gives s = (v² − v₀²) ÷ (2a) = (${fmtNum(vHalf * vHalf)} − ${v0 * v0}) ÷ ${2 * a} = ${fmtNum(vHalf * vHalf - v0 * v0)} ÷ ${2 * a} = ${fmtNum(sHalf)} m.`
        )
      );
      questions.push(
        q(
          "comparison",
          `Assuming the object starts from rest (v₀ = 0), if the acceleration were doubled while the time stayed the same, how would the distance travelled change?`,
          buildOptions("It would double", ["It would quadruple", "It would stay the same", "It would halve"]),
          `When v₀ = 0, distance simplifies to s = ½·a·t², which is directly proportional to a (not a²) for a fixed time t. Doubling a therefore doubles s.`
        )
      );
    } else {
      const sHalf = v0 * (t / 2) + 0.5 * a * (t / 2) * (t / 2);
      const sLastHalf = sAtT - sHalf;
      questions.push(
        q(
          "calculation",
          `What distance does ${sc.obj} cover during the second half of the interval (from t = ${t / 2} s to t = ${t} s)?`,
          numDistractors(sLastHalf, [sAtT / 2, sHalf, sAtT], " m"),
          `The distance in the first half is s(${t / 2}) = ${v0} × ${t / 2} + 0.5 × ${a} × ${t / 2}² = ${fmtNum(sHalf)} m. The distance over the full interval is s(${t}) = ${fmtNum(sAtT)} m. The distance in the second half is therefore ${fmtNum(sAtT)} − ${fmtNum(sHalf)} = ${fmtNum(sLastHalf)} m — more than half of the total distance, because the object is moving faster later in the interval.`
        )
      );
      questions.push(
        q(
          "comparison",
          `Assuming the object starts from rest (v₀ = 0), if the acceleration were doubled while the time stayed the same, how would the distance travelled change?`,
          buildOptions("It would double", ["It would quadruple", "It would stay the same", "It would halve"]),
          `When v₀ = 0, distance simplifies to s = ½·a·t², which is directly proportional to a (not a²) for a fixed time t. Doubling a therefore doubles s.`
        )
      );
    }

    return {
      topicTitle: `Kinematics: Motion with Constant Acceleration`,
      subject: "Natural Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     6. NATURAL SCIENCES — Molarity & dilution
     ============================================================ */
  function genNatSciChem(diff) {
    const solutes = ["sodium chloride (NaCl)", "glucose", "sodium hydroxide (NaOH)", "potassium chloride (KCl)", "acetic acid"];
    const solute = pick(solutes);
    const C1 = randInt(2, 8);
    const V1 = randInt(1, 4);

    const sourceText = `
      <p><strong>Molarity</strong> (M) expresses the concentration of a solution as the number of moles of solute dissolved per litre of solution: M = n ÷ V, where n is the number of moles of solute and V is the volume of solution in litres. Rearranged, the number of moles present is n = M × V.</p>
      <p>When a solution is <strong>diluted</strong> — that is, more solvent (typically water) is added without adding or removing any solute — the number of moles of solute stays exactly the same, but the total volume increases, so the concentration decreases. This relationship is captured by the dilution equation: C₁V₁ = C₂V₂, where C₁ and V₁ are the concentration and volume before dilution, and C₂ and V₂ are the concentration and volume after dilution. This equation follows directly from the fact that moles of solute are conserved: n = C₁V₁ = C₂V₂.</p>
      <p>A laboratory technician starts with ${V1} L of a ${solute} solution at a concentration of ${C1} mol/L.</p>
      <p>When two solutions of the same solute but different concentrations and volumes are combined, the moles of solute simply add together, and the resulting concentration is the total moles divided by the total volume: C_total = (C₁V₁ + C₂V₂) ÷ (V₁ + V₂).</p>
    `;

    const questions = [];
    const n1 = C1 * V1;
    questions.push(
      q(
        "calculation",
        `How many moles of ${solute.split(" (")[0]} are present in the original ${V1} L solution?`,
        numDistractors(n1, [C1 + V1, C1 / V1, C1 * V1 + 1], " mol"),
        `Using n = M × V = ${C1} mol/L × ${V1} L = ${n1} mol.`
      )
    );

    const V2 = V1 + randInt(1, diff === "easy" ? 3 : 6);
    const C2 = (C1 * V1) / V2;
    questions.push(
      q(
        "calculation",
        `Water is added to the original solution until the total volume reaches ${V2} L. What is the new concentration?`,
        numDistractors(C2, [C1 * V1 / (V2 - V1), C1 - (V2 - V1), C1 * (V2 / V1)], " mol/L"),
        `Using C₁V₁ = C₂V₂: C₂ = (C₁ × V₁) ÷ V₂ = (${C1} × ${V1}) ÷ ${V2} = ${n1} ÷ ${V2} = ${fmtNum(C2)} mol/L.`
      )
    );

    if (diff !== "easy") {
      const targetC = C1 / randInt(2, 4);
      const targetV = (C1 * V1) / targetC;
      questions.push(
        q(
          "calculation",
          `What total volume would the technician need to dilute the original solution to in order to reach a concentration of ${fmtNum(targetC)} mol/L?`,
          numDistractors(targetV, [V1 * (C1 / targetC) / 2, targetC * V1, V1 + targetC], " L"),
          `Rearranging C₁V₁ = C₂V₂ for V₂: V₂ = (C₁ × V₁) ÷ C₂ = (${C1} × ${V1}) ÷ ${fmtNum(targetC)} = ${n1} ÷ ${fmtNum(targetC)} = ${fmtNum(targetV)} L.`
        )
      );
    }

    questions.push(
      q(
        "conceptual",
        `What happens to the number of moles of solute when a solution is diluted by adding more solvent?`,
        buildOptions("It stays exactly the same", ["It increases", "It decreases", "It doubles"]),
        `As the text explains, dilution only adds solvent — no solute is added or removed — so the number of moles of solute is conserved; only the concentration changes because the volume increases.`
      )
    );

    if (diff === "hard") {
      const C3 = randInt(1, 6);
      const V3 = randInt(1, 4);
      const Ctotal = (C1 * V1 + C3 * V3) / (V1 + V3);
      questions.push(
        q(
          "calculation",
          `The technician combines the original ${V1} L of ${C1} mol/L solution with ${V3} L of a ${C3} mol/L solution of the same solute. What is the resulting concentration?`,
          numDistractors(Ctotal, [(C1 + C3) / 2, C1 * V1 + C3 * V3, (C1 + C3) / (V1 + V3)], " mol/L"),
          `Total moles: (${C1} × ${V1}) + (${C3} × ${V3}) = ${n1} + ${C3 * V3} = ${n1 + C3 * V3} mol. Total volume: ${V1} + ${V3} = ${V1 + V3} L. Concentration: ${n1 + C3 * V3} ÷ ${V1 + V3} = ${fmtNum(Ctotal)} mol/L.`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `Which quantity in the dilution equation C₁V₁ = C₂V₂ represents the number of moles of solute?`,
          buildOptions("Both sides of the equation (C₁V₁ and C₂V₂) equal the constant number of moles", ["Only C₁", "Only V₂", "The difference V₂ − V₁"]),
          `Since moles are conserved during dilution, both C₁V₁ and C₂V₂ equal the same fixed quantity — the number of moles of solute, n — which is why the two sides of the equation are equal.`
        )
      );
    }

    questions.push(
      q(
        "comparison",
        `If solvent is added so that the total volume exactly doubles, what happens to the concentration?`,
        buildOptions("It is halved", ["It doubles", "It stays the same", "It becomes zero"]),
        `Since moles of solute (n = C₁V₁) stay constant while volume doubles, the new concentration C₂ = n ÷ (2V₁) = C₁ ÷ 2 — exactly half the original concentration.`
      )
    );

    return {
      topicTitle: `Molarity and Dilution`,
      subject: "Natural Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     7. ENGINEERING — Circuits (Ohm's law, series/parallel)
     ============================================================ */
  function genEngCircuits(diff) {
    const series = coinFlip();
    const V = randInt(6, 24);
    const R1 = randInt(2, 10);
    const R2 = randInt(2, 10);
    const R3 = diff === "easy" ? null : randInt(2, 10);
    const resistors = R3 ? [R1, R2, R3] : [R1, R2];

    const sourceText = `
      <p><strong>Ohm's law</strong> relates voltage V, current I, and resistance R in an electrical circuit: V = I × R. This means the current flowing through a resistor equals the voltage across it divided by its resistance: I = V ÷ R.</p>
      <p>When resistors are connected in <strong>series</strong> (one after another, forming a single path), the same current flows through every resistor, and the total (equivalent) resistance is simply the sum of the individual resistances: R_total = R₁ + R₂ + R₃ + ... The voltage from the source is divided across the resistors, with each resistor's share proportional to its resistance (V_i = I × R_i).</p>
      <p>When resistors are connected in <strong>parallel</strong> (each forming its own separate path between the same two points), the voltage across every resistor equals the full source voltage, but the current divides among the branches according to each resistor's resistance (I_i = V ÷ R_i). The equivalent resistance is found from: 1 ÷ R_total = 1 ÷ R₁ + 1 ÷ R₂ + 1 ÷ R₃ + ...</p>
      <p>A circuit is built with a ${V} V source and ${resistors.length} resistors connected in ${series ? "series" : "parallel"}: R₁ = ${R1} Ω, R₂ = ${R2} Ω${R3 ? `, R₃ = ${R3} Ω` : ""}.</p>
      <p>Adding an additional resistor to a series circuit always increases the total resistance, since resistances simply add. Adding an additional resistor as a new parallel branch always decreases the total resistance, since it opens up an additional path for current to flow, and 1 ÷ R_total increases whenever a new positive term is added to the sum.</p>
    `;

    const questions = [];
    let Req;
    if (series) {
      Req = resistors.reduce((a, b) => a + b, 0);
    } else {
      Req = 1 / resistors.reduce((a, b) => a + 1 / b, 0);
    }
    questions.push(
      q(
        "calculation",
        `What is the equivalent resistance of the ${series ? "series" : "parallel"} combination of ${resistors.length === 3 ? "three" : "two"} resistors?`,
        numDistractors(Req, [resistors.reduce((a, b) => a + b, 0) !== Req ? resistors.reduce((a, b) => a + b, 0) : Req + 2, Math.max(...resistors), 1 / resistors.reduce((a, b) => a + 1 / b, 0) !== Req ? 1 / resistors.reduce((a, b) => a + 1 / b, 0) : Req - 1], " Ω"),
        series
          ? `In series, resistances simply add: R_total = ${resistors.join(" + ")} = ${fmtNum(Req)} Ω.`
          : `In parallel: 1 ÷ R_total = ${resistors.map((r) => `1/${r}`).join(" + ")} = ${fmtNum(resistors.reduce((a, b) => a + 1 / b, 0))}, so R_total = 1 ÷ ${fmtNum(resistors.reduce((a, b) => a + 1 / b, 0))} = ${fmtNum(Req)} Ω.`
      )
    );

    const Itotal = V / Req;
    questions.push(
      q(
        "calculation",
        `What is the total current supplied by the ${V} V source?`,
        numDistractors(Itotal, [V * Req, V / R1, V - Req], " A"),
        `Using Ohm's law with the equivalent resistance found above: I = V ÷ R_total = ${V} ÷ ${fmtNum(Req)} = ${fmtNum(Itotal)} A.`
      )
    );

    if (series) {
      const V1drop = Itotal * R1;
      questions.push(
        q(
          "calculation",
          `What is the voltage drop across R₁ (${R1} Ω)?`,
          numDistractors(V1drop, [V, Itotal * R2, V / resistors.length], " V"),
          `In a series circuit, the same current flows through every resistor. Using V₁ = I × R₁ = ${fmtNum(Itotal)} × ${R1} = ${fmtNum(V1drop)} V.`
        )
      );
    } else {
      const I1 = V / R1;
      questions.push(
        q(
          "calculation",
          `What is the current through the branch containing R₁ (${R1} Ω)?`,
          numDistractors(I1, [Itotal, Itotal / resistors.length, V / Req], " A"),
          `In a parallel circuit, the full source voltage appears across every branch. Using I₁ = V ÷ R₁ = ${V} ÷ ${R1} = ${fmtNum(I1)} A.`
        )
      );
    }

    questions.push(
      q(
        "conceptual",
        `In this ${series ? "series" : "parallel"} circuit, how does the current behave across the different resistors?`,
        buildOptions(series ? "The same current flows through each resistor" : "The current divides among the resistors, with more current through lower-resistance branches", [series ? "The current divides among the resistors, with more current through lower-resistance branches" : "The same current flows through each resistor", "The current is zero through all but one resistor", "The current is unrelated to the resistor values"]),
        series
          ? `As explained in the text, series resistors share a single path, so the same current must flow through each one in turn.`
          : `As explained in the text, each parallel branch has the full source voltage across it, so by Ohm's law (I = V ÷ R) branches with lower resistance carry more current.`
      )
    );

    questions.push(
      q(
        "comparison",
        `If an additional resistor were added ${series ? "in series with" : "as a new parallel branch alongside"} the existing resistors, what would happen to the total resistance?`,
        buildOptions(series ? "It would increase" : "It would decrease", ["It would stay exactly the same", series ? "It would decrease" : "It would increase", "It would become zero"]),
        series
          ? `Since series resistances simply add (R_total = R₁ + R₂ + ...), adding another resistor increases the sum and therefore increases the total resistance.`
          : `Since parallel resistance follows 1 ÷ R_total = 1 ÷ R₁ + 1 ÷ R₂ + ..., adding another branch adds a positive term to the sum, which increases 1 ÷ R_total and therefore decreases R_total — an additional path makes it easier for current to flow overall.`
      )
    );

    const Pchosen = Itotal * Itotal * R1;
    questions.push(
      q(
        "calculation",
        `What power is dissipated by R₁ (${R1} Ω)? (Use P = I² × R, with the current through R₁ found above.)`,
        numDistractors(Pchosen, [Itotal * R1, V * Itotal, Itotal * R1 * R1], " W"),
        series
          ? `The current through R₁ equals the total current I = ${fmtNum(Itotal)} A. Power: P = I² × R = ${fmtNum(Itotal)}² × ${R1} = ${fmtNum(Itotal * Itotal)} × ${R1} = ${fmtNum(Pchosen)} W.`
          : `The current through R₁ is I₁ = V ÷ R₁ = ${fmtNum(V / R1)} A. Power: P = I₁² × R₁ = ${fmtNum((V / R1) * (V / R1))} × ${R1} = ${fmtNum((V / R1) * (V / R1) * R1)} W.`
      )
    );
    if (!series) {
      // fix Q6 to use correct branch current for parallel case
      const I1p = V / R1;
      const Pp = I1p * I1p * R1;
      questions[questions.length - 1] = q(
        "calculation",
        `What power is dissipated by R₁ (${R1} Ω)? (Use P = I² × R, with the current through R₁ found above.)`,
        numDistractors(Pp, [Itotal * R1, V * Itotal, I1p * R1], " W"),
        `The current through R₁ is I₁ = V ÷ R₁ = ${V} ÷ ${R1} = ${fmtNum(I1p)} A. Power: P = I₁² × R₁ = ${fmtNum(I1p * I1p)} × ${R1} = ${fmtNum(Pp)} W.`
      );
    }

    return {
      topicTitle: `Electrical Circuits: Ohm's Law and Resistor Networks`,
      subject: "Engineering",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     8. ENGINEERING — Statics / lever & moment balance
     ============================================================ */
  function genEngStatics(diff) {
    const F1 = randInt(20, 100);
    const d1 = randInt(1, 5);
    const M1 = F1 * d1;

    const sourceText = `
      <p>A <strong>moment</strong> (also called a torque) is the turning effect produced by a force acting at some distance from a pivot point. It is calculated as: Moment = Force × distance from the pivot, measured perpendicular to the force's line of action. Moments are commonly measured in newton-metres (N·m).</p>
      <p>A rigid beam or lever balanced on a pivot is in <strong>rotational equilibrium</strong> when the sum of the clockwise moments acting on it equals the sum of the counter-clockwise moments — that is, the net turning effect is zero and the beam does not rotate. This condition holds regardless of how many individual forces act on each side of the pivot, as long as their moments balance.</p>
      <p>A moment depends on both the size of the force and its distance from the pivot: doubling either the force or the distance doubles the resulting moment, because moment is directly proportional to each of them individually.</p>
      <p>A horizontal beam is balanced on a pivot. On one side, a force of ${F1} N acts at a distance of ${d1} m from the pivot, producing a moment of ${M1} N·m on that side.</p>
    `;

    const questions = [];
    const d2 = randInt(1, 5);
    const F2needed = (F1 * d1) / d2;
    questions.push(
      q(
        "calculation",
        `For the beam to be balanced, what force must be applied on the opposite side at a distance of ${d2} m from the pivot?`,
        numDistractors(F2needed, [F1 * d2 / d1, F1 + d2, F1 * d1 * d2], " N"),
        `For equilibrium, the moments on both sides must be equal: F₁ × d₁ = F₂ × d₂, so ${F1} × ${d1} = F₂ × ${d2}, giving F₂ = ${M1} ÷ ${d2} = ${fmtNum(F2needed)} N.`
      )
    );

    const F2given = randInt(10, 80);
    const d2needed = (F1 * d1) / F2given;
    questions.push(
      q(
        "calculation",
        `For the beam to be balanced, at what distance from the pivot must a force of ${F2given} N be applied on the opposite side?`,
        numDistractors(d2needed, [F2given / (F1 * d1), d1 * (F2given / F1), F1 / F2given], " m"),
        `For equilibrium: F₁ × d₁ = F₂ × d₂, so ${M1} = ${F2given} × d₂, giving d₂ = ${M1} ÷ ${F2given} = ${fmtNum(d2needed)} m.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What condition must hold for the beam to be in rotational equilibrium?`,
        buildOptions("The sum of clockwise moments must equal the sum of counter-clockwise moments", ["All forces acting on the beam must be equal in size", "All distances from the pivot must be equal", "The total force on the beam must be zero, regardless of distances"]),
        `As the text explains, equilibrium requires the turning effects to cancel out — the sum of clockwise moments must equal the sum of counter-clockwise moments — not that the forces or distances themselves are equal.`
      )
    );

    if (diff !== "easy") {
      const F1b = randInt(10, 50);
      const d1b = randInt(1, 4);
      const totalMoment = M1 + F1b * d1b;
      const d3 = randInt(2, 6);
      const F3needed = totalMoment / d3;
      questions.push(
        q(
          "calculation",
          `Suppose a second force of ${F1b} N is added on the same side as the first, at a distance of ${d1b} m from the pivot. What single force on the opposite side, at a distance of ${d3} m, would balance the beam?`,
          numDistractors(F3needed, [(F1 + F1b) / d3, totalMoment / (d3 + 1), M1 / d3], " N"),
          `The total moment on the loaded side is the sum of both moments: (${F1} × ${d1}) + (${F1b} × ${d1b}) = ${M1} + ${F1b * d1b} = ${totalMoment} N·m. For balance, F₃ × ${d3} = ${totalMoment}, so F₃ = ${totalMoment} ÷ ${d3} = ${fmtNum(F3needed)} N.`
        )
      );
    } else {
      questions.push(
        q(
          "comparison",
          `If the distance of the ${F1} N force from the pivot were doubled while the force itself stayed the same, how would its moment change?`,
          buildOptions("It would double", ["It would quadruple", "It would stay the same", "It would halve"]),
          `Since moment = force × distance, and the force is unchanged, doubling the distance doubles the moment: the relationship between moment and distance (for a fixed force) is directly proportional.`
        )
      );
    }

    questions.push(
      q(
        "comparison",
        `If the distance of a force from the pivot doubles while the force itself stays the same, how does its moment change?`,
        buildOptions("It doubles", ["It quadruples", "It stays the same", "It halves"]),
        `Moment = force × distance. With the force held constant, moment is directly proportional to distance, so doubling the distance doubles the moment.`
      )
    );

    questions.push(
      q(
        "interpretation",
        `Which change would increase the moment produced by a given force, without changing the size of the force itself?`,
        buildOptions("Increasing the distance between the force and the pivot", ["Decreasing the distance between the force and the pivot", "Reversing the direction of the force only", "Applying the force exactly at the pivot"]),
        `Since moment = force × distance, increasing the distance from the pivot (with the force unchanged) increases the moment. Applying the force exactly at the pivot would give a distance of zero and therefore zero moment.`
      )
    );

    return {
      topicTitle: `Statics: Moments and Lever Equilibrium`,
      subject: "Engineering",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     9. BUSINESS ADMINISTRATION — Economic Order Quantity
     ============================================================ */
  function genBusEOQ(diff) {
    const scenarios = [
      { biz: "a hardware store", item: "boxes of wood screws" },
      { biz: "a bakery supplier", item: "25 kg bags of flour" },
      { biz: "a pharmacy", item: "boxes of disposable syringes" },
      { biz: "a bookstore", item: "cases of notebooks" },
      { biz: "an auto parts distributor", item: "sets of brake pads" },
    ];
    const sc = pick(scenarios);
    const D = randInt(diff === "easy" ? 600 : diff === "medium" ? 1200 : 2000, diff === "easy" ? 1800 : diff === "medium" ? 3500 : 6000);
    const S = randInt(20, 120);
    const H = randInt(2, 15);
    const Qstar = Math.sqrt((2 * D * S) / H);

    const sourceText = `
      <p>Businesses that hold physical stock face a trade-off between two kinds of cost. <strong>Ordering costs</strong> are incurred every time an order is placed with a supplier — for example, administrative time, delivery fees, or inspection costs — and are largely independent of how many units are ordered at once; placing one order for 500 units typically costs about the same to process as placing one order for 50. <strong>Holding costs</strong>, on the other hand, are incurred for keeping stock in storage — including warehouse space, insurance, and the opportunity cost of capital tied up in inventory — and rise with the amount of stock kept on hand.</p>
      <p>Ordering in large batches reduces how often orders need to be placed, lowering total ordering costs, but increases the average amount of stock sitting in the warehouse, raising total holding costs. Ordering in small, frequent batches has the opposite effect. The <strong>economic order quantity (EOQ)</strong> model identifies the order size that minimises the combined total of these two costs, under the simplifying assumptions that annual demand is constant and known in advance, the cost per unit does not change with order size, and there are no limits on available storage space or capital.</p>
      <p>Under these assumptions, if a business assumes stock is used up at a steady rate between orders (so the average stock level on hand is half of the order quantity, Q ÷ 2), the optimal order quantity is given by:</p>
      <p>Q* = √(2DS ÷ H)</p>
      <p>where D is the annual demand in units, S is the fixed cost per order, and H is the holding cost per unit per year.</p>
      <p>${sc.biz.charAt(0).toUpperCase() + sc.biz.slice(1)} sells ${sc.item}, with an annual demand of D = ${D} units. Each order placed with the supplier costs S = $${S} to process, regardless of order size, and it costs H = $${H} per unit per year to hold one unit in storage.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the economic order quantity (Q*) for this item, rounded to the nearest whole unit?`,
        numDistractors(Math.round(Qstar), [Math.round(D / S), Math.round((2 * D * S) / H), Math.round(Qstar / 2)], " units"),
        `Q* = √(2DS ÷ H) = √(2 × ${D} × ${S} ÷ ${H}) = √(${2 * D * S} ÷ ${H}) = √${fmtNum((2 * D * S) / H)} ≈ ${fmtNum(Qstar)} units, or ${Math.round(Qstar)} units when rounded to a whole unit.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which of the following is a key assumption underlying this basic EOQ model?`,
        buildOptions("Annual demand is constant and known in advance", ["Suppliers offer quantity discounts for larger orders", "Storage space and available capital are limited", "The model's main goal is to maximise customer satisfaction rather than minimise cost"]),
        `As stated in the text, the basic EOQ model assumes demand is constant and known, unit costs do not change with order size, storage and capital are unlimited, and the objective is to minimise total ordering and holding cost — not to maximise customer satisfaction or account for quantity discounts.`
      )
    );

    questions.push(
      q(
        "comparison",
        `If the fixed cost per order, S, were doubled while D and H stayed the same, by approximately what factor would Q* change?`,
        buildOptions("It would increase by a factor of √2 (about 1.41)", ["It would double", "It would stay the same", "It would be cut in half"]),
        `Since Q* = √(2DS ÷ H), doubling S doubles the value under the square root, and √(2×original) = √2 × √(original) ≈ 1.41 × the original Q* — so Q* increases by a factor of about √2, not a full doubling.`
      )
    );

    const avgInv = Qstar / 2;
    questions.push(
      q(
        "calculation",
        `If the business orders in batches of Q* and stock is used up at a steady rate between orders, what is the average inventory level on hand?`,
        numDistractors(avgInv, [Qstar, Qstar / 3, D / 2], " units"),
        `With steady usage between orders, stock runs from Q* right after an order down to 0 just before the next one, so the average level is Q* ÷ 2 = ${fmtNum(Qstar)} ÷ 2 = ${fmtNum(avgInv)} units.`
      )
    );

    if (diff !== "easy") {
      const ordersPerYear = D / Qstar;
      questions.push(
        q(
          "calculation",
          `Approximately how many orders would this business place per year if it orders in batches of Q*?`,
          numDistractors(ordersPerYear, [Qstar / D, D / S, D * Qstar], " orders/year"),
          `The number of orders per year is annual demand divided by order size: D ÷ Q* = ${D} ÷ ${fmtNum(Qstar)} ≈ ${fmtNum(ordersPerYear)} orders per year.`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `If the business instead ordered in smaller, more frequent batches than Q*, what would generally happen to its total ordering and holding costs?`,
          buildOptions("Ordering costs would rise and holding costs would fall, moving away from the cost-minimising point", ["Both ordering and holding costs would fall", "Both ordering and holding costs would rise", "Total cost would be unaffected, since Q* only affects delivery speed"]),
          `Smaller batches mean more frequent orders (higher total ordering cost) but less average stock on hand (lower total holding cost). Since Q* is specifically the quantity that minimises the sum of these two costs, moving away from Q* in either direction increases the combined total.`
        )
      );
    }

    if (diff === "hard") {
      const totalCost = (D / Qstar) * S + (Qstar / 2) * H;
      questions.push(
        q(
          "calculation",
          `What is the total annual inventory cost (ordering cost plus holding cost) when the business orders in batches of Q*?`,
          numDistractors(totalCost, [(D / Qstar) * S, (Qstar / 2) * H, D * S / H], "$"),
          `Total ordering cost is (D ÷ Q*) × S = (${D} ÷ ${fmtNum(Qstar)}) × ${S} ≈ ${fmtNum((D / Qstar) * S)}. Total holding cost is (Q* ÷ 2) × H = ${fmtNum(avgInv)} × ${H} ≈ ${fmtNum(avgInv * H)}. At the optimum these two components are equal (a defining property of Q*), and their sum is the total annual cost: ≈ $${fmtNum(totalCost)}.`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `As the order quantity Q increases from a very small value toward Q*, what generally happens to total holding cost?`,
          buildOptions("It increases, since a larger order quantity means more average stock on hand", ["It decreases, since fewer orders are needed", "It stays constant regardless of order size", "It becomes negative"]),
          `Average inventory on hand is Q ÷ 2, so as the order quantity Q increases, the average amount of stock held in the warehouse — and therefore total holding cost — increases as well.`
        )
      );
    }

    return {
      topicTitle: `Inventory Management: Economic Order Quantity`,
      subject: "Business Administration",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     10. BUSINESS ADMINISTRATION — Productivity & capacity
     ============================================================ */
  function genBusProductivity(diff) {
    const scenarios = [
      { biz: "a furniture workshop", worker: "carpenter", unitItem: "chairs" },
      { biz: "a textile factory", worker: "machine operator", unitItem: "garments" },
      { biz: "a print shop", worker: "press operator", unitItem: "posters" },
      { biz: "a food processing plant", worker: "line worker", unitItem: "packaged meals" },
    ];
    const sc = pick(scenarios);
    const workers = randInt(6, 20);
    const hoursPerDay = randInt(6, 9);
    const daysPerWeek = 5;
    const rate = randInt(2, 8); // units per worker-hour
    const maxCapacityPerWeek = randInt(1, 3) * workers * hoursPerDay * daysPerWeek * (rate + randInt(1, 3));

    const totalOutput = workers * hoursPerDay * daysPerWeek * rate;

    const sourceText = `
      <p><strong>Labour productivity</strong> measures how much output is produced per unit of labour input, typically expressed as output per worker-hour: Productivity = Total output ÷ (Number of workers × Hours worked). It is a measure of how efficiently labour is being converted into finished output, and is commonly used to compare performance across shifts, factories, or time periods.</p>
      <p><strong>Capacity utilisation</strong> measures how much of a facility's maximum possible output is actually being achieved: Capacity utilisation (%) = (Actual output ÷ Maximum possible output) × 100. A facility operating well below 100% has unused ("idle") capacity — it could produce more with its existing workers and equipment without further investment. A facility operating close to 100% is using nearly all of its available capacity and may need to expand capacity (for example, by hiring more staff or adding equipment) to increase output further.</p>
      <p>${sc.biz.charAt(0).toUpperCase() + sc.biz.slice(1)} employs ${workers} ${sc.worker}s. Each works ${hoursPerDay} hours per day, ${daysPerWeek} days per week. On average, each ${sc.worker} produces ${rate} ${sc.unitItem} per hour. The facility's maximum possible weekly output, if fully staffed and running without interruption, is ${maxCapacityPerWeek} ${sc.unitItem}.</p>
      <p>If output per worker-hour improves — for example, because of new equipment or additional training — total output rises proportionally, assuming the number of workers and hours worked stay the same.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the facility's total weekly output of ${sc.unitItem}?`,
        numDistractors(totalOutput, [workers * hoursPerDay * rate, workers * daysPerWeek * rate, workers * hoursPerDay * daysPerWeek], ` ${sc.unitItem}`),
        `Total output = workers × hours per day × days per week × rate = ${workers} × ${hoursPerDay} × ${daysPerWeek} × ${rate} = ${fmtNum(totalOutput)} ${sc.unitItem}.`
      )
    );

    const productivity = totalOutput / (workers * hoursPerDay * daysPerWeek);
    questions.push(
      q(
        "calculation",
        `What is the facility's labour productivity, measured in ${sc.unitItem} per worker-hour?`,
        numDistractors(productivity, [totalOutput / workers, totalOutput / (hoursPerDay * daysPerWeek), rate + 1], ` ${sc.unitItem}/worker-hour`),
        `Productivity = Total output ÷ (workers × total hours) = ${fmtNum(totalOutput)} ÷ (${workers} × ${hoursPerDay} × ${daysPerWeek}) = ${fmtNum(totalOutput)} ÷ ${workers * hoursPerDay * daysPerWeek} = ${fmtNum(productivity)} ${sc.unitItem} per worker-hour.`
      )
    );

    const utilisation = (totalOutput / maxCapacityPerWeek) * 100;
    questions.push(
      q(
        "calculation",
        `What is the facility's current capacity utilisation?`,
        numDistractors(utilisation, [(maxCapacityPerWeek / totalOutput) * 100, utilisation / 2, 100 - utilisation], "%"),
        `Capacity utilisation = (Actual output ÷ Maximum possible output) × 100 = (${fmtNum(totalOutput)} ÷ ${maxCapacityPerWeek}) × 100 ≈ ${fmtNum(utilisation)}%.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `If the number of ${sc.worker}s increased while hours per worker and the per-hour production rate stayed the same, what would happen to total output?`,
        buildOptions("It would increase proportionally", ["It would decrease", "It would stay exactly the same", "It would become unpredictable"]),
        `Total output is calculated as workers × hours × rate; with hours and rate held constant, increasing the number of workers increases total output proportionally.`
      )
    );

    if (diff !== "easy") {
      const improvePct = randInt(10, 30);
      const newOutput = totalOutput * (1 + improvePct / 100);
      questions.push(
        q(
          "calculation",
          `New equipment is expected to raise the per-hour production rate by ${improvePct}%, with the same number of workers and hours. What would the new total weekly output be?`,
          numDistractors(newOutput, [totalOutput + improvePct, totalOutput * improvePct / 100, totalOutput * (1 - improvePct / 100)], ` ${sc.unitItem}`),
          `A ${improvePct}% increase in the production rate increases total output by the same percentage (since output is directly proportional to the rate): ${fmtNum(totalOutput)} × (1 + ${improvePct} ÷ 100) = ${fmtNum(totalOutput)} × ${fmtNum(1 + improvePct / 100)} = ${fmtNum(newOutput)} ${sc.unitItem}.`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `Which of the following would directly increase the facility's labour productivity (output per worker-hour), assuming the number of workers and hours stay the same?`,
          buildOptions("Producing more output using the same amount of labour input, for example through better training or equipment", ["Hiring more workers at the same production rate", "Increasing the number of hours worked without changing output", "Reducing the maximum possible capacity of the facility"]),
          `Since productivity = output ÷ labour input, increasing output while labour input (workers × hours) stays the same directly raises productivity. Simply adding more workers or hours at the same rate does not change productivity itself, only total output.`
        )
      );
    }

    const utilCorrectInterp = utilisation < 80 ? "The facility is producing well below its maximum possible output, meaning it has unused (idle) capacity" : "The facility is operating close to its maximum possible output, with little unused capacity remaining";
    const utilDistractors = ["The facility is producing well below its maximum possible output, meaning it has unused (idle) capacity", "The facility is operating close to its maximum possible output, with little unused capacity remaining", "The facility is losing money on every unit produced", "The facility has no workers currently assigned"].filter((s) => s !== utilCorrectInterp);
    questions.push(
      q(
        "interpretation",
        `Given a capacity utilisation of ${fmtNum(utilisation)}%, what does this figure indicate about the facility?`,
        buildOptions(utilCorrectInterp, utilDistractors.slice(0, 3)),
        `Capacity utilisation compares actual output to the facility's maximum possible output. A figure of ${fmtNum(utilisation)}% means the facility is ${utilisation < 80 ? "producing well below its maximum, indicating unused (idle) capacity that could be used to increase output without further investment" : "operating close to its maximum output, with relatively little idle capacity remaining"}. The figure alone says nothing about profitability or staffing levels.`
      )
    );

    return {
      topicTitle: `Labour Productivity and Capacity Utilisation`,
      subject: "Business Administration",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     11. ECONOMICS — Supply and demand equilibrium
     ============================================================ */
  function genEconSupplyDemand(diff) {
    const goods = ["umbrellas", "bicycles", "coffee", "notebooks", "concert tickets", "office chairs"];
    const good = pick(goods);
    const b = randInt(1, 4);
    const d = randInt(1, 4);
    const c = randInt(diff === "easy" ? 10 : 20, diff === "easy" ? 50 : 90);
    const a = c + randInt(30, 90) + (b + d) * randInt(5, 15);

    const Pstar = (a - c) / (b + d);
    const Qstar = a - b * Pstar;

    const sourceText = `
      <p>In a competitive market, the <strong>demand curve</strong> shows the quantity of a good that consumers are willing to buy at each price, and typically slopes downward: as price rises, quantity demanded falls. A simple linear demand function can be written Qd = a − b·P, where a and b are positive constants and P is the price. The <strong>supply curve</strong> shows the quantity that producers are willing to sell at each price, and typically slopes upward: as price rises, quantity supplied rises. A simple linear supply function can be written Qs = c + d·P, where c and d are positive constants.</p>
      <p>The <strong>market equilibrium</strong> is the price and quantity at which the amount consumers wish to buy exactly equals the amount producers wish to sell — that is, where Qd = Qs. At this equilibrium price, there is no tendency for price to rise or fall, because there is neither a shortage nor a surplus.</p>
      <p>If the government imposes a <strong>price ceiling</strong> below the equilibrium price, quantity demanded at that price exceeds quantity supplied, creating a <strong>shortage</strong>. If the government imposes a <strong>price floor</strong> above the equilibrium price, quantity supplied exceeds quantity demanded, creating a <strong>surplus</strong>.</p>
      <p>Demand and supply curves themselves can also shift. For a <strong>normal good</strong> — one that consumers buy more of as their income rises — an increase in consumer income shifts the demand curve to the right (more is demanded at every price), regardless of what happens to price itself.</p>
      <p>In the market for ${good}, the demand function is Qd = ${a} − ${b}P and the supply function is Qs = ${c} + ${d}P, where P is the price in dollars and Q is the quantity in thousands of units per month.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the equilibrium price in this market?`,
        numDistractors(Pstar, [(a - c) / (b - d === 0 ? b + d + 1 : b - d), a / b, c / d], "$"),
        `At equilibrium, Qd = Qs: ${a} − ${b}P = ${c} + ${d}P. Rearranging: ${a} − ${c} = ${d}P + ${b}P, so ${a - c} = ${b + d}P, giving P* = ${a - c} ÷ ${b + d} = ${fmtNum(Pstar)}.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the equilibrium quantity in this market?`,
        numDistractors(Qstar, [a, c + d * Pstar !== Qstar ? c + d * Pstar : Qstar + 5, a - b], " thousand units"),
        `Substituting the equilibrium price into either function gives the equilibrium quantity: Qd = ${a} − ${b} × ${fmtNum(Pstar)} = ${a} − ${fmtNum(b * Pstar)} = ${fmtNum(Qstar)} thousand units (which matches Qs = ${c} + ${d} × ${fmtNum(Pstar)} = ${fmtNum(c + d * Pstar)}).`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What would happen if the government set a price ceiling below the equilibrium price for ${good}?`,
        buildOptions("A shortage would occur, since quantity demanded would exceed quantity supplied", ["A surplus would occur, since quantity supplied would exceed quantity demanded", "The market would remain exactly at equilibrium", "Both quantity demanded and quantity supplied would fall to zero"]),
        `Below the equilibrium price, quantity demanded (which rises as price falls) exceeds quantity supplied (which falls as price falls), creating a shortage — as explained in the text.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What would happen if the government set a price floor above the equilibrium price for ${good}?`,
        buildOptions("A surplus would occur, since quantity supplied would exceed quantity demanded", ["A shortage would occur, since quantity demanded would exceed quantity supplied", "The market would remain exactly at equilibrium", "Demand would increase to match supply"]),
        `Above the equilibrium price, quantity supplied (which rises as price rises) exceeds quantity demanded (which falls as price rises), creating a surplus — as explained in the text.`
      )
    );

    const P0 = Math.max(1, Math.round(Pstar - randInt(2, 6)));
    const Qd0 = a - b * P0;
    questions.push(
      q(
        "calculation",
        `At a price of $${P0}, what is the quantity demanded, according to the demand function given?`,
        numDistractors(Qd0, [c + d * P0, a - b * P0 + b, a], " thousand units"),
        `Using Qd = ${a} − ${b}P: Qd = ${a} − ${b} × ${P0} = ${a} − ${b * P0} = ${fmtNum(Qd0)} thousand units.`
      )
    );

    questions.push(
      q(
        "inference",
        `If consumer income rises and ${good.slice(0, 1).toUpperCase() + good.slice(1)} are a normal good, what would happen to the demand curve, holding price constant?`,
        buildOptions("The demand curve would shift to the right (more demanded at every price)", ["The demand curve would shift to the left (less demanded at every price)", "The supply curve would shift to the right", "Neither curve would shift, since only price affects quantity demanded"]),
        `As explained in the text, for a normal good, higher consumer income increases the amount demanded at every price, which is represented by a rightward shift of the entire demand curve — not a shift in the supply curve, and not merely a movement along the existing demand curve.`
      )
    );

    return {
      topicTitle: `Supply and Demand: Market Equilibrium for ${good.charAt(0).toUpperCase() + good.slice(1)}`,
      subject: "Economics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     12. ECONOMICS — Price elasticity of demand
     ============================================================ */
  function genEconElasticity(diff) {
    const goods = ["restaurant meals", "gasoline", "designer handbags", "breakfast cereal", "domestic flights", "streaming subscriptions"];
    const good = pick(goods);
    const P1 = randInt(20, 60);
    let pctP = randInt(5, 25);
    let pctQ = randInt(5, 40);
    // avoid landing almost exactly on |E| = 1 to keep classification unambiguous
    if (Math.abs(pctQ / pctP - 1) < 0.08) pctQ += 6;
    const P2 = Math.round(P1 * (1 + pctP / 100));
    const Q1 = randInt(200, 900);
    const Q2 = Math.round(Q1 * (1 - pctQ / 100));

    const actualPctP = ((P2 - P1) / P1) * 100;
    const actualPctQ = ((Q2 - Q1) / Q1) * 100;
    const E = Math.abs(actualPctQ / actualPctP);
    const classification = E > 1.05 ? "elastic" : E < 0.95 ? "inelastic" : "unit elastic";

    const sourceText = `
      <p>The <strong>price elasticity of demand</strong> measures how responsive the quantity demanded of a good is to a change in its price. It is calculated as the percentage change in quantity demanded divided by the percentage change in price: E = (%ΔQ) ÷ (%ΔP). Because demand curves normally slope downward, price and quantity move in opposite directions, so this ratio is technically negative; economists typically report and compare its magnitude (absolute value).</p>
      <p>Based on the magnitude of E, demand is classified as: <strong>elastic</strong> if |E| &gt; 1 (quantity demanded changes proportionally more than price), <strong>inelastic</strong> if |E| &lt; 1 (quantity demanded changes proportionally less than price), or <strong>unit elastic</strong> if |E| = 1 (the two percentage changes are equal).</p>
      <p>This classification matters for predicting how <strong>total revenue</strong> (price × quantity) responds to a price change. If demand is elastic and price rises, the percentage fall in quantity outweighs the percentage rise in price, so total revenue falls. If demand is inelastic and price rises, the percentage fall in quantity is smaller than the percentage rise in price, so total revenue rises. (If demand is unit elastic, total revenue is unchanged by a small price change.)</p>
      <p>The price of ${good} rose from $${P1} to $${P2} per unit. In response, the quantity demanded fell from ${Q1} units to ${Q2} units per month.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What was the percentage change in price?`,
        numDistractors(actualPctP, [((P2 - P1) / P2) * 100, P2 - P1, actualPctP / 2], "%"),
        `%ΔP = ((P₂ − P₁) ÷ P₁) × 100 = ((${P2} − ${P1}) ÷ ${P1}) × 100 = (${P2 - P1} ÷ ${P1}) × 100 ≈ ${fmtNum(actualPctP)}%.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What was the percentage change in quantity demanded?`,
        numDistractors(actualPctQ, [((Q2 - Q1) / Q2) * 100, Q2 - Q1, actualPctQ / 2], "%"),
        `%ΔQ = ((Q₂ − Q₁) ÷ Q₁) × 100 = ((${Q2} − ${Q1}) ÷ ${Q1}) × 100 = (${Q2 - Q1} ÷ ${Q1}) × 100 ≈ ${fmtNum(actualPctQ)}%.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the magnitude (absolute value) of the price elasticity of demand, |E|?`,
        numDistractors(E, [Math.abs(actualPctP / actualPctQ), E * 2, E / 2], ""),
        `|E| = |%ΔQ ÷ %ΔP| = |${fmtNum(actualPctQ)}% ÷ ${fmtNum(actualPctP)}%| ≈ ${fmtNum(E)}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Based on this value of |E|, how would demand for ${good} be classified over this price range?`,
        buildOptions(classification.charAt(0).toUpperCase() + classification.slice(1), ["elastic", "inelastic", "unit elastic"].filter((c) => c !== classification).map((c) => c.charAt(0).toUpperCase() + c.slice(1))),
        `As defined in the text, |E| ${classification === "elastic" ? "> 1 means demand is elastic" : classification === "inelastic" ? "< 1 means demand is inelastic" : "≈ 1 means demand is unit elastic"}; here |E| ≈ ${fmtNum(E)}, so demand is classified as ${classification}.`
      )
    );

    if (classification === "elastic") {
      questions.push(
        q(
          "inference",
          `Given that demand for ${good} is elastic over this range, what happened to total revenue (price × quantity) as a result of the price increase?`,
          buildOptions("Total revenue fell, since the percentage drop in quantity outweighed the percentage rise in price", ["Total revenue rose, since price increased", "Total revenue stayed exactly the same", "Total revenue cannot be determined without knowing production costs"]),
          `As explained in the text, when demand is elastic, a price increase causes a proportionally larger fall in quantity demanded, so total revenue (price × quantity) falls overall.`
        )
      );
    } else {
      questions.push(
        q(
          "inference",
          `If demand for a good is inelastic and its price increases, what generally happens to total revenue (price × quantity)?`,
          buildOptions("Total revenue rises, since the percentage rise in price outweighs the percentage fall in quantity", ["Total revenue falls, since price increased", "Total revenue stays exactly the same", "Total revenue cannot be determined without knowing production costs"]),
          `As explained in the text, when demand is inelastic, a price increase causes only a proportionally smaller fall in quantity demanded, so total revenue (price × quantity) rises overall.`
        )
      );
    }

    questions.push(
      q(
        "comparison",
        `Compared to a good with |E| = 0.2, what would a good with |E| = 2.5 indicate about consumer responsiveness to price changes?`,
        buildOptions("Consumers would be far more responsive to price changes for the good with |E| = 2.5", ["Consumers would be far less responsive to price changes for the good with |E| = 2.5", "Both goods would show identical consumer responsiveness", "|E| says nothing about consumer responsiveness to price"]),
        `A higher |E| means a given percentage change in price produces a proportionally larger change in quantity demanded, so |E| = 2.5 indicates much greater price responsiveness than |E| = 0.2.`
      )
    );

    return {
      topicTitle: `Price Elasticity of Demand: ${good.charAt(0).toUpperCase() + good.slice(1)}`,
      subject: "Economics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     13. SOCIAL SCIENCES — Sampling methods
     ============================================================ */
  function genSocSampling(diff) {
    const methods = {
      simple: {
        label: "simple random sampling",
        desc: "every member of the population is assigned a number, and a computer randomly selects individuals to include, so that every member has an equal and known chance of being chosen",
        advantage: "every member of the population has an equal chance of selection, which minimises selection bias and tends to produce a sample that reflects the population well",
        limitation: "it requires a complete list of the population, which is not always available or practical to obtain",
      },
      stratified: {
        label: "stratified sampling",
        desc: "the population is first divided into subgroups (strata) based on a shared characteristic, such as age group or department, and a random sample is then drawn from each subgroup in proportion to its size",
        advantage: "it ensures that important subgroups are represented in proportion to their size in the population, which can improve accuracy compared to simple random sampling when subgroups differ meaningfully",
        limitation: "it requires accurate information about the subgroup structure of the population in advance, which may not always be available",
      },
      systematic: {
        label: "systematic sampling",
        desc: "individuals are selected at a fixed interval from a list of the population (for example, every 10th person on a list), after a random starting point is chosen",
        advantage: "it is simple to carry out and tends to spread the sample evenly across the population list",
        limitation: "if the list itself has a hidden repeating pattern that lines up with the sampling interval, the sample can become biased without the researcher realising it",
      },
      convenience: {
        label: "convenience sampling",
        desc: "individuals are included simply because they are easy to reach — for example, surveying people who happen to be present at a particular location, or who volunteer in response to an open invitation",
        advantage: "it is quick, inexpensive, and easy to carry out",
        limitation: "the resulting sample often does not represent the wider population well, since the people who are easiest to reach may differ systematically from those who are not, introducing selection bias",
      },
    };
    const keys = Object.keys(methods);
    const usedKey = pick(keys);
    const used = methods[usedKey];
    const otherKeys = keys.filter((k) => k !== usedKey);

    const topics = [
      { topic: "study habits among university students", pop: "all students enrolled at a large university" },
      { topic: "customer satisfaction with a retail chain", pop: "all customers who shopped at the chain last month" },
      { topic: "commuting preferences in a city", pop: "all residents of the city" },
      { topic: "workplace wellbeing at a company", pop: "all employees of the company" },
    ];
    const t = pick(topics);

    const sourceText = `
      <p>In empirical research, the <strong>population</strong> is the entire group a researcher is interested in studying, while a <strong>sample</strong> is the (usually smaller) subset actually observed or surveyed. Because studying an entire population is often impractical, researchers rely on samples and use the sampling method to judge how well the sample's results are likely to generalise back to the population.</p>
      <p>Common sampling methods include: <strong>simple random sampling</strong> (every member of the population has an equal, known chance of selection); <strong>stratified sampling</strong> (the population is divided into subgroups, and a random sample is drawn proportionally from each subgroup); <strong>systematic sampling</strong> (individuals are selected at a fixed interval from a population list, after a random start); and <strong>convenience sampling</strong> (individuals are included simply because they are easy to reach, such as volunteers or passers-by).</p>
      <p>The choice of sampling method affects how representative the resulting sample is likely to be of the full population, and therefore how confidently the researcher can generalise findings from the sample to the population as a whole. Methods based on random selection from the full population (simple random and stratified sampling) generally minimise selection bias, while methods based on ease of access (convenience sampling) carry a higher risk that the sample systematically differs from the population.</p>
      <p>A researcher is studying ${t.topic}. The population of interest is ${t.pop}. To build the sample, the researcher uses the following procedure: ${used.desc}.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `Which sampling method does the researcher use in this scenario?`,
        buildOptions(used.label.charAt(0).toUpperCase() + used.label.slice(1), shuffle(otherKeys).slice(0, 3).map((k) => methods[k].label.charAt(0).toUpperCase() + methods[k].label.slice(1))),
        `The procedure described — "${used.desc}" — matches the definition of ${used.label} given in the text.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What is a key advantage of the sampling method used in this scenario?`,
        buildOptions(used.advantage.charAt(0).toUpperCase() + used.advantage.slice(1), shuffle(otherKeys).slice(0, 3).map((k) => methods[k].advantage.charAt(0).toUpperCase() + methods[k].advantage.slice(1))),
        `As explained in the text, the main advantage of ${used.label} is that ${used.advantage}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What is a key limitation of the sampling method used in this scenario?`,
        buildOptions(used.limitation.charAt(0).toUpperCase() + used.limitation.slice(1), shuffle(otherKeys).slice(0, 3).map((k) => methods[k].limitation.charAt(0).toUpperCase() + methods[k].limitation.slice(1))),
        `As explained in the text, a key limitation of ${used.label} is that ${used.limitation}.`
      )
    );

    questions.push(
      q(
        "comparison",
        `Compared to convenience sampling, what is the main advantage of simple random sampling?`,
        buildOptions("Every member of the population has an equal, known chance of selection, which reduces selection bias", ["It is always faster and cheaper to carry out", "It never requires a list of the population", "It guarantees the sample will exactly match the population on every characteristic"]),
        `As the text explains, simple random sampling gives every population member an equal chance of selection, which reduces selection bias compared to convenience sampling, where accessibility (not randomness) determines who is included. Random sampling reduces — but, with a finite sample, does not fully guarantee — an exact match to every population characteristic.`
      )
    );

    questions.push(
      q(
        "inference",
        `If the sample used in this scenario turns out not to be representative of the population, what is the main consequence for the study's conclusions?`,
        buildOptions("The conclusions may not generalise well to the wider population", ["The conclusions automatically become invalid within the sample itself", "The sample size becomes irrelevant to the analysis", "The researcher's data collection method must have been recorded incorrectly"]),
        `A key purpose of sampling is to draw conclusions about the population based on the sample. If the sample is not representative, the main risk is that findings which hold within the sample may not generalise to the broader population, even if the data collected from the sample itself is accurate.`
      )
    );

    questions.push(
      q(
        "interpretation",
        `Which of the following changes would most likely increase how representative a sample is of its population?`,
        buildOptions("Selecting participants randomly from a complete list of the population", ["Only surveying people who volunteer in response to a public flyer", "Only surveying friends, family, or colleagues of the researcher", "Stopping data collection once the first 20 responses arrive online"]),
        `Random selection from a complete population list (as in simple random or stratified sampling) reduces selection bias, unlike relying on volunteers, personal contacts, or whoever happens to respond first, all of which are forms of convenience sampling that risk under- or over-representing certain groups.`
      )
    );

    return {
      topicTitle: `Research Methods: Sampling and Representativeness`,
      subject: "Social Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     14. SOCIAL SCIENCES — Correlation vs causation
     ============================================================ */
  function genSocCorrelation(diff) {
    const pairs = [
      ["hours of sleep per night", "next-day concentration scores"],
      ["monthly ice cream sales", "the number of reported sunburns"],
      ["weekly hours of exercise", "self-reported stress levels"],
      ["class size", "average test scores"],
      ["hours of screen time per day", "self-reported sleep quality"],
      ["a city's number of fire stations", "its number of reported fires"],
    ];
    const pr = pick(pairs);
    const rRaw = randFloat(diff === "easy" ? 0.55 : 0.05, 0.95);
    const negative = coinFlip();
    const r = Math.round((negative ? -rRaw : rRaw) * 100) / 100;
    const absR = Math.abs(r);
    const strength = absR < 0.3 ? "weak" : absR < 0.7 ? "moderate" : "strong";
    const direction = r > 0 ? "positive" : r < 0 ? "negative" : "no";
    const classification = `a ${strength} ${direction} correlation`;

    const sourceText = `
      <p>A <strong>correlation coefficient</strong>, usually denoted r, measures the strength and direction of a linear relationship between two variables, and ranges from −1 to +1. A value near +1 indicates a strong <strong>positive</strong> correlation (as one variable increases, the other tends to increase as well); a value near −1 indicates a strong <strong>negative</strong> correlation (as one variable increases, the other tends to decrease); and a value near 0 indicates little to no linear relationship between the variables. As a general guideline, |r| below about 0.3 is considered weak, |r| between about 0.3 and 0.7 is considered moderate, and |r| above about 0.7 is considered strong.</p>
      <p>A crucial principle in interpreting correlations is that <strong>correlation does not imply causation</strong>: even a strong correlation between two variables does not, by itself, establish that changes in one variable cause changes in the other. One important reason two variables can be correlated without either causing the other is the presence of a <strong>confounding variable</strong> — a third factor that independently influences both variables, creating an apparent relationship between them.</p>
      <p>To draw a causal conclusion with more confidence, researchers generally rely on a <strong>randomized controlled experiment</strong>, in which participants are randomly assigned to different conditions (for example, a treatment group and a control group). Random assignment helps ensure that, on average, the groups are similar in every other respect, so that any difference in outcomes can more plausibly be attributed to the condition itself rather than to a confounding variable. Purely <strong>observational studies</strong>, which simply measure variables as they naturally occur without controlled assignment, cannot rule out confounding variables in the same way.</p>
      <p>A researcher measured ${pr[0]} and ${pr[1]} across a large observational sample, and found a correlation coefficient of r = ${r}.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `How would the correlation found in this study, r = ${r}, best be described?`,
        buildOptions(classification, ["weak", "moderate", "strong"].filter((s) => s !== strength).map((s) => `a ${s} ${direction} correlation`)),
        `Using the guideline in the text (|r| below ~0.3 is weak, ~0.3–0.7 is moderate, above ~0.7 is strong) and noting the sign of r (positive = same direction, negative = opposite directions), r = ${r} corresponds to ${classification}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Does this correlation, by itself, allow the researcher to conclude that ${pr[0]} causes changes in ${pr[1]}?`,
        buildOptions("No — correlation alone does not establish causation", ["Yes — any correlation this size proves a causal relationship", "Yes, but only because the correlation is measured precisely", "No, because correlation coefficients cannot be calculated for observational data"]),
        `As the text explains, correlation does not imply causation. An observed relationship between two variables, however strong, does not by itself rule out other explanations such as a confounding variable or reverse causation.`
      )
    );

    questions.push(
      q(
        "inference",
        `What is a plausible reason ${pr[0]} and ${pr[1]} could be correlated without either one causing the other?`,
        buildOptions("A third, confounding variable could independently influence both", ["Correlation coefficients are always inaccurate in practice", "The two variables must have been measured using the same instrument", "Statistical software automatically creates false correlations"]),
        `As the text explains, a confounding variable — a third factor that influences both measured variables — can produce a correlation between them even when neither directly causes the other.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which research design would allow researchers to draw a causal conclusion with more confidence than the observational study described here?`,
        buildOptions("A randomized controlled experiment, with participants randomly assigned to conditions", ["A larger observational study using the same measurement method", "A case study describing a single individual in detail", "A survey asking participants for their personal opinions about causation"]),
        `As explained in the text, random assignment in a controlled experiment helps balance out confounding variables across groups, making it more plausible that any difference in outcomes is caused by the condition being tested — something a purely observational study cannot achieve.`
      )
    );

    questions.push(
      q(
        "interpretation",
        `If a different pair of variables had a correlation coefficient of r = 0.02, what would this suggest?`,
        buildOptions("Little to no linear relationship between the two variables", ["A strong positive relationship between the two variables", "A guaranteed causal relationship between the two variables", "That one variable determines the other almost perfectly"]),
        `Since r = 0.02 is very close to 0, and values near 0 indicate little to no linear relationship (as explained in the text), this would suggest the two variables are essentially unrelated, at least in a linear sense.`
      )
    );

    questions.push(
      q(
        "comparison",
        `Compared to a correlation of r = 0.15, what does the correlation found in this study (r = ${r}) indicate about the strength of the relationship between the two variables?`,
        buildOptions(absR > 0.15 ? "A stronger relationship (further from zero)" : "A weaker relationship (closer to zero)", [absR > 0.15 ? "A weaker relationship (closer to zero)" : "A stronger relationship (further from zero)", "Exactly the same strength of relationship", "The comparison is meaningless, since correlation strength cannot be compared across studies"]),
        `Correlation strength is judged by how far |r| is from 0. Since |${r}| is ${absR > 0.15 ? "greater" : "less"} than |0.15| = 0.15, this study's correlation indicates a ${absR > 0.15 ? "stronger" : "weaker"} relationship between the variables than a correlation of 0.15 would.`
      )
    );

    return {
      topicTitle: `Correlation, Causation, and Research Design`,
      subject: "Social Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     15. HUMANITIES — Argument analysis / reasoning patterns
     ============================================================ */
  function genHumFallacy(diff) {
    const subjects = ["a new study technique", "a city's recycling programme", "a company's new product line", "a school's revised homework policy", "a gym's new training method"];
    const subj = pick(subjects);

    const patterns = {
      hasty: {
        label: "hasty generalisation",
        makeArgument: () => {
          const nSample = randInt(2, 5);
          return {
            premises: [
              `${nSample} people who tried ${subj} reported good results.`,
            ],
            conclusion: `Therefore, ${subj} works well for everyone.`,
            weakness: `it draws a broad, general conclusion about "everyone" from a very small and possibly unrepresentative sample of only ${nSample} people, without evidence that this small group reflects the wider population`,
            fix: `use a larger, more representative sample before drawing a general conclusion`,
          };
        },
      },
      falseDilemma: {
        label: "false dilemma",
        makeArgument: () => ({
          premises: [`Either we fully adopt ${subj} right away, or we accept that things will get significantly worse.`],
          conclusion: `Therefore, we must fully adopt ${subj} right away.`,
          weakness: `it presents only two extreme options (full adoption or things getting significantly worse) as if they were the only possibilities, when in reality there are likely other alternatives, such as a partial rollout or further testing`,
          fix: `consider a wider range of alternative options rather than reducing the choice to only two`,
        }),
      },
      popularity: {
        label: "appeal to popularity",
        makeArgument: () => {
          const pct = randInt(60, 92);
          return {
            premises: [`A recent informal poll found that ${pct}% of respondents believe ${subj} is a good idea.`],
            conclusion: `Therefore, ${subj} must be a good idea.`,
            weakness: `it treats popularity of a belief as evidence that the belief is true, without offering independent evidence (such as data on actual outcomes) that ${subj} is, in fact, effective`,
            fix: `provide independent evidence of effectiveness, rather than relying on how many people believe it`,
          };
        },
      },
      circular: {
        label: "circular reasoning",
        makeArgument: () => ({
          premises: [`${subj[0].toUpperCase() + subj.slice(1)} is beneficial because it produces good outcomes.`],
          conclusion: `And we know it produces good outcomes because it is beneficial.`,
          weakness: `the conclusion essentially restates the premise in different words, so the argument does not provide any independent support for its claim — it assumes what it is trying to prove`,
          fix: `provide independent evidence for the conclusion, rather than restating the premise in different words`,
        }),
      },
    };
    const keys = Object.keys(patterns);
    const usedKey = pick(keys);
    const used = patterns[usedKey];
    const built = used.makeArgument();
    const otherKeys = keys.filter((k) => k !== usedKey);

    const passage = `${built.premises.join(" ")} ${built.conclusion}`;

    const sourceText = `
      <p>An <strong>argument</strong>, in the logical sense, consists of one or more <strong>premises</strong> (statements offered as reasons or evidence) that are intended to support a <strong>conclusion</strong> (the claim the argument is trying to establish). An argument can be logically weak even if its conclusion happens to be true, if the reasoning connecting the premises to the conclusion is flawed.</p>
      <p>Some common patterns of flawed reasoning include: <strong>hasty generalisation</strong> (drawing a broad conclusion about a whole group from a small or unrepresentative sample); <strong>false dilemma</strong> (presenting only two options as if they were the only possibilities, when other alternatives exist); <strong>appeal to popularity</strong> (treating the fact that many people believe something as evidence that it is true); and <strong>circular reasoning</strong> (where the conclusion essentially restates one of the premises, so the argument provides no independent support for its own claim).</p>
      <p>Recognising these patterns does not necessarily mean a conclusion is false — it means the specific argument given does not, by itself, provide adequate logical support for that conclusion. A stronger argument for the same conclusion might still be possible using better evidence or reasoning.</p>
      <p>Consider the following short argument about ${subj}: "${passage}"</p>
    `;

    const labelCap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const allLabels = { hasty: "Hasty generalisation", falseDilemma: "False dilemma", popularity: "Appeal to popularity", circular: "Circular reasoning" };

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `Which reasoning pattern does this argument primarily rely on?`,
        buildOptions(allLabels[usedKey], otherKeys.map((k) => allLabels[k])),
        `The argument matches ${allLabels[usedKey].toLowerCase()}: ${built.weakness}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What is the main weakness of this argument's reasoning?`,
        buildOptions(labelCap(built.weakness), otherKeys.map((k) => labelCap(patterns[k].makeArgument().weakness))),
        `As explained in the text, this pattern is weak because ${built.weakness}.`
      )
    );

    questions.push(
      q(
        "inference",
        `Which change would most improve the logical strength of this argument?`,
        buildOptions(labelCap(built.fix), otherKeys.map((k) => labelCap(patterns[k].makeArgument().fix))),
        `Since the weakness lies in ${built.weakness}, the argument would be strengthened if it were to ${built.fix}.`
      )
    );

    const conclusionSentence = built.conclusion;
    const premiseSentence = built.premises[0];
    const decoy1 = "Recognising flawed reasoning patterns always means the conclusion itself is false.";
    const decoy2 = "Every argument with a true conclusion is automatically a logically strong argument.";
    questions.push(
      q(
        "conceptual",
        `Which sentence from the passage functions as the argument's conclusion — the claim the argument is trying to establish?`,
        buildOptions(conclusionSentence, [premiseSentence, decoy1, decoy2]),
        `The conclusion is the claim the argument is ultimately trying to establish. Here, "${conclusionSentence}" is presented as following from the premise, making it the conclusion, while "${premiseSentence}" is the supporting premise offered as a reason.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which sentence from the passage functions as a premise — a reason offered in support of the conclusion?`,
        buildOptions(premiseSentence, [conclusionSentence, decoy1, decoy2]),
        `A premise is a statement offered as a reason to support the conclusion. Here, "${premiseSentence}" is offered as the reason for accepting "${conclusionSentence}."`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Based on the passage alone, is this argument logically well-supported?`,
        buildOptions(`No — it relies on ${allLabels[usedKey].toLowerCase()}, which does not adequately support the conclusion`, [`Yes — the premise fully and logically guarantees the conclusion`, `Yes, because the conclusion is stated confidently`, `The passage contains no premises at all, so it cannot be evaluated`]),
        `As identified above, the argument relies on ${allLabels[usedKey].toLowerCase()}: ${built.weakness}. This means the premise, as given, does not adequately establish the conclusion — regardless of how confidently the conclusion is stated.`
      )
    );

    return {
      topicTitle: `Argument Analysis: Evaluating Everyday Reasoning`,
      subject: "Humanities",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     16. HUMANITIES — Primary vs secondary sources
     ============================================================ */
  function genHumSources(diff) {
    const sourcePool = [
      { text: "a diary written by a settler describing daily life as it happened, at the time of the events", primary: true },
      { text: "an official government record created at the time to document a decision or event", primary: true },
      { text: "a photograph taken at the scene of an event by someone who witnessed it directly", primary: true },
      { text: "a letter written by a participant to a family member shortly after the event took place", primary: true },
      { text: "a modern textbook chapter written decades later, summarising and interpreting many earlier accounts", primary: false },
      { text: "a documentary film produced fifty years after the events, drawing on interviews and earlier records", primary: false },
      { text: "a biography written long after its subject's lifetime, analysing their letters and public records", primary: false },
      { text: "an academic journal article published recently, synthesising findings from multiple earlier historical records", primary: false },
    ];
    const primaries = sourcePool.filter((s) => s.primary);
    const secondaries = sourcePool.filter((s) => !s.primary);
    const chosenPrimary = pick(primaries);
    const chosenSecondary = pick(secondaries);
    const decoyPrimaries = pickN(primaries.filter((s) => s !== chosenPrimary), 3);
    const decoySecondaries = pickN(secondaries.filter((s) => s !== chosenSecondary), 3);

    const sourceText = `
      <p>Researchers in the humanities distinguish between two broad categories of source material. A <strong>primary source</strong> is a document, record, or artefact created at the time of the event by someone with direct, first-hand involvement or observation — examples include diaries, letters, official records, photographs, and artefacts produced during the period being studied. A <strong>secondary source</strong> is created later, and analyses, summarises, or interprets primary sources rather than providing first-hand testimony — examples include textbooks, biographies, documentaries, and academic articles written after the fact.</p>
      <p>Being a primary source does not automatically make a document fully accurate: a first-hand account can still contain errors, personal bias, or an incomplete perspective, since it typically reflects only what one person observed or believed at the time. However, a source's proximity in time and direct involvement in the event can still make it valuable evidence, because it reflects information and perspectives that were not filtered through later interpretation or hindsight.</p>
      <p>Secondary sources, despite being created later, remain valuable to researchers because they can synthesise and cross-reference many primary sources, place individual events within a broader context, and apply specialised analysis that would be difficult to develop from a single first-hand account alone. Neither category of source is automatically more reliable than the other; in both cases, researchers are advised to consider the author's perspective, purpose, and possible bias, and to corroborate claims using multiple independent sources wherever possible.</p>
      <p>A researcher investigating the history of a small town has gathered a variety of materials, including both first-hand records from the period and later works of analysis.</p>
    `;

    const q1Options = shuffle([chosenPrimary, ...decoySecondaries]);
    const q2Options = shuffle([chosenSecondary, ...decoyPrimaries]);

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `Which of the following would count as a primary source for this researcher?`,
        buildOptions(labelize(chosenPrimary.text), decoySecondaries.map((s) => labelize(s.text))),
        `${labelize(chosenPrimary.text)} was created at the time of the events by someone with direct, first-hand involvement or observation, which matches the definition of a primary source given in the text.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which of the following would count as a secondary source for this researcher?`,
        buildOptions(labelize(chosenSecondary.text), decoyPrimaries.map((s) => labelize(s.text))),
        `${labelize(chosenSecondary.text)} was created well after the events, analysing or interpreting earlier material rather than offering first-hand testimony, which matches the definition of a secondary source given in the text.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which of the following best defines a primary source?`,
        buildOptions("A document or record created at the time of the event by someone with direct, first-hand involvement", ["Any source that is more than 50 years old", "A source that has been proven to be completely accurate", "A source written by a professional historian"]),
        `As defined in the text, a primary source is characterised by being created at the time of the event by a direct participant or witness — not simply by its age, guaranteed accuracy, or the author's profession.`
      )
    );

    questions.push(
      q(
        "inference",
        `According to the text, why might a source's proximity in time to the event increase its value as evidence, even though it does not guarantee accuracy?`,
        buildOptions("It may reflect information and perspectives that were not filtered through later interpretation or hindsight", ["It automatically eliminates all possibility of personal bias", "It is always more detailed than a source written later", "It guarantees that all facts reported are correct"]),
        `As explained in the text, first-hand accounts can still contain bias or error, but their closeness to the event means they capture information and perspectives before later interpretation or hindsight could reshape them — which is different from a guarantee of accuracy.`
      )
    );

    questions.push(
      q(
        "inference",
        `Why can a secondary source published decades after an event still be valuable to researchers?`,
        buildOptions("It can synthesise and cross-reference multiple primary sources and place events in a broader context", ["It is automatically more accurate than any primary source", "It removes the need to ever consult primary sources", "It has no analytical value, since it is not first-hand testimony"]),
        `As explained in the text, secondary sources are valuable precisely because they can combine and analyse many primary sources together, offering context and synthesis that a single first-hand account cannot provide on its own.`
      )
    );

    questions.push(
      q(
        "comparison",
        `According to the text, which factor is most important when evaluating the reliability of any historical source, whether primary or secondary?`,
        buildOptions("Considering the author's perspective, purpose, and possible bias, and corroborating claims with other sources", ["Only considering how old the source is", "Only considering how long the source is", "Only considering how famous the author is"]),
        `As the text states, researchers are advised to consider the author's perspective, purpose, and possible bias, and to corroborate claims using multiple independent sources — not to judge reliability by age, length, or fame alone.`
      )
    );

    function labelize(t) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }

    return {
      topicTitle: `Historical Methodology: Primary and Secondary Sources`,
      subject: "Humanities",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     17. MATHEMATICS — Conditional probability / Bayesian updating
     ============================================================ */
  function genMathBayesian(diff, scenario) {
    const flavors = {
      "medical testing": { subject: "a screening test for a medical condition", condPos: "has the condition", condPosPlural: "have the condition", condNeg: "does not have the condition", testPos: "tests positive", testNeg: "tests negative", population: "patients", conditionName: "the condition", testName: "the test" },
      "quality control": { subject: "an automated inspection system on a factory production line", condPos: "is actually defective", condPosPlural: "are actually defective", condNeg: "is not defective", testPos: "is flagged as defective", testNeg: "is flagged as acceptable", population: "manufactured units", conditionName: "a manufacturing defect", testName: "the inspection system" },
      "spam filtering": { subject: "an email spam filter", condPos: "is actually spam", condPosPlural: "are actually spam", condNeg: "is a legitimate email", testPos: "is flagged as spam", testNeg: "is flagged as legitimate", population: "incoming emails", conditionName: "spam", testName: "the filter" },
      "airport security screening": { subject: "an airport security scanner", condPos: "is actually carrying a prohibited item", condPosPlural: "are actually carrying a prohibited item", condNeg: "is not carrying a prohibited item", testPos: "triggers an alarm", testNeg: "does not trigger an alarm", population: "passengers screened", conditionName: "carrying a prohibited item", testName: "the scanner" },
    };
    const f = flavors[scenario] || flavors["medical testing"];

    const prevalencePct = diff === "easy" ? randInt(8, 20) : diff === "medium" ? randInt(3, 10) : randInt(1, 4);
    const sensPct = randInt(88, 99);
    const specPct = randInt(85, 98);
    const p = prevalencePct / 100;
    const sens = sensPct / 100;
    const spec = specPct / 100;
    const fpr = 1 - spec;

    const pPos = sens * p + fpr * (1 - p);
    const pCondGivenPos = (sens * p) / pPos;
    const pNotCondGivenPos = 1 - pCondGivenPos;

    const sourceText = `
      <p><strong>Conditional probability</strong> is the probability that one event occurs given that another event is known to have occurred, written P(A | B). <strong>Bayes' theorem</strong> provides a way to "update" a probability in light of new evidence: it relates P(A | B) to P(B | A), P(A), and P(B).</p>
      <p>A common application involves a diagnostic test with two error-prone outcomes: the test's <strong>sensitivity</strong> is the probability it correctly returns a positive result when the condition is actually present, P(test positive | condition present). The test's <strong>specificity</strong> is the probability it correctly returns a negative result when the condition is absent, P(test negative | condition absent); its complement, 1 − specificity, is the <strong>false positive rate</strong>: P(test positive | condition absent).</p>
      <p>The overall probability of a positive result, P(test positive), combines both ways a positive result can occur — a true positive (condition present and test positive) or a false positive (condition absent and test positive): P(+) = sensitivity × P(condition) + false positive rate × P(no condition).</p>
      <p>Bayes' theorem then gives the probability that the condition is genuinely present, given a positive result: P(condition | +) = [sensitivity × P(condition)] ÷ P(+). A key insight is that when the condition is rare (low <strong>prevalence</strong>, the proportion of the population that actually has the condition), even a fairly accurate test can produce a surprisingly large share of false positives among all positive results, because the much larger group of people without the condition still contributes a meaningful number of false alarms.</p>
      <p>Consider ${f.subject}. In the population being screened, ${prevalencePct}% of ${f.population} ${f.condPosPlural} (the prevalence). ${f.testName.charAt(0).toUpperCase() + f.testName.slice(1)} has a sensitivity of ${sensPct}% (it correctly flags ${sensPct}% of cases where ${f.conditionName} is genuinely present) and a specificity of ${specPct}% (it correctly clears ${specPct}% of cases where ${f.conditionName} is genuinely absent).</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the overall probability that a randomly selected member of the population ${f.testPos} (P(+))?`,
        numDistractors(pPos * 100, [sensPct, sens * p * 100, fpr * 100], "%"),
        `P(+) = (sensitivity × prevalence) + (false positive rate × (1 − prevalence)) = (${fmtNum(sens)} × ${fmtNum(p)}) + (${fmtNum(fpr)} × ${fmtNum(1 - p)}) = ${fmtNum(sens * p)} + ${fmtNum(fpr * (1 - p))} = ${fmtNum(pPos)}, i.e. ${fmtNum(pPos * 100)}%.`
      )
    );

    questions.push(
      q(
        "calculation",
        `Using Bayes' theorem, what is the probability that a member of the population who ${f.testPos} actually ${f.condPos}?`,
        numDistractors(pCondGivenPos * 100, [sensPct, prevalencePct, pNotCondGivenPos * 100], "%"),
        `P(${f.condPos} | +) = (sensitivity × prevalence) ÷ P(+) = ${fmtNum(sens * p)} ÷ ${fmtNum(pPos)} ≈ ${fmtNum(pCondGivenPos)}, i.e. about ${fmtNum(pCondGivenPos * 100)}%.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Why can the probability calculated above be much lower than ${f.testName}'s sensitivity (${sensPct}%), especially given how rare the condition is in this population?`,
        buildOptions("Because the condition is rare, the much larger group without the condition still produces enough false positives to make up a large share of all positive results", ["Because the sensitivity value given is inaccurate", "Because prevalence has no effect on this probability", "Because specificity and sensitivity always produce equal results"]),
        `As explained in the text, when prevalence is low, most of the population does not have the condition — so even a small false positive rate applied to this much larger group can generate a substantial number of false alarms, diluting the proportion of positives that are true positives.`
      )
    );

    questions.push(
      q(
        "comparison",
        `If the prevalence of ${f.conditionName} in the population were higher, while sensitivity and specificity stayed the same, what would happen to P(${f.condPos} | +)?`,
        buildOptions("It would increase", ["It would decrease", "It would stay exactly the same", "It would drop to zero"]),
        `Since P(${f.condPos} | +) = (sensitivity × prevalence) ÷ P(+), and both the numerator and P(+) depend on prevalence, a higher prevalence shifts more of the positive results toward true positives — increasing P(${f.condPos} | +).`
      )
    );

    const N = diff === "easy" ? 1000 : diff === "medium" ? 2000 : 5000;
    const totalPos = pPos * N;
    questions.push(
      q(
        "calculation",
        `Out of ${N} people in this population, approximately how many would be expected to ${f.testPos} in total?`,
        numDistractors(totalPos, [p * N, sens * N, fpr * N], ""),
        `Total positives ≈ P(+) × N = ${fmtNum(pPos)} × ${N} ≈ ${fmtNum(totalPos)}.`
      )
    );

    if (diff === "hard") {
      const fpr_ = fpr;
      const pCondGivenNeg = ((1 - sens) * p) / ((1 - sens) * p + spec * (1 - p));
      questions.push(
        q(
          "calculation",
          `Using the same reasoning in reverse, what is the probability that a member of the population who ${f.testNeg} still actually ${f.condPos}, P(${f.condPos} | −)?`,
          numDistractors(pCondGivenNeg * 100, [(1 - sens) * 100, pCondGivenPos * 100, (1 - spec) * 100], "%"),
          `P(${f.condPos} | −) = [(1 − sensitivity) × prevalence] ÷ [(1 − sensitivity) × prevalence + specificity × (1 − prevalence)] = ${fmtNum((1 - sens) * p)} ÷ [${fmtNum((1 - sens) * p)} + ${fmtNum(spec * (1 - p))}] ≈ ${fmtNum(pCondGivenNeg)}, i.e. about ${fmtNum(pCondGivenNeg * 100)}%.`
        )
      );
    } else {
      const falsePosAmongPos = pNotCondGivenPos * totalPos;
      questions.push(
        q(
          "calculation",
          `Of the people who ${f.testPos} in this population of ${N}, approximately how many would be false positives (${f.condNeg})?`,
          numDistractors(falsePosAmongPos, [totalPos - falsePosAmongPos, sens * N, fpr * N], ""),
          `False positives among all positives ≈ (1 − P(${f.condPos} | +)) × total positives = ${fmtNum(pNotCondGivenPos)} × ${fmtNum(totalPos)} ≈ ${fmtNum(falsePosAmongPos)}.`
        )
      );
    }

    return {
      topicTitle: `Conditional Probability and Bayesian Updating`,
      subject: "Mathematics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     18. MATHEMATICS — Matrices / linear transformations
     ============================================================ */
  function genMathMatrices(diff, scenario) {
    const flavors = {
      "population migration model": { unitName: "region", vecName: "population distribution vector", verb: "models how populations shift between two regions" },
      "image scaling on screen": { unitName: "pixel", vecName: "coordinate vector", verb: "models how a point on screen moves when an image is resized or sheared" },
      "economic input-output model": { unitName: "sector", vecName: "output vector", verb: "models how output in one economic sector depends on output in another" },
      "robotics coordinate transform": { unitName: "axis", vecName: "position vector", verb: "models how a robotic arm's coordinates change under a fixed transformation" },
    };
    const f = flavors[scenario] || flavors["population migration model"];

    let a, b, c, d;
    do {
      a = randInt(-4, 4); b = randInt(-4, 4); c = randInt(-4, 4); d = randInt(-4, 4);
    } while (a * d - b * c === 0);
    const det = a * d - b * c;
    const x = randInt(-6, 6), y = randInt(-6, 6);
    const imgX = a * x + b * y;
    const imgY = c * x + d * y;

    const sourceText = `
      <p>A 2×2 matrix M = [[a, b], [c, d]] can represent a <strong>linear transformation</strong> of the plane: it maps a vector (x, y) to a new vector (x′, y′) according to x′ = a·x + b·y and y′ = c·x + d·y. This single matrix ${f.verb}.</p>
      <p>The <strong>determinant</strong> of the matrix, det(M) = a·d − b·c, has a geometric meaning: it is the factor by which the transformation scales area. A shape with area A₀ before the transformation has area |det(M)| × A₀ afterward. If det(M) = 0, the transformation collapses the entire plane onto a line (or a single point), so no inverse transformation exists — information is lost and the original vector cannot always be recovered from its image.</p>
      <p>Applying the same transformation twice in succession — first mapping (x, y) to (x′, y′), then applying the same rule again to (x′, y′) — is called composing the transformation with itself.</p>
      <p>In this ${scenario || "linear algebra"} context, the transformation is given by the matrix M = [[${a}, ${b}], [${c}, ${d}]].</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `Under this transformation, what is the image of the point (${x}, ${y})?`,
        buildOptions(`(${imgX}, ${imgY})`, [`(${a * x + c * y}, ${b * x + d * y})`, `(${imgX + b}, ${imgY + c})`, `(${x + a}, ${y + d})`]),
        `x′ = a·x + b·y = ${a}×${x} + ${b}×${y} = ${a * x} + ${b * y} = ${imgX}. y′ = c·x + d·y = ${c}×${x} + ${d}×${y} = ${c * x} + ${d * y} = ${imgY}. So the image is (${imgX}, ${imgY}).`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the determinant of M?`,
        numDistractors(det, [a * d, a + d - b - c, b * c - a * d], ""),
        `det(M) = a·d − b·c = (${a} × ${d}) − (${b} × ${c}) = ${a * d} − ${b * c} = ${det}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What does the magnitude of the determinant, |det(M)| = ${Math.abs(det)}, represent geometrically?`,
        buildOptions("The factor by which the transformation scales the area of any shape", ["The distance every point moves under the transformation", "The angle by which the transformation rotates every point", "The number of dimensions the transformation operates in"]),
        `As explained in the text, |det(M)| is the area-scaling factor of the transformation: a shape's area is multiplied by |det(M)| after the transformation is applied.`
      )
    );

    const origArea = randInt(4, 20);
    const newArea = Math.abs(det) * origArea;
    questions.push(
      q(
        "calculation",
        `A shape with an original area of ${origArea} square units is transformed by M. What is its area afterward?`,
        numDistractors(newArea, [origArea + Math.abs(det), origArea / Math.abs(det) === newArea ? newArea + 2 : origArea / Math.max(1, Math.abs(det)), origArea], " sq. units"),
        `New area = |det(M)| × original area = ${Math.abs(det)} × ${origArea} = ${newArea} square units.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `If a different matrix had a determinant of exactly 0, what would this mean about the transformation it represents?`,
        buildOptions("It collapses the entire plane onto a line or a single point, and cannot be undone", ["It leaves every point exactly where it started", "It rotates every point by 90 degrees", "It only scales the x-coordinate, leaving y unchanged"]),
        `As explained in the text, det = 0 means the transformation is not invertible — it compresses two-dimensional space down to a line or point, so distinct starting points can map to the same image, and the original point cannot always be recovered.`
      )
    );

    if (diff === "hard") {
      const img2X = a * imgX + b * imgY;
      const img2Y = c * imgX + d * imgY;
      questions.push(
        q(
          "calculation",
          `If the same transformation M is applied a second time to the image found above — that is, M is applied to (${imgX}, ${imgY}) — what is the resulting point?`,
          buildOptions(`(${img2X}, ${img2Y})`, [`(${imgX * 2}, ${imgY * 2})`, `(${a * imgX + c * imgY}, ${b * imgX + d * imgY})`, `(${img2X + 1}, ${img2Y - 1})`]),
          `Applying M again to (${imgX}, ${imgY}): x″ = a·x′ + b·y′ = ${a}×${imgX} + ${b}×${imgY} = ${img2X}. y″ = c·x′ + d·y′ = ${c}×${imgX} + ${d}×${imgY} = ${img2Y}. So the twice-transformed point is (${img2X}, ${img2Y}).`
        )
      );
    } else {
      questions.push(
        q(
          "interpretation",
          `Which of the following best describes how x′ is calculated from the original coordinates (x, y)?`,
          buildOptions(`x′ is a combination of both original coordinates: x′ = a·x + b·y`, [`x′ depends only on the original x-coordinate`, `x′ depends only on the original y-coordinate`, `x′ is always equal to the determinant of M`]),
          `As defined in the text, x′ = a·x + b·y — the new x-coordinate is a weighted combination of both original coordinates, not just one of them.`
        )
      );
    }

    return {
      topicTitle: `Matrices and Linear Transformations`,
      subject: "Mathematics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     19. COMPUTATIONAL SCIENCES — Graph algorithms / shortest path
     ============================================================ */
  function genCsGraphShortestPath(diff, scenario) {
    const flavors = {
      "delivery route network": { nodeLabel: "depot/stop", edgeLabel: "road segment", weightUnit: "km", verb: "a delivery company plans routes between distribution stops" },
      "flight connections": { nodeLabel: "airport", edgeLabel: "flight", weightUnit: "hundred $", verb: "a travel planner compares flight connections between airports" },
      "public transit map": { nodeLabel: "station", edgeLabel: "transit line", weightUnit: "min", verb: "a transit planner compares travel times between stations" },
      "computer network routing": { nodeLabel: "server", edgeLabel: "network link", weightUnit: "ms latency", verb: "a network engineer compares routing paths between servers" },
    };
    const f = flavors[scenario] || flavors["delivery route network"];
    const nodes = ["A", "B", "C", "D", "E"];
    const topology = [
      ["A", "B"], ["A", "C"], ["B", "C"], ["B", "D"], ["C", "D"], ["C", "E"], ["D", "E"],
    ];
    const weightMax = diff === "easy" ? 9 : diff === "medium" ? 14 : 20;
    const edges = topology.map(([a, b]) => ({ a, b, w: randInt(2, weightMax) }));

    function dijkstra(startNode, edgeList) {
      const dist = {};
      nodes.forEach((n) => (dist[n] = Infinity));
      dist[startNode] = 0;
      const visited = new Set();
      while (visited.size < nodes.length) {
        let u = null, best = Infinity;
        for (const n of nodes) if (!visited.has(n) && dist[n] < best) { best = dist[n]; u = n; }
        if (u === null) break;
        visited.add(u);
        edgeList.forEach((e) => {
          let a = null, b = null;
          if (e.a === u) { a = e.a; b = e.b; } else if (e.b === u) { a = e.b; b = e.a; } else return;
          if (dist[a] + e.w < dist[b]) dist[b] = dist[a] + e.w;
        });
      }
      return dist;
    }

    const distFromA = dijkstra("A", edges);
    const edgeRows = edges.map((e) => `<tr><td>${e.a} – ${e.b}</td><td>${e.w} ${f.weightUnit}</td></tr>`).join("");
    const table = `<table class="table"><caption>Table 1. ${f.edgeLabel.charAt(0).toUpperCase() + f.edgeLabel.slice(1)}s and their weights</caption><thead><tr><th>Connection</th><th>Weight</th></tr></thead><tbody>${edgeRows}</tbody></table>`;

    const sourceText = `
      <p>A <strong>graph</strong> is a mathematical structure made up of <strong>nodes</strong> (also called vertices) connected by <strong>edges</strong>. When each edge carries a numeric <strong>weight</strong> (representing, for example, distance, time, or cost), the graph is called a weighted graph. The <strong>shortest path</strong> between two nodes is the route between them — possibly passing through several intermediate nodes — whose edge weights sum to the smallest total.</p>
      <p>Finding the shortest path is not simply a matter of checking the direct edge between the start and end node, if one even exists: a path through one or more intermediate nodes can have a lower total weight than a direct connection, or may be the only way to connect two nodes at all. Algorithms for this problem (such as Dijkstra's algorithm) work by progressively exploring the graph outward from the starting node, always extending the path with the currently lowest known total weight, and updating the shortest known distance to each node as shorter paths are discovered — rather than checking every possible route individually once the graph becomes large.</p>
      <p>In this scenario, ${f.verb}. The network has five ${f.nodeLabel}s, labelled A through E, connected as shown in Table 1.</p>
      ${table}
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the total weight of the shortest path from ${f.nodeLabel} A to ${f.nodeLabel} E?`,
        numDistractors(distFromA["E"], [distFromA["D"], edges.find((e) => (e.a === "C" && e.b === "E") || (e.a === "E" && e.b === "C")).w, distFromA["E"] + 3], ` ${f.weightUnit}`),
        `Comparing all possible routes from A to E and summing their edge weights, the lowest total is ${fmtNum(distFromA["E"])} ${f.weightUnit} — found by checking each possible path through the intermediate nodes and keeping the one with the smallest total weight.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What does the "shortest path" between two nodes specifically minimise?`,
        buildOptions("The sum of the edge weights along the route", ["The number of nodes visited along the route", "The alphabetical order of the nodes visited", "The number of edges in the entire graph"]),
        `As defined in the text, the shortest path is the route whose edge weights sum to the smallest total — not necessarily the route with the fewest stops, which can differ from the lowest-weight route.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the total weight of the shortest path from ${f.nodeLabel} A to ${f.nodeLabel} D?`,
        numDistractors(distFromA["D"], [distFromA["E"], edges.find((e) => (e.a === "B" && e.b === "D") || (e.a === "D" && e.b === "B")).w, distFromA["D"] + 4], ` ${f.weightUnit}`),
        `Comparing all routes from A to D and summing their edge weights, the lowest total is ${fmtNum(distFromA["D"])} ${f.weightUnit}.`
      )
    );

    const eAB = edges.find((e) => e.a === "A" && e.b === "B").w;
    const eBD = edges.find((e) => e.a === "B" && e.b === "D").w;
    const eAC = edges.find((e) => e.a === "A" && e.b === "C").w;
    const eCD = edges.find((e) => e.a === "C" && e.b === "D").w;
    const routeViaB = eAB + eBD;
    const routeViaC = eAC + eCD;
    questions.push(
      q(
        "comparison",
        `Comparing the two routes from A to D that pass through a single intermediate node — A→B→D (total ${routeViaB} ${f.weightUnit}) and A→C→D (total ${routeViaC} ${f.weightUnit}) — which has the lower total weight?`,
        buildOptions(routeViaB < routeViaC ? `A→B→D` : `A→C→D`, [routeViaB < routeViaC ? `A→C→D` : `A→B→D`, "Both routes have exactly the same total weight", "Neither route is a valid path from A to D"]),
        `A→B→D totals ${eAB} + ${eBD} = ${routeViaB} ${f.weightUnit}. A→C→D totals ${eAC} + ${eCD} = ${routeViaC} ${f.weightUnit}. The route with the lower total is ${routeViaB < routeViaC ? "A→B→D" : routeViaB > routeViaC ? "A→C→D" : "neither — they are equal"}.`
      )
    );

    if (diff !== "easy") {
      const bumpEdge = edges.find((e) => e.a === "B" && e.b === "D");
      const bump = randInt(4, 10);
      const modifiedEdges = edges.map((e) => (e === bumpEdge ? { ...e, w: e.w + bump } : e));
      const newDistE = dijkstra("A", modifiedEdges)["E"];
      questions.push(
        q(
          "inference",
          `Suppose the weight of the B–D connection increased by ${bump} ${f.weightUnit} (for example, due to congestion or a service change), while all other weights stayed the same. What would the new shortest total weight from A to E become?`,
          numDistractors(newDistE, [distFromA["E"], distFromA["E"] + bump, distFromA["E"] - bump > 0 ? distFromA["E"] - bump : distFromA["E"] + bump * 2], ` ${f.weightUnit}`),
          `With B–D increased to ${bumpEdge.w + bump} ${f.weightUnit}, recomputing the shortest route from A to E over all paths gives a new lowest total of ${fmtNum(newDistE)} ${f.weightUnit}. ${newDistE === distFromA["E"] ? "In this case, the increase did not affect the shortest path, because the shortest route did not rely on B–D." : "This differs from the original shortest distance, since the increased weight changes which route is now cheapest."}`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `Why might an algorithm need to consider indirect routes through intermediate nodes, rather than only checking the direct edge between the start and end node?`,
          buildOptions("An indirect route can have a lower total weight than the direct edge, or a direct edge might not exist at all", ["Indirect routes are always faster to compute", "Direct edges are never allowed in a weighted graph", "Algorithms are required to visit every node in the graph regardless of the goal"]),
          `As the text explains, a path through intermediate nodes can sum to less than a direct edge's weight (or the direct edge may not exist), so shortest-path algorithms must compare indirect routes rather than assuming the direct connection is best.`
        )
      );
    }

    questions.push(
      q(
        "inference",
        `Why do shortest-path algorithms typically update the "currently known shortest distance" to a node as they explore the graph, rather than fixing it the first time a route is found?`,
        buildOptions("A later-explored route might turn out to have a lower total weight than the first route found", ["The first route found is always guaranteed to be optimal", "Weights are expected to change while the algorithm runs", "Only the starting node's distance is ever allowed to update"]),
        `Since multiple routes can reach the same node, and the first-discovered route is not guaranteed to have the lowest total weight, the algorithm keeps updating a node's shortest known distance whenever a cheaper route to it is discovered — which is why the full comparison across paths is needed rather than stopping at the first path found.`
      )
    );

    return {
      topicTitle: `Graph Theory: Shortest Path in a Weighted Network`,
      subject: "Computational Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     20. COMPUTATIONAL SCIENCES — Cryptography basics / keyspace
     ============================================================ */
  function genCsCryptoKeyspace(diff, scenario) {
    const flavors = {
      "password security": { itemName: "password", charsetNote: "the characters allowed in the password" },
      "device PIN codes": { itemName: "PIN code", charsetNote: "the digits allowed in the PIN" },
      "encryption key strength": { itemName: "encryption key", charsetNote: "the symbols allowed in the key" },
      "access-code lock": { itemName: "access code", charsetNote: "the characters allowed on the keypad" },
    };
    const f = flavors[scenario] || flavors["password security"];

    const charsetOptions = [
      { size: 10, label: "digits only (0–9)" },
      { size: 26, label: "lowercase letters only (a–z)" },
      { size: 36, label: "lowercase letters and digits (a–z, 0–9)" },
      { size: 62, label: "uppercase letters, lowercase letters, and digits (A–Z, a–z, 0–9)" },
    ];
    const cs = pick(charsetOptions);
    const L = diff === "easy" ? randInt(4, 5) : diff === "medium" ? randInt(5, 7) : randInt(6, 8);
    const speed = pick([1e6, 1e7, 1e8, 1e9]);

    const keyspace = Math.pow(cs.size, L);
    const avgAttempts = keyspace / 2;
    const avgTimeSec = avgAttempts / speed;

    const sourceText = `
      <p>The <strong>keyspace</strong> of a code or password is the total number of distinct values it could possibly take, given its length and the set of allowed characters (the <strong>character set</strong>). If a character set has c possible characters and the code has a fixed length of L characters, the keyspace is c^L — because each of the L positions can independently be any of the c characters.</p>
      <p>A <strong>brute-force attack</strong> tries possible values systematically until the correct one is found. In the worst case, this requires trying the entire keyspace; on average, assuming the correct value is equally likely to be anywhere in the keyspace, it takes about half of the keyspace (keyspace ÷ 2) to find it. The expected time to crack a code by brute force is therefore approximately (keyspace ÷ 2) ÷ (attempts per second) for an attacker capable of testing values at a given rate.</p>
      <p>Because keyspace is calculated as c raised to the power of L, both increasing the length L and increasing the character set size c grow the keyspace <strong>multiplicatively</strong>, not just additively — adding a single character to the length multiplies the entire keyspace by c, rather than simply adding a fixed number of possibilities.</p>
      <p>Consider a system using ${f.itemName}s of a fixed length of L = ${L} characters, where ${f.charsetNote} are: ${cs.label} (c = ${cs.size}). An attacker is able to test ${speed.toExponential(0).replace("e+", " × 10^")} attempts per second.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the total keyspace for this ${f.itemName} format (the number of distinct possible ${f.itemName}s)?`,
        numDistractors(keyspace, [cs.size * L, Math.pow(cs.size, L - 1), Math.pow(cs.size + 1, L)], ""),
        `Keyspace = c^L = ${cs.size}^${L} = ${fmtNum(keyspace)}.`
      )
    );

    questions.push(
      q(
        "calculation",
        `On average, how many attempts would a brute-force attacker need to try before finding the correct ${f.itemName} (assuming it is equally likely to be anywhere in the keyspace)?`,
        numDistractors(avgAttempts, [keyspace, keyspace / L, keyspace / cs.size], ""),
        `On average, a brute-force search finds the target after checking about half the keyspace: keyspace ÷ 2 = ${fmtNum(keyspace)} ÷ 2 = ${fmtNum(avgAttempts)} attempts.`
      )
    );

    questions.push(
      q(
        "calculation",
        `At a testing rate of ${speed.toExponential(0).replace("e+", " × 10^")} attempts per second, approximately how long (in seconds) would the average brute-force attack take?`,
        numDistractors(avgTimeSec, [avgTimeSec * cs.size, avgTimeSec / L, keyspace / speed], " s"),
        `Average time = average attempts ÷ speed = ${fmtNum(avgAttempts)} ÷ ${speed.toExponential(0).replace("e+", " × 10^")} ≈ ${fmtNum(avgTimeSec)} seconds.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `If one additional character were added to the ${f.itemName} length (keeping the same character set), how would the keyspace change?`,
        buildOptions(`It would be multiplied by ${cs.size} (the character set size)`, [`It would increase by exactly ${cs.size}`, "It would stay the same, since only the character set determines keyspace", "It would double, regardless of the character set"]),
        `Since keyspace = c^L, increasing L by 1 changes the keyspace from c^L to c^(L+1) = c^L × c — a multiplication by c = ${cs.size}, not a fixed addition.`
      )
    );

    const altCs = pick(charsetOptions.filter((o) => o.size !== cs.size));
    const keyspaceExtendLength = Math.pow(cs.size, L + 1);
    const keyspaceSwitchCharset = Math.pow(altCs.size, L);
    const biggerIsLength = keyspaceExtendLength > keyspaceSwitchCharset;
    questions.push(
      q(
        "comparison",
        `Which would increase the keyspace more: adding one extra character to the length (making it L = ${L + 1}, with the original character set of ${cs.size} characters), or switching to a character set of ${altCs.size} characters while keeping the length at L = ${L}?`,
        buildOptions(biggerIsLength ? "Adding one extra character to the length" : "Switching to the larger character set", [biggerIsLength ? "Switching to the larger character set" : "Adding one extra character to the length", "Both changes would increase the keyspace by exactly the same amount", "Neither change would affect the keyspace"]),
        `Extending the length gives c^(L+1) = ${cs.size}^${L + 1} = ${fmtNum(keyspaceExtendLength)}. Switching the character set gives ${altCs.size}^${L} = ${fmtNum(keyspaceSwitchCharset)}. The larger resulting keyspace comes from ${biggerIsLength ? "extending the length" : "switching to the larger character set"}.`
      )
    );

    const worstCaseTime = keyspace / speed;
    questions.push(
      q(
        "calculation",
        `What is the worst-case time (in seconds) for the brute-force attack — that is, the time to test the entire keyspace if necessary — at the same rate of ${speed.toExponential(0).replace("e+", " × 10^")} attempts per second?`,
        numDistractors(worstCaseTime, [avgTimeSec, worstCaseTime / 2 === avgTimeSec ? worstCaseTime * 2 : worstCaseTime / 2, worstCaseTime * cs.size], " s"),
        `Worst-case time = full keyspace ÷ speed = ${fmtNum(keyspace)} ÷ ${speed.toExponential(0).replace("e+", " × 10^")} ≈ ${fmtNum(worstCaseTime)} seconds — exactly twice the average-case time found earlier, since the average case only requires testing half the keyspace.`
      )
    );

    return {
      topicTitle: `Cryptography Fundamentals: Keyspace and Brute-Force Resistance`,
      subject: "Computational Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }
  /* ============================================================
     21. NATURAL SCIENCES — Enzyme kinetics / temperature effect
     ============================================================ */
  function genNatSciEnzymeKinetics(diff, scenario) {
    const flavors = {
      "laboratory enzyme assay": { subjectNoun: "a research technician", settingNoun: "a laboratory enzyme assay", enzymeNoun: "a digestive enzyme" },
      "industrial fermentation process": { subjectNoun: "a process engineer", settingNoun: "an industrial fermentation process", enzymeNoun: "a fermentation enzyme" },
      "food spoilage study": { subjectNoun: "a food scientist", settingNoun: "a food spoilage study", enzymeNoun: "a spoilage-related enzyme" },
      "biology coursework experiment": { subjectNoun: "a biology student", settingNoun: "a coursework experiment", enzymeNoun: "a model enzyme" },
    };
    const f = flavors[scenario] || flavors["laboratory enzyme assay"];

    const T0 = pick([15, 20, 25]);
    const R0 = randInt(4, 12);
    const Topt = T0 + pick([20, 30]);

    const sourceText = `
      <p>Enzymes are biological catalysts that speed up chemical reactions. Within a normal operating range, the rate of many enzyme-catalysed reactions increases as temperature rises, because molecules move and collide more frequently and with more energy at higher temperatures. As a rough rule of thumb used for estimation in this context, the reaction rate approximately <strong>doubles for every 10°C rise</strong> in temperature, within this normal range.</p>
      <p>However, this trend does not continue indefinitely. Enzymes are proteins with a specific three-dimensional shape that allows them to bind their target molecules efficiently. Beyond an <strong>optimum temperature</strong>, the enzyme begins to <strong>denature</strong> — its structure starts to break down — so its effectiveness, and therefore the reaction rate, drops sharply even though the temperature keeps rising.</p>
      <p>${f.subjectNoun[0].toUpperCase() + f.subjectNoun.slice(1)} is studying ${f.enzymeNoun} as part of ${f.settingNoun}. At a baseline temperature of ${T0}°C, the measured reaction rate is ${R0} units. Based on prior characterisation of this particular enzyme, its optimum temperature is approximately ${Topt}°C, above which the rate is expected to fall sharply due to denaturation.</p>
      <p>Using the doubling rule described above, the technician wants to predict how the reaction rate should change as temperature increases toward the optimum, and to reason about what happens beyond it.</p>
    `;

    const questions = [];
    const rateAt10 = R0 * 2;
    questions.push(
      q(
        "calculation",
        `Using the doubling rule, what reaction rate would be predicted at ${T0 + 10}°C (10°C above the baseline)?`,
        numDistractors(rateAt10, [R0 * 1.5, R0 + 10, R0 * 3], " units"),
        `Using the rule that the rate approximately doubles for every 10°C rise: predicted rate = ${R0} × 2 = ${rateAt10} units.`
      )
    );

    const rateAt20 = R0 * 4;
    questions.push(
      q(
        "calculation",
        `Using the same rule, what reaction rate would be predicted at ${T0 + 20}°C (20°C above the baseline, two 10°C increments)?`,
        numDistractors(rateAt20, [R0 * 3, rateAt10 + R0, R0 * 6], " units"),
        `Each 10°C increment doubles the rate, so two increments multiply the rate by 2 × 2 = 4: predicted rate = ${R0} × 4 = ${rateAt20} units.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Why does the reaction rate decrease sharply above the enzyme's optimum temperature, despite the general trend of rates increasing with temperature?`,
        buildOptions("The enzyme begins to denature at high temperatures, losing the shape it needs to function effectively", ["The substrate becomes chemically inert above the optimum temperature", "The reaction reverses direction above the optimum temperature", "Temperature no longer has any physical effect on molecular motion above the optimum"]),
        `As explained in the text, enzymes are proteins with a specific shape required for their function; beyond the optimum temperature, this shape begins to break down (denature), reducing the enzyme's effectiveness and causing the rate to fall despite the higher temperature.`
      )
    );

    questions.push(
      q(
        "table",
        `Based on the doubling rule and the baseline rate of ${R0} units at ${T0}°C, what reaction rate would be predicted at ${T0 + 30}°C — assuming, for this estimate, that the optimum temperature had not yet been reached?`,
        numDistractors(R0 * 8, [R0 * 6, R0 * 4, R0 * 9], " units"),
        `Three 10°C increments from the baseline multiply the rate by 2 × 2 × 2 = 8: predicted rate = ${R0} × 8 = ${R0 * 8} units (this estimate would only hold if ${T0 + 30}°C were still at or below the enzyme's actual optimum temperature).`
      )
    );

    questions.push(
      q(
        "comparison",
        `Compared to the interval from ${T0}°C to ${T0 + 10}°C, would the reaction rate generally be expected to increase more or less across the interval from ${Topt}°C to ${Topt + 10}°C?`,
        buildOptions("Less — the second interval is above the optimum temperature, where denaturation causes the rate to fall rather than continue rising", ["More — every 10°C interval produces a larger absolute increase in rate than the one before it", "The same — the doubling rule applies equally at every temperature range, without exception", "It cannot be estimated, since temperature has no consistent relationship with reaction rate"]),
        `Since ${Topt}°C is at (or above) the enzyme's optimum, moving another 10°C higher pushes further past the point where the enzyme functions best, causing the rate to fall due to denaturation — unlike the interval below the optimum, where the doubling rule predicts an increase.`
      )
    );

    if (diff === "hard") {
      const targetMultiple = pick([8, 16]);
      const neededDegrees = Math.log2(targetMultiple) * 10;
      questions.push(
        q(
          "calculation",
          `Assuming the doubling rule continued to apply (i.e. staying below the optimum temperature), approximately how many degrees above the baseline of ${T0}°C would be needed for the reaction rate to reach about ${targetMultiple} times its baseline value?`,
          numDistractors(neededDegrees, [targetMultiple, neededDegrees / 2, neededDegrees + 10], "°C"),
          `Reaching ${targetMultiple} times the baseline rate requires ${targetMultiple} to be reached by repeated doubling: 2^${Math.log2(targetMultiple)} = ${targetMultiple}, meaning ${Math.log2(targetMultiple)} separate 10°C increments, or ${fmtNum(neededDegrees)}°C above the baseline in total.`
        )
      );
    } else {
      questions.push(
        q(
          "inference",
          `A researcher measures the reaction rate at a temperature well above ${Topt}°C and finds it is lower than the rate measured at ${T0}°C. Is this consistent with the explanation given in the text?`,
          buildOptions("Yes — temperatures well above the optimum are expected to reduce the rate due to denaturation, even below the baseline rate", ["No — the rate should always be higher at a higher temperature, with no exceptions", "No — the doubling rule guarantees the rate can never decrease once it has increased", "Yes, but only if the substrate concentration was also changed at the same time"]),
          `As explained in the text, temperatures well beyond the optimum cause significant denaturation, which can reduce the enzyme's effectiveness so much that the rate falls below even the original baseline rate — this is consistent with, not contrary to, the explanation given.`
        )
      );
    }

    return {
      topicTitle: `Enzyme Kinetics: Temperature Effects on Reaction Rate`,
      subject: "Natural Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     22. NATURAL SCIENCES — Genetics / Punnett squares
     ============================================================ */
  function genNatSciGenetics(diff, scenario) {
    const traitPairs = [
      { dom: "purple flower colour", rec: "white flower colour", organism: "pea plants" },
      { dom: "round seed shape", rec: "wrinkled seed shape", organism: "pea plants" },
      { dom: "black coat colour", rec: "brown coat colour", organism: "a mammal breeding line" },
      { dom: "red eye colour", rec: "white eye colour", organism: "fruit flies" },
    ];
    const tp = pick(traitPairs);
    const crossType = coinFlip() ? "AaAa" : "AaAa"; // keep AaAa as primary; use variety via a second branch below
    const useTestcross = diff !== "easy" && coinFlip(0.4);

    function crossProbs(isTestcross) {
      if (isTestcross) return { AA: 0, Aa: 0.5, aa: 0.5 };
      return { AA: 0.25, Aa: 0.5, aa: 0.25 };
    }
    const probs = crossProbs(useTestcross);
    const pRecessive = probs.aa;
    const pHet = probs.Aa;

    const sourceText = `
      <p>In classical genetics, many traits are controlled by a single gene with two versions, or <strong>alleles</strong>: a <strong>dominant</strong> allele (conventionally written with a capital letter, A) and a <strong>recessive</strong> allele (written with a lowercase letter, a). An organism's <strong>genotype</strong> is its combination of alleles (AA, Aa, or aa); its <strong>phenotype</strong> is its observable trait. Because the dominant allele masks the recessive allele when both are present, genotypes AA and Aa produce the same (dominant) phenotype, while only genotype aa produces the recessive phenotype.</p>
      <p>A <strong>Punnett square</strong> is a diagram used to predict the probability of each possible offspring genotype from a cross between two parents with known genotypes, based on the different combinations of alleles each parent can pass on. Crossing two heterozygous parents (Aa × Aa) produces offspring in the ratio 1 AA : 2 Aa : 1 aa — that is, a 25% chance of AA, a 50% chance of Aa, and a 25% chance of aa, giving a 3:1 ratio of dominant to recessive phenotype. A <strong>testcross</strong>, crossing a heterozygous individual (Aa) with a homozygous recessive individual (aa), instead produces offspring in the ratio 1 Aa : 1 aa (50% each) — this design is often used specifically to help determine an unknown parent's genotype from the phenotype ratio of its offspring.</p>
      <p>In ${tp.organism}, ${tp.dom} is dominant over ${tp.rec}. ${useTestcross ? `A heterozygous individual (Aa) is crossed with a homozygous recessive individual (aa) — a testcross.` : `Two heterozygous individuals (Aa × Aa) are crossed.`}</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the probability that an offspring from this cross displays the recessive phenotype (${tp.rec})?`,
        buildOptions(`${fmtNum(pRecessive * 100)}%`, useTestcross ? ["25%", "0%", "100%"] : ["50%", "0%", "100%"]),
        useTestcross
          ? `In a testcross (Aa × aa), offspring genotypes are 50% Aa and 50% aa. Only aa shows the recessive phenotype, so the probability is ${fmtNum(pRecessive * 100)}%.`
          : `In an Aa × Aa cross, offspring genotypes occur in a 1:2:1 ratio (AA:Aa:aa). Only the aa genotype (¼ of offspring) shows the recessive phenotype, so the probability is ${fmtNum(pRecessive * 100)}%.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the probability that an offspring from this cross has the heterozygous genotype (Aa)?`,
        buildOptions(`${fmtNum(pHet * 100)}%`, useTestcross ? ["25%", "0%", "100%"] : ["25%", "0%", "100%"]),
        useTestcross ? `In a testcross (Aa × aa), half of the offspring are expected to be Aa: ${fmtNum(pHet * 100)}%.` : `In an Aa × Aa cross, the 1:2:1 genotype ratio gives Aa a probability of 2/4 = ${fmtNum(pHet * 100)}%.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What is the key difference between an organism's genotype and its phenotype?`,
        buildOptions("Genotype is the combination of alleles the organism carries; phenotype is the observable trait that results", ["Genotype is only relevant to plants, while phenotype applies only to animals", "Genotype and phenotype always correspond one-to-one, so genotype can be inferred from phenotype with certainty", "Phenotype determines which alleles are passed on to offspring, while genotype does not"]),
        `As defined in the text, genotype refers to the underlying allele combination (AA, Aa, or aa), while phenotype refers to the resulting observable characteristic — and because of dominance, more than one genotype (AA and Aa) can produce the same phenotype.`
      )
    );

    if (diff !== "easy") {
      const pBoth = pRecessive * pRecessive;
      questions.push(
        q(
          "calculation",
          `If two offspring from this cross are considered independently, what is the probability that both display the recessive phenotype?`,
          buildOptions(`${fmtNum(pBoth * 100)}%`, [`${fmtNum(pRecessive * 100)}%`, `${fmtNum(pRecessive * 2 * 100)}%`, "100%"]),
          `Since each offspring's genotype is determined independently, the probability that both show the recessive phenotype is found by multiplying the individual probabilities: ${fmtNum(pRecessive)} × ${fmtNum(pRecessive)} = ${fmtNum(pBoth)}, i.e. ${fmtNum(pBoth * 100)}%.`
        )
      );
    } else {
      questions.push(
        q(
          "conceptual",
          `Why do genotypes AA and Aa produce the same phenotype in this trait?`,
          buildOptions("Because the dominant allele (A) masks the effect of the recessive allele (a) whenever at least one copy of A is present", ["Because AA and Aa are actually the same genotype written differently", "Because phenotype is determined only by the mother's genotype", "Because recessive alleles are destroyed during reproduction"]),
          `As explained in the text, dominance means the dominant allele's effect is expressed whenever at least one copy is present, which is why both AA and Aa produce the dominant phenotype, while only aa (no dominant allele present) produces the recessive phenotype.`
        )
      );
    }

    questions.push(
      q(
        "comparison",
        `Which type of cross would be expected to produce a higher proportion of offspring with the recessive phenotype: Aa × Aa, or a testcross (Aa × aa)?`,
        buildOptions("A testcross (Aa × aa), which produces 50% recessive offspring, compared to 25% from Aa × Aa", ["Aa × Aa, which produces 50% recessive offspring, compared to 25% from a testcross", "Both produce exactly the same proportion of recessive offspring", "Neither cross can produce any recessive offspring"]),
        `As given in the text, Aa × Aa produces 25% recessive-phenotype offspring (aa), while a testcross (Aa × aa) produces 50% — so the testcross produces a higher proportion of recessive-phenotype offspring.`
      )
    );

    questions.push(
      q(
        "inference",
        `Why might a researcher specifically choose to perform a testcross (crossing an individual of unknown genotype with a homozygous recessive individual, aa) rather than crossing it with another individual showing the dominant phenotype?`,
        buildOptions("Because the aa parent can only contribute recessive alleles, so the offspring phenotype ratio directly reveals whether the unknown parent is AA or Aa", ["Because aa individuals always produce more offspring than AA or Aa individuals", "Because crossing with an aa individual guarantees all offspring will show the dominant phenotype", "Because testcrosses remove the need to consider dominance at all"]),
        `Since the aa parent contributes only recessive alleles, any dominant-phenotype offspring must have received a dominant allele from the unknown parent — so if any recessive-phenotype offspring appear, the unknown parent must be Aa (heterozygous), while an AA unknown parent would produce no recessive-phenotype offspring at all. This is exactly why testcrosses are useful for determining an unknown genotype.`
      )
    );

    return {
      topicTitle: `Genetics: Punnett Squares and Inheritance Probability`,
      subject: "Natural Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     23. ENGINEERING — Hydrostatic pressure (tank/pipe/dam scenario)
     ============================================================ */
  function genEngHydrostatics(diff, scenario) {
    const flavors = {
      "water storage tank": { structure: "a cylindrical water storage tank", wallNoun: "tank wall" },
      "irrigation pipe network": { structure: "an irrigation pipe network fed from an elevated tank", wallNoun: "pipe wall" },
      "dam wall design": { structure: "a small dam holding back a reservoir", wallNoun: "dam wall" },
      "aquarium tank design": { structure: "a large aquarium display tank", wallNoun: "tank wall" },
    };
    const f = flavors[scenario] || flavors["water storage tank"];

    const rho = 1000; // kg/m3, water
    const g = 9.81;
    const h = diff === "easy" ? randInt(2, 5) : diff === "medium" ? randInt(4, 8) : randInt(6, 12);
    const h2 = Math.max(1, h - randInt(1, Math.max(1, Math.floor(h / 2))));

    const pBottom = rho * g * h;
    const pAtH2 = rho * g * h2;

    const sourceText = `
      <p>In a fluid at rest, pressure increases with depth due to the weight of the fluid above. The <strong>hydrostatic pressure</strong> at a depth h below the surface of a fluid (relative to the surface, where pressure is taken as zero) is given by: p = ρ·g·h, where ρ is the fluid's density (kg/m³), g is the acceleration due to gravity (approximately 9.81 m/s²), and h is the depth in metres. This gives pressure in pascals (Pa).</p>
      <p>An important and sometimes counter-intuitive property of hydrostatic pressure is that it depends <strong>only on depth and fluid density</strong> — not on the shape, width, or total volume of the container. Two containers with completely different shapes and widths, but filled with the same fluid to the same height, will have identical pressure at the bottom. This is sometimes called the <strong>hydrostatic paradox</strong>.</p>
      <p>The total <strong>force</strong> exerted by a fluid on a submerged flat surface (such as a section of wall) can be found by multiplying the pressure at that point by the area of the surface: F = p × A.</p>
      <p>Consider ${f.structure}, filled with water (density ρ = 1,000 kg/m³) to a height of ${h} m. (All pressures below are given relative to the surface, ignoring atmospheric pressure.)</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the (gauge) pressure at the bottom of the water, at a depth of ${h} m?`,
        numDistractors(pBottom, [rho * g * h * 2, rho * h, g * h], " Pa"),
        `p = ρ·g·h = 1,000 × 9.81 × ${h} = ${fmtNum(pBottom)} Pa.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the pressure at a shallower depth of ${h2} m (measured from the surface)?`,
        numDistractors(pAtH2, [pBottom, rho * g * (h - h2), pAtH2 / 2], " Pa"),
        `p = ρ·g·h₂ = 1,000 × 9.81 × ${h2} = ${fmtNum(pAtH2)} Pa.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Suppose a second, much wider container were also filled with water to the same height of ${h} m. How would the pressure at its bottom compare to the pressure found above?`,
        buildOptions("It would be exactly the same, since pressure depends only on depth and fluid density, not on the container's width", ["It would be higher, since a wider container holds more total water", "It would be lower, since the weight is spread across a larger area", "It cannot be determined without knowing the exact shape of the container"]),
        `As explained in the text (the hydrostatic paradox), pressure at a given depth depends only on fluid density and depth — not on the container's shape or width — so a wider container filled to the same height would have exactly the same pressure at the bottom.`
      )
    );

    const wallArea = randInt(2, 8);
    const forceOnWall = pBottom * wallArea;
    questions.push(
      q(
        "calculation",
        `A section of the ${f.wallNoun} near the bottom has a submerged area of ${wallArea} m². Approximately what total force does the water exert on this section? (Use the pressure at the bottom found above, as an approximation.)`,
        numDistractors(forceOnWall, [pBottom / wallArea, pBottom + wallArea, pBottom * wallArea * 2], " N"),
        `F = p × A = ${fmtNum(pBottom)} × ${wallArea} = ${fmtNum(forceOnWall)} N.`
      )
    );

    const pDiff = pBottom - pAtH2;
    questions.push(
      q(
        "calculation",
        `What is the difference in pressure between the depth of ${h} m and the shallower depth of ${h2} m?`,
        numDistractors(pDiff, [pBottom + pAtH2, pBottom / pAtH2 === pDiff ? pDiff + 500 : pBottom / Math.max(1, pAtH2), rho * g * (h + h2)], " Pa"),
        `Δp = ρ·g·(h − h₂) = 1,000 × 9.81 × (${h} − ${h2}) = 1,000 × 9.81 × ${h - h2} = ${fmtNum(pDiff)} Pa. (This matches the direct difference: ${fmtNum(pBottom)} − ${fmtNum(pAtH2)} = ${fmtNum(pDiff)} Pa.)`
      )
    );

    if (diff === "hard") {
      const rhoSalt = 1025;
      const pBottomSalt = rhoSalt * g * h;
      questions.push(
        q(
          "calculation",
          `If the same tank were instead filled with saltwater (density ρ = 1,025 kg/m³) to the same height of ${h} m, what would the pressure at the bottom be?`,
          numDistractors(pBottomSalt, [pBottom, pBottomSalt / 2, pBottom * 2], " Pa"),
          `p = ρ·g·h = 1,025 × 9.81 × ${h} = ${fmtNum(pBottomSalt)} Pa — higher than with freshwater, since pressure is directly proportional to fluid density.`
        )
      );
    } else {
      questions.push(
        q(
          "comparison",
          `If the tank were instead filled with a denser fluid to the same height of ${h} m, how would the pressure at the bottom change?`,
          buildOptions("It would increase, since pressure is directly proportional to fluid density", ["It would decrease, since denser fluids exert less pressure", "It would stay exactly the same, since density does not affect pressure", "It would depend only on the container's shape, not the fluid"]),
          `Since p = ρ·g·h, pressure is directly proportional to fluid density ρ. With height and gravity unchanged, a denser fluid produces a higher pressure at the same depth.`
        )
      );
    }

    return {
      topicTitle: `Fluid Mechanics: Hydrostatic Pressure`,
      subject: "Engineering",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     24. ENGINEERING — Manufacturing / Overall Equipment Effectiveness
     ============================================================ */
  function genEngOEE(diff, scenario) {
    const flavors = {
      "automotive parts plant": { line: "a stamping press line", unitName: "brackets" },
      "electronics assembly line": { line: "a circuit-board assembly line", unitName: "boards" },
      "packaging plant": { line: "a bottle-filling line", unitName: "bottles" },
      "textile manufacturing line": { line: "a fabric-cutting line", unitName: "panels" },
    };
    const f = flavors[scenario] || flavors["automotive parts plant"];

    const planned = 480; // minutes in a shift
    const downtime = randInt(20, diff === "easy" ? 60 : 100);
    const runTime = planned - downtime;
    const idealRate = randInt(2, 6); // units per minute
    const maxPossible = runTime * idealRate;
    const totalUnits = Math.round(maxPossible * (randInt(70, 95) / 100));
    const defects = Math.round(totalUnits * (randInt(2, diff === "hard" ? 12 : 8) / 100));
    const goodUnits = totalUnits - defects;

    const availability = runTime / planned;
    const performance = totalUnits / maxPossible;
    const quality = goodUnits / totalUnits;
    const oee = availability * performance * quality;

    const sourceText = `
      <p><strong>Overall Equipment Effectiveness (OEE)</strong> is a widely used manufacturing metric that combines three separate factors into a single measure of how effectively a production line is being used: OEE = Availability × Performance × Quality.</p>
      <p><strong>Availability</strong> measures how much of the planned production time the line was actually running: Availability = actual run time ÷ planned production time. It is reduced by unplanned stops, breakdowns, and changeovers. <strong>Performance</strong> measures how close the line's actual output rate was to its maximum possible ("ideal") rate while it was running: Performance = actual units produced ÷ (run time × ideal rate per minute). It is reduced by minor stoppages, slow cycles, and reduced speed. <strong>Quality</strong> measures the proportion of produced units that meet quality standards: Quality = good units ÷ total units produced. It is reduced by defects and rework.</p>
      <p>Because OEE multiplies all three factors together, a shortfall in any single factor reduces the overall score, even if the other two factors are strong — a line that runs 100% of the time (Availability = 100%) but produces 50% defective output (Quality = 50%) still has a low OEE overall.</p>
      <p>${f.line.charAt(0).toUpperCase() + f.line.slice(1)} at a factory runs a ${planned}-minute shift. During the shift, ${downtime} minutes were lost to unplanned downtime, leaving ${runTime} minutes of actual run time. The line's ideal production rate is ${idealRate} ${f.unitName} per minute. During the run time, the line actually produced ${totalUnits} ${f.unitName} in total, of which ${goodUnits} met quality standards (the remaining ${defects} were defective).</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the line's Availability for this shift?`,
        numDistractors(availability * 100, [(downtime / planned) * 100, (runTime / totalUnits) * 100 > 100 ? 50 : (runTime / totalUnits) * 100, availability * 100 + 10], "%"),
        `Availability = run time ÷ planned time = ${runTime} ÷ ${planned} = ${fmtNum(availability)}, i.e. ${fmtNum(availability * 100)}%.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the line's Performance for this shift?`,
        numDistractors(performance * 100, [(totalUnits / runTime) * 100, (totalUnits / planned) * 100, performance * 100 - 15], "%"),
        `Maximum possible output at the ideal rate = run time × ideal rate = ${runTime} × ${idealRate} = ${maxPossible} ${f.unitName}. Performance = actual output ÷ maximum possible = ${totalUnits} ÷ ${maxPossible} = ${fmtNum(performance)}, i.e. ${fmtNum(performance * 100)}%.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the line's Quality for this shift?`,
        numDistractors(quality * 100, [(defects / totalUnits) * 100, (goodUnits / planned) * 100 > 100 ? 60 : (goodUnits / planned) * 100, quality * 100 - 5], "%"),
        `Quality = good units ÷ total units = ${goodUnits} ÷ ${totalUnits} = ${fmtNum(quality)}, i.e. ${fmtNum(quality * 100)}%.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the line's overall OEE for this shift?`,
        numDistractors(oee * 100, [((availability + performance + quality) / 3) * 100, availability * 100, performance * quality * 100], "%"),
        `OEE = Availability × Performance × Quality = ${fmtNum(availability)} × ${fmtNum(performance)} × ${fmtNum(quality)} ≈ ${fmtNum(oee)}, i.e. about ${fmtNum(oee * 100)}%.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which of the following actions would primarily improve Availability specifically, rather than Performance or Quality?`,
        buildOptions("Reducing unplanned downtime, such as by preventing breakdowns or speeding up changeovers", ["Running the machine closer to its maximum ideal speed", "Reducing the number of defective units produced", "Increasing the length of the planned shift"]),
        `As defined in the text, Availability specifically reflects how much of the planned time the line was actually running, so reducing unplanned downtime directly improves Availability — while running faster affects Performance, and reducing defects affects Quality.`
      )
    );

    questions.push(
      q(
        "inference",
        `If Quality fell to a lower value while Availability and Performance stayed exactly the same, what would happen to OEE?`,
        buildOptions("OEE would decrease proportionally, since OEE is the product of all three factors", ["OEE would stay the same, since Quality is a minor factor in the formula", "OEE would increase, since Quality is inversely related to OEE", "OEE could not be calculated without knowing the cause of the quality drop"]),
        `Since OEE = Availability × Performance × Quality, a decrease in any one factor — including Quality — directly reduces the product, and therefore reduces OEE, even if the other two factors are unchanged.`
      )
    );

    return {
      topicTitle: `Manufacturing Metrics: Overall Equipment Effectiveness (OEE)`,
      subject: "Engineering",
      difficulty: diff,
      sourceText,
      questions,
    };
  }
  /* ============================================================
     25. BUSINESS ADMINISTRATION — Reorder point & demand variability
     ============================================================ */
  function genBusReorderPoint(diff, scenario) {
    const flavors = {
      "retail warehouse": { biz: "a retail warehouse", item: "units of a best-selling kitchen appliance" },
      "auto parts distributor": { biz: "an auto parts distributor", item: "replacement brake discs" },
      "online grocery fulfilment centre": { biz: "an online grocery fulfilment centre", item: "cases of a popular beverage" },
      "electronics wholesaler": { biz: "an electronics wholesaler", item: "units of a wireless charger" },
    };
    const f = flavors[scenario] || flavors["retail warehouse"];

    const avgDemand = randInt(15, 60); // units/day
    const leadTime = randInt(3, diff === "easy" ? 7 : 12); // days
    const maxDemand = avgDemand + randInt(5, diff === "hard" ? 40 : 25);

    const baseROP = avgDemand * leadTime;
    const safetyStock = (maxDemand - avgDemand) * leadTime;
    const ROP = baseROP + safetyStock;

    const sourceText = `
      <p>The <strong>reorder point (ROP)</strong> is the inventory level at which a business should place a new order with its supplier, so that the new stock arrives before the current stock runs out. Without accounting for uncertainty, the basic reorder point is: ROP = average daily demand × lead time, where <strong>lead time</strong> is the number of days between placing an order and receiving it.</p>
      <p>This basic formula assumes demand is perfectly steady. In practice, daily demand varies — some days are busier than others — which creates the risk of a <strong>stockout</strong> (running out of stock before the new order arrives) if demand happens to run higher than average during the lead time window. To guard against this, businesses commonly add <strong>safety stock</strong>: extra inventory held as a buffer. A simple, illustrative way to size this buffer is: safety stock = (maximum expected daily demand − average daily demand) × lead time, which covers the extra demand that would occur if the maximum expected demand level held for the entire lead time. The full reorder point then becomes: ROP = (average daily demand × lead time) + safety stock.</p>
      <p>${f.biz.charAt(0).toUpperCase() + f.biz.slice(1)} stocks ${f.item}. Average daily demand is ${avgDemand} units, and the supplier's lead time is ${leadTime} days. Based on historical sales data, the maximum daily demand observed for this item is ${maxDemand} units.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the basic reorder point (ignoring demand variability), based on average daily demand alone?`,
        numDistractors(baseROP, [avgDemand + leadTime, maxDemand * leadTime, avgDemand * leadTime / 2], " units"),
        `Base ROP = average daily demand × lead time = ${avgDemand} × ${leadTime} = ${baseROP} units.`
      )
    );

    questions.push(
      q(
        "calculation",
        `Using the simplified approach described in the text, what safety stock should be held to buffer against demand variability?`,
        numDistractors(safetyStock, [maxDemand * leadTime, (maxDemand - avgDemand), avgDemand * leadTime], " units"),
        `Safety stock = (maximum daily demand − average daily demand) × lead time = (${maxDemand} − ${avgDemand}) × ${leadTime} = ${maxDemand - avgDemand} × ${leadTime} = ${safetyStock} units.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the full reorder point, including safety stock?`,
        numDistractors(ROP, [baseROP, safetyStock, maxDemand * leadTime + avgDemand], " units"),
        `Full ROP = base ROP + safety stock = ${baseROP} + ${safetyStock} = ${ROP} units. (As a check, this equals maximum daily demand × lead time: ${maxDemand} × ${leadTime} = ${maxDemand * leadTime} units.)`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Why would this business add safety stock rather than relying on the basic reorder point (average daily demand × lead time) alone?`,
        buildOptions("To reduce the risk of a stockout if actual demand during the lead time turns out to be higher than the average", ["To reduce the total amount of inventory held at any given time", "Because average daily demand is not a meaningful figure for ordering decisions", "To eliminate the need to reorder stock at all"]),
        `As explained in the text, relying only on average demand risks a stockout whenever demand during the lead time exceeds that average; safety stock provides a buffer specifically to reduce that risk — though it does so by holding more inventory, not less.`
      )
    );

    questions.push(
      q(
        "comparison",
        `If the supplier's lead time increased while average and maximum daily demand stayed the same, what would happen to the reorder point?`,
        buildOptions("It would increase, since both the base ROP and the safety stock scale with lead time", ["It would decrease, since a longer lead time means less frequent ordering", "It would stay exactly the same, since lead time does not appear in the formula", "It would only affect the base ROP, not the safety stock"]),
        `Both components of the formula include lead time as a multiplier — base ROP = average demand × lead time, and safety stock = (max − average) × lead time — so an increase in lead time increases both, and therefore increases the full reorder point.`
      )
    );

    const extraDays = randInt(2, 6);
    const extraDemand = avgDemand * extraDays;
    questions.push(
      q(
        "calculation",
        `Suppose the supplier unexpectedly announces the lead time will be ${extraDays} days longer than planned. Approximately how much additional average demand would occur during this extra time, at the average daily rate?`,
        numDistractors(extraDemand, [maxDemand * extraDays, avgDemand + extraDays, extraDemand / 2], " units"),
        `Additional expected demand ≈ average daily demand × extra days = ${avgDemand} × ${extraDays} = ${extraDemand} units — this is roughly how much the reorder point (using average demand alone) would need to rise to account for the longer wait.`
      )
    );

    return {
      topicTitle: `Inventory Management: Reorder Point and Demand Variability`,
      subject: "Business Administration",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     26. BUSINESS ADMINISTRATION — Decision trees / expected value
     ============================================================ */
  function genBusDecisionEV(diff, scenario) {
    const flavors = {
      "new product launch decision": { optionNoun: "product launch strategy", outcomeGood: "the launch succeeds", outcomeBad: "the launch underperforms" },
      "marketing campaign choice": { optionNoun: "marketing campaign", outcomeGood: "the campaign performs well", outcomeBad: "the campaign underperforms" },
      "equipment investment decision": { optionNoun: "equipment investment", outcomeGood: "the equipment performs as expected", outcomeBad: "the equipment underdelivers" },
      "market entry decision": { optionNoun: "market entry plan", outcomeGood: "entry into the new market succeeds", outcomeBad: "entry into the new market struggles" },
    };
    const f = flavors[scenario] || flavors["new product launch decision"];

    function makeOption() {
      const pSuccess = randInt(diff === "easy" ? 40 : 20, diff === "easy" ? 75 : 85) / 100;
      const payoffSuccess = randInt(50, 300) * 1000;
      const payoffFail = -randInt(20, 150) * 1000;
      const ev = pSuccess * payoffSuccess + (1 - pSuccess) * payoffFail;
      return { pSuccess, payoffSuccess, payoffFail, ev };
    }
    const A = makeOption();
    const B = makeOption();

    const sourceText = `
      <p><strong>Expected value (EV)</strong> is a tool for comparing decision options under uncertainty. For a given option, EV is calculated by multiplying the payoff of each possible outcome by its probability, and summing these products across all possible outcomes: EV = Σ (probability of outcome × payoff of outcome).</p>
      <p>A risk-neutral decision-maker — one who cares only about the average payoff and not about how risky each option is — would generally choose the option with the higher expected value, since this represents the average payoff that would result if the decision were repeated many times under the same probabilities. In practice, however, a decision-maker who is <strong>risk-averse</strong> may sometimes prefer an option with a lower expected value if it also carries a smaller chance of a large loss, since expected value alone does not capture how spread out (risky) the possible outcomes are.</p>
      <p>A manager is comparing two options for a ${f.optionNoun}, labelled Option A and Option B.</p>
      <p>Option A: there is a ${fmtNum(A.pSuccess * 100)}% chance that ${f.outcomeGood}, generating a payoff of $${fmtNum(A.payoffSuccess)}; otherwise (${f.outcomeBad}), the payoff is −$${fmtNum(Math.abs(A.payoffFail))}.</p>
      <p>Option B: there is a ${fmtNum(B.pSuccess * 100)}% chance that ${f.outcomeGood}, generating a payoff of $${fmtNum(B.payoffSuccess)}; otherwise (${f.outcomeBad}), the payoff is −$${fmtNum(Math.abs(B.payoffFail))}.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the expected value of Option A?`,
        numDistractors(A.ev, [A.payoffSuccess, A.pSuccess * A.payoffSuccess, (A.payoffSuccess + A.payoffFail) / 2], ""),
        `EV(A) = (${fmtNum(A.pSuccess)} × ${fmtNum(A.payoffSuccess)}) + (${fmtNum(1 - A.pSuccess)} × ${fmtNum(A.payoffFail)}) = ${fmtNum(A.pSuccess * A.payoffSuccess)} + (${fmtNum((1 - A.pSuccess) * A.payoffFail)}) = ${fmtNum(A.ev)}.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the expected value of Option B?`,
        numDistractors(B.ev, [B.payoffSuccess, B.pSuccess * B.payoffSuccess, (B.payoffSuccess + B.payoffFail) / 2], ""),
        `EV(B) = (${fmtNum(B.pSuccess)} × ${fmtNum(B.payoffSuccess)}) + (${fmtNum(1 - B.pSuccess)} × ${fmtNum(B.payoffFail)}) = ${fmtNum(B.pSuccess * B.payoffSuccess)} + (${fmtNum((1 - B.pSuccess) * B.payoffFail)}) = ${fmtNum(B.ev)}.`
      )
    );

    const higherIsA = A.ev > B.ev;
    questions.push(
      q(
        "comparison",
        `Based on expected value alone, which option would a risk-neutral decision-maker prefer?`,
        buildOptions(higherIsA ? "Option A" : "Option B", [higherIsA ? "Option B" : "Option A", "Both options have exactly the same expected value", "Expected value cannot be used to compare these two options"]),
        `EV(A) ≈ ${fmtNum(A.ev)} and EV(B) ≈ ${fmtNum(B.ev)}. A risk-neutral decision-maker, who prefers the higher expected value, would prefer ${higherIsA ? "Option A" : "Option B"}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What does the expected value of an option represent?`,
        buildOptions("The average payoff that would result if the decision were repeated many times under the same probabilities", ["The guaranteed payoff the decision-maker will receive", "The best possible payoff among all outcomes", "The worst possible payoff among all outcomes"]),
        `As explained in the text, expected value is a probability-weighted average across all possible outcomes — it represents the long-run average payoff under repetition, not a guaranteed, best-case, or worst-case result for any single decision.`
      )
    );

    if (diff !== "easy") {
      const newP = Math.min(0.95, A.pSuccess + randInt(10, 20) / 100);
      const newEV_A = newP * A.payoffSuccess + (1 - newP) * A.payoffFail;
      questions.push(
        q(
          "calculation",
          `Suppose new information revises the probability of success for Option A to ${fmtNum(newP * 100)}%, with the payoffs unchanged. What would the new expected value of Option A be?`,
          numDistractors(newEV_A, [A.ev, newP * A.payoffSuccess, (newEV_A + A.ev) / 2], ""),
          `EV(A, revised) = (${fmtNum(newP)} × ${fmtNum(A.payoffSuccess)}) + (${fmtNum(1 - newP)} × ${fmtNum(A.payoffFail)}) = ${fmtNum(newP * A.payoffSuccess)} + (${fmtNum((1 - newP) * A.payoffFail)}) = ${fmtNum(newEV_A)}.`
        )
      );
    } else {
      questions.push(
        q(
          "interpretation",
          `In the expected value formula, why is each outcome's payoff multiplied by its probability before being summed?`,
          buildOptions("So that outcomes which are more likely to occur are weighted more heavily in the average", ["So that all outcomes contribute equally to the total, regardless of likelihood", "So that only the most likely outcome is counted", "So that negative payoffs are excluded from the calculation"]),
          `Weighting each payoff by its probability ensures the expected value reflects how likely each outcome actually is — a highly likely outcome influences the average more than an unlikely one, which is the core idea behind expected value.`
        )
      );
    }

    questions.push(
      q(
        "inference",
        `Even if one option has a clearly higher expected value than the other, why might a risk-averse decision-maker still choose the option with the lower expected value?`,
        buildOptions("To avoid a possible large loss, even if that loss is relatively unlikely, since expected value alone does not capture how risky an option is", ["Because expected value calculations are generally unreliable and should be ignored", "Because the option with the lower expected value always has a higher probability of success", "Because risk-averse decision-makers are required to choose randomly between options"]),
        `As explained in the text, expected value only captures the probability-weighted average outcome — it does not reflect the size of the risk involved. A risk-averse decision-maker may reasonably prefer to avoid a possible large loss, even at the cost of a lower average payoff.`
      )
    );

    return {
      topicTitle: `Decision Analysis: Expected Value Under Uncertainty`,
      subject: "Business Administration",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     27. ECONOMICS — Externalities / Pigovian tax
     ============================================================ */
  function genEconExternalities(diff, scenario) {
    const flavors = {
      "factory air pollution": { activity: "manufacturing output from a factory", externality: "air pollution affecting nearby residents", unit: "thousand tonnes of output" },
      "vehicle traffic congestion": { activity: "vehicle trips into a city centre", unit: "thousand trips", externality: "traffic congestion affecting other road users" },
      "plastic packaging waste": { activity: "production of single-use plastic packaging", externality: "environmental waste and clean-up costs", unit: "thousand units of packaging" },
      "noise pollution near an airport": { activity: "flight operations at an airport", externality: "noise pollution affecting nearby residents", unit: "hundred flights" },
    };
    const f = flavors[scenario] || flavors["factory air pollution"];

    const a = randInt(10, 30); // MPC intercept
    const b = randInt(1, 3); // MPC slope
    const m = randInt(80, 150); // demand intercept
    const n = randInt(1, 3); // demand slope
    const X = randInt(5, 20); // constant marginal external cost per unit

    const Qmarket = (m - a) / (b + n);
    const Qoptimal = (m - a - X) / (b + n);

    const sourceText = `
      <p>An <strong>externality</strong> is a cost or benefit of an economic activity that falls on a third party not directly involved in the transaction. A <strong>negative externality</strong> is an external cost — such as ${f.externality} — that is not reflected in the price paid by the producer or the buyer.</p>
      <p><strong>Marginal Private Cost (MPC)</strong> is the cost borne directly by the producer of each additional unit. <strong>Marginal External Cost (MEC)</strong> is the additional cost imposed on third parties by each unit. <strong>Marginal Social Cost (MSC)</strong> is the total cost to society of each unit: MSC = MPC + MEC.</p>
      <p>Left alone, a competitive market reaches equilibrium where MPC equals the price consumers are willing to pay (given by the demand curve) — because producers only take their own private costs into account, ignoring the external cost imposed on others. This produces a market quantity that is <strong>higher</strong> than the socially optimal quantity, which is instead found where MSC equals demand — because at the market quantity, the last units produced cost society (MSC) more than buyers are willing to pay for them, once the external cost is included.</p>
      <p>A <strong>Pigovian tax</strong> set equal to the marginal external cost makes producers "internalise" the externality — effectively raising their cost per unit by the size of the external cost — shifting the quantity produced from the (excessive) market quantity toward the socially optimal quantity.</p>
      <p>In the market for ${f.activity}, the marginal private cost function is MPC(Q) = ${a} + ${b}Q, and the demand function is Demand(Q) = ${m} − ${n}Q, where Q is measured in ${f.unit} and cost/price in dollars per unit. Each unit of this activity also imposes a constant marginal external cost of $${X} on third parties (${f.externality}), so MSC(Q) = ${a + X} + ${b}Q.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the market equilibrium quantity, Q_market, ignoring the externality (where MPC = Demand)?`,
        numDistractors(Qmarket, [Qoptimal, m / n, a / b], ` ${f.unit.split(" ").slice(1).join(" ")}`),
        `Setting MPC = Demand: ${a} + ${b}Q = ${m} − ${n}Q. Rearranging: ${m - a} = ${b + n}Q, so Q_market = ${m - a} ÷ ${b + n} = ${fmtNum(Qmarket)}.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the socially optimal quantity, Q_optimal, accounting for the externality (where MSC = Demand)?`,
        numDistractors(Qoptimal, [Qmarket, (m - a) / (b + n) - X, m / n], ` ${f.unit.split(" ").slice(1).join(" ")}`),
        `Setting MSC = Demand: ${a + X} + ${b}Q = ${m} − ${n}Q. Rearranging: ${m - a - X} = ${b + n}Q, so Q_optimal = ${m - a - X} ÷ ${b + n} = ${fmtNum(Qoptimal)}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Why is the unregulated market quantity higher than the socially optimal quantity in this case?`,
        buildOptions("Producers base their output decisions on MPC alone, ignoring the additional external cost imposed on third parties", ["Consumers demand more of the good than they are willing to pay for", "The socially optimal quantity ignores production costs entirely", "Government intervention always increases the quantity produced above the market level"]),
        `As explained in the text, producers only account for their own private costs (MPC); because MEC is not reflected in MPC, the market keeps producing units whose true social cost (MSC) exceeds what buyers are willing to pay, resulting in overproduction relative to the social optimum.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What per-unit Pigovian tax would align the market quantity with the socially optimal quantity, in this simplified model?`,
        numDistractors(X, [X / 2, X * 2, a], ""),
        `Since the marginal external cost is constant at $${X} per unit, setting a Pigovian tax of $${X} per unit raises MPC by exactly the external cost, making the taxed MPC curve coincide with the MSC curve — so the new market equilibrium occurs at Q_optimal.`
      )
    );

    questions.push(
      q(
        "comparison",
        `If the external cost per unit (currently $${X}) were larger, how would the gap between Q_market and Q_optimal change?`,
        buildOptions("The gap would be larger, since Q_optimal would fall further below Q_market", ["The gap would be smaller, since a larger external cost brings the two quantities closer together", "The gap would disappear entirely, regardless of the size of the external cost", "The external cost has no effect on the gap between the two quantities"]),
        `Since Q_optimal = (m − a − X) ÷ (b + n), a larger X directly reduces Q_optimal while Q_market (which does not depend on X) stays the same — widening the gap between the two quantities.`
      )
    );

    questions.push(
      q(
        "inference",
        `What is the underlying purpose of a Pigovian tax in this context?`,
        buildOptions("To make producers factor the external cost into their decisions, shifting production toward the socially optimal quantity", ["To maximise total government tax revenue regardless of quantity produced", "To subsidise producers so they can increase output further", "To eliminate the activity entirely by making it prohibitively expensive"]),
        `As explained in the text, a Pigovian tax is designed to correct the externality by making producers internalise the external cost — the goal is to shift the market outcome toward the socially optimal quantity, not simply to raise revenue or eliminate the activity.`
      )
    );

    return {
      topicTitle: `Externalities and Pigovian Taxation`,
      subject: "Economics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     28. ECONOMICS — GDP (expenditure approach)
     ============================================================ */
  function genEconGDP(diff, scenario) {
    const flavors = {
      "national economy annual report": { region: "a national economy", period: "the past year" },
      "regional economic analysis": { region: "a regional economy", period: "the last fiscal year" },
      "quarterly economic briefing": { region: "a national economy", period: "the most recent quarter" },
      "country comparison exercise": { region: "a national economy", period: "the past year" },
    };
    const f = flavors[scenario] || flavors["national economy annual report"];

    const C = randInt(200, 500);
    const I = randInt(50, 150);
    const G = randInt(80, 200);
    const X = randInt(60, 180);
    const M = randInt(60, 200);
    const NX = X - M;
    const GDP = C + I + G + NX;

    const sourceText = `
      <p>The <strong>expenditure approach</strong> is one standard way of calculating Gross Domestic Product (GDP) — the total market value of final goods and services produced within a country's borders over a given period. Under this approach: GDP = C + I + G + NX, where C is <strong>consumption</strong> (household spending on goods and services), I is <strong>investment</strong> (business spending on capital goods such as equipment, structures, and changes in inventory — not financial investments like buying stocks or bonds, which represent a transfer of existing assets rather than new production), G is <strong>government spending</strong> on goods and services, and NX is <strong>net exports</strong> (exports minus imports, X − M).</p>
      <p>Net exports can be negative if a country imports more than it exports; this reduces GDP relative to what domestic expenditure alone would suggest, because some of that domestic spending (on C, I, and G) is going toward goods produced abroad rather than domestically.</p>
      <p>GDP counts only <strong>final</strong> goods and services — the value of intermediate goods used up in production (such as steel used to manufacture a car) is not counted separately, because it is already embedded in the final product's market price; counting both would double-count the same economic value.</p>
      <p>Economic analysts studying ${f.region} report the following figures for ${f.period} (in $ billions): Consumption (C) = ${C}, Investment (I) = ${I}, Government spending (G) = ${G}, Exports (X) = ${X}, Imports (M) = ${M}.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is net exports (NX) for this period?`,
        numDistractors(NX, [X + M, X, M], " $ billion"),
        `NX = Exports − Imports = ${X} − ${M} = ${NX} $ billion.`
      )
    );

    questions.push(
      q(
        "calculation",
        `Using the expenditure approach, what is GDP for this period?`,
        numDistractors(GDP, [C + I + G, C + I + G + X, C + I + G - NX], " $ billion"),
        `GDP = C + I + G + NX = ${C} + ${I} + ${G} + (${NX}) = ${fmtNum(C + I + G + NX)} $ billion.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which of the following would be classified as "Investment" (I) in the GDP expenditure formula, as generally defined in economics?`,
        buildOptions("A business purchasing new manufacturing equipment", ["A household buying groceries", "An individual buying shares of stock on the stock market", "A government paying employee salaries"]),
        `As explained in the text, Investment (I) specifically refers to spending on new capital goods used in production, such as equipment; buying groceries is Consumption (C), government salaries fall under Government spending (G), and buying existing financial assets like stocks is not counted in GDP at all, since it does not represent new production.`
      )
    );

    if (diff !== "easy") {
      const deltaM = randInt(10, 40);
      const newGDP = GDP - deltaM;
      questions.push(
        q(
          "calculation",
          `Suppose imports (M) unexpectedly increased by $${deltaM} billion, while C, I, G, and exports (X) all stayed the same. What would the new GDP be?`,
          numDistractors(newGDP, [GDP, GDP + deltaM, GDP - deltaM / 2], " $ billion"),
          `A rise in imports of $${deltaM} billion reduces net exports (NX) by the same amount, since NX = X − M. With everything else unchanged, GDP falls by $${deltaM} billion: ${fmtNum(GDP)} − ${deltaM} = ${fmtNum(newGDP)} $ billion.`
        )
      );
    } else {
      questions.push(
        q(
          "interpretation",
          `Why does GDP count only "final" goods and services, rather than also separately counting intermediate goods (such as steel used to build a car)?`,
          buildOptions("To avoid double-counting, since the value of intermediate goods is already included in the final product's price", ["Because intermediate goods have no market value", "Because intermediate goods are never produced domestically", "Because GDP only measures goods, not services, at any production stage"]),
          `As explained in the text, an intermediate good's value is already embedded in the price of the final product that uses it; separately adding the intermediate good's value again would count the same economic value twice.`
        )
      );
    }

    questions.push(
      q(
        "comparison",
        `If government spending (G) increased by exactly the same dollar amount that net exports (NX) decreased, what would happen to total GDP?`,
        buildOptions("It would stay exactly the same, since the two changes offset each other in the GDP formula", ["It would increase, since G has a larger effect on GDP than NX", "It would decrease, since NX changes always dominate the formula", "It cannot be determined without knowing the size of C and I"]),
        `Since GDP = C + I + G + NX, an increase in G that is exactly offset by an equal decrease in NX leaves the sum G + NX unchanged — so total GDP stays the same, holding C and I constant.`
      )
    );

    questions.push(
      q(
        "inference",
        `A country's GDP figure alone, without further context, does NOT directly tell us which of the following?`,
        buildOptions("How GDP is distributed among the country's population (i.e., inequality)", ["The total market value of final goods and services produced", "Whether net exports were positive or negative, once broken into its components", "Which of consumption, investment, or government spending contributed to output"]),
        `GDP is a single aggregate figure for total production; while its components (C, I, G, NX) can be examined individually, the total GDP figure itself says nothing about how income or output is distributed across individuals or groups within the country.`
      )
    );

    return {
      topicTitle: `Macroeconomics: GDP via the Expenditure Approach`,
      subject: "Economics",
      difficulty: diff,
      sourceText,
      questions,
    };
  }
  /* ============================================================
     29. SOCIAL SCIENCES — Non-response bias / response rates
     ============================================================ */
  function genSocNonresponse(diff, scenario) {
    const flavors = {
      "employee engagement survey": { org: "a company", population: "employees", topicNoun: "workplace engagement" },
      "customer satisfaction survey": { org: "a retail chain", population: "recent customers", topicNoun: "satisfaction with a recent purchase" },
      "public health survey": { org: "a public health agency", population: "residents of a district", topicNoun: "health behaviours" },
      "political opinion poll": { org: "a research firm", population: "registered voters", topicNoun: "opinions on a local policy issue" },
    };
    const f = flavors[scenario] || flavors["employee engagement survey"];

    const N = randInt(400, 2000);
    const R = Math.round(N * (randInt(15, diff === "easy" ? 55 : 40) / 100));
    const responseRate = (R / N) * 100;

    const sourceText = `
      <p>The <strong>response rate</strong> of a survey is the proportion of people invited to participate who actually complete it: Response rate = (number of respondents ÷ number of people invited) × 100%.</p>
      <p><strong>Non-response bias</strong> occurs when the people who respond to a survey differ systematically from those who do not, in ways related to the topic being studied. For example, dissatisfied customers might be less motivated to respond to a satisfaction survey than satisfied ones, or particularly busy or disengaged employees might be less likely to complete a workplace survey — in both cases, skewing the results even if the original invited sample was chosen randomly.</p>
      <p>It is important to note that a low response rate does not automatically mean a survey's results are heavily biased: if non-respondents are, on average, similar to respondents with respect to the topic being studied, the bias introduced may be small. However, a low response rate does increase the <strong>risk</strong> of meaningful bias, and makes it harder for researchers to be confident that the survey's results reflect the full population that was originally invited.</p>
      <p>${f.org.charAt(0).toUpperCase() + f.org.slice(1)} sent a survey about ${f.topicNoun} to ${N} ${f.population}. ${R} of them completed the survey.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the response rate for this survey?`,
        numDistractors(responseRate, [(N / R) * 100 > 100 ? 100 - responseRate : (N / R) * 100, responseRate / 2, 100 - responseRate], "%"),
        `Response rate = (respondents ÷ invited) × 100% = (${R} ÷ ${N}) × 100% ≈ ${fmtNum(responseRate)}%.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What is non-response bias?`,
        buildOptions("A systematic difference between respondents and non-respondents that distorts a survey's results", ["Any survey with a response rate below 50%", "An error caused by poorly worded survey questions", "The natural random variation expected in any sample"]),
        `As defined in the text, non-response bias specifically refers to systematic (not random) differences between those who respond and those who don't, on characteristics related to the topic being studied — it is a distinct concept from response rate itself or from question wording issues.`
      )
    );

    questions.push(
      q(
        "inference",
        `In this survey, why might the response rate found above be a particular concern for the accuracy of the results?`,
        buildOptions("Because ${f.population} who chose not to respond might differ systematically from those who did, on the topic being studied".replace("${f.population}", f.population), ["Because the invited sample size was too large to analyse", "Because response rates above 0% always guarantee unbiased results", "Because surveys about this particular topic cannot be affected by non-response"]),
        `As the text explains, a response rate below 100% always leaves open the possibility that non-respondents differ systematically from respondents in ways connected to ${f.topicNoun}, which is the underlying mechanism behind non-response bias.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Does a low response rate automatically mean this survey's results are heavily biased?`,
        buildOptions("No — it increases the risk of bias, but if non-respondents are similar to respondents on the topic studied, the bias may be small", ["Yes — any response rate below 100% always produces heavily biased results", "No — response rate has no relationship to bias whatsoever", "Yes, but only for surveys conducted online rather than in person"]),
        `As explained in the text, a low response rate raises the risk of non-response bias and reduces confidence in the results, but it does not automatically guarantee heavy bias — the actual amount of bias depends on how different non-respondents are from respondents on the topic being studied.`
      )
    );

    questions.push(
      q(
        "comparison",
        `Compared to simply accepting whichever responses come in, which approach would most likely reduce non-response bias?`,
        buildOptions("Following up with non-respondents (for example, with reminder invitations) to increase and diversify the response rate", ["Only analysing responses received within the first day", "Discarding incomplete responses without any follow-up", "Shortening the invited sample to only the most likely respondents"]),
        `Following up with non-respondents directly targets the group whose absence creates the risk of bias, helping to capture perspectives that might otherwise be systematically missing from the results — unlike approaches that simply work with whichever responses arrive first.`
      )
    );

    const targetPct = Math.min(95, Math.round(responseRate) + randInt(15, 30));
    const targetR = Math.round((targetPct / 100) * N);
    const additionalNeeded = targetR - R;
    questions.push(
      q(
        "calculation",
        `The organisation running this survey wants to reach a response rate of ${targetPct}%. Approximately how many additional respondents (beyond the ${R} already received) would be needed to reach this target, given the same ${N} people invited?`,
        numDistractors(additionalNeeded, [targetR, R, N - R], " respondents"),
        `Target number of respondents = ${targetPct}% × ${N} = ${fmtNum(targetR)}. Additional respondents needed = ${fmtNum(targetR)} − ${R} ≈ ${fmtNum(additionalNeeded)}.`
      )
    );

    return {
      topicTitle: `Survey Methodology: Response Rates and Non-Response Bias`,
      subject: "Social Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     30. SOCIAL SCIENCES — Reliability and validity in measurement
     ============================================================ */
  function genSocReliabilityValidity(diff, scenario) {
    const flavors = {
      "psychological test development": { tool: "a new psychological personality test", org: "a test developer" },
      "employee performance evaluation tool": { tool: "a new employee performance evaluation tool", org: "an HR department" },
      "standardized academic test": { tool: "a new standardized academic test", org: "an assessment organisation" },
      "customer satisfaction survey instrument": { tool: "a new customer satisfaction survey instrument", org: "a market research team" },
    };
    const f = flavors[scenario] || flavors["psychological test development"];

    const sourceText = `
      <p>When developing any measurement instrument — a survey, a test, an evaluation tool — researchers distinguish between two related but different qualities. <strong>Reliability</strong> refers to the consistency of a measurement: would it produce similar results if repeated under the same conditions? One common way to assess this is <strong>test-retest reliability</strong>: giving the same test to the same people at two different times and checking how closely the two sets of scores agree.</p>
      <p><strong>Validity</strong> refers to whether a measurement actually measures the concept it claims to measure. A common form is <strong>construct validity</strong> — evidence that scores on the instrument relate in expected ways to other, independent indicators of the underlying concept (for example, a job performance evaluation tool should correlate with actual on-the-job outcomes, not just with itself).</p>
      <p>These two properties are related but distinct: an instrument can be reliable without being valid — it can consistently produce the same result, even if that result does not reflect the concept it is supposed to measure (much like a bathroom scale that is miscalibrated by a fixed amount will consistently show the same, inaccurate, weight every time). However, an instrument generally cannot be valid without also being reasonably reliable: if it does not produce consistent results, it cannot be consistently measuring the right thing either, since its results would be too inconsistent to reflect anything reliably.</p>
      <p>${f.org.charAt(0).toUpperCase() + f.org.slice(1)} is evaluating ${f.tool} and wants to gather evidence about both its reliability and its validity before relying on it.</p>
    `;

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `What does "reliability" refer to, in the context of a measurement instrument?`,
        buildOptions("The consistency of the measurement — whether it produces similar results under the same conditions", ["Whether the measurement actually measures the concept it claims to measure", "How quickly the measurement can be administered", "How expensive the measurement is to develop"]),
        `As defined in the text, reliability is about consistency — producing similar results when repeated under the same conditions — which is a different question from whether the measurement is accurate or meaningful (validity).`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What does "validity" refer to, in the context of a measurement instrument?`,
        buildOptions("Whether the measurement actually measures the concept it claims to measure", ["The consistency of the measurement across repeated administrations", "How long the measurement instrument has been in use", "How many people have taken the measurement so far"]),
        `As defined in the text, validity concerns whether an instrument truly captures the underlying concept it is designed to measure — a separate question from whether its results are consistent (reliability).`
      )
    );

    questions.push(
      q(
        "inference",
        `Can a measurement instrument be reliable without being valid?`,
        buildOptions("Yes — it can consistently produce the same result, even if that result does not accurately reflect the concept being measured", ["No — reliability automatically guarantees validity", "No — reliability and validity are simply two names for the same property", "Yes, but only for instruments used in physical (not psychological) measurement"]),
        `As the text explains using the miscalibrated-scale example, an instrument can be perfectly consistent (reliable) while still measuring the wrong thing or measuring it inaccurately (not valid) — the two properties are related but distinct.`
      )
    );

    questions.push(
      q(
        "inference",
        `Can a measurement instrument be valid without being reasonably reliable?`,
        buildOptions("No — if it doesn't produce consistent results, it cannot be consistently measuring the right thing either", ["Yes — validity and reliability are completely independent of one another", "Yes, as long as the instrument is used only once", "No, because validity is simply defined as the average of many reliability scores"]),
        `As explained in the text, validity generally requires at least a reasonable degree of reliability, since wildly inconsistent results cannot reliably reflect the concept the instrument is meant to measure.`
      )
    );

    questions.push(
      q(
        "inference",
        `A researcher finds that ${f.tool} gives very different scores for the same person retaking it a week later, under identical conditions. Which property does this observation most directly call into question?`,
        buildOptions("Reliability", ["Validity", "Sampling method", "Correlation versus causation"]),
        `Giving inconsistent results under the same conditions is specifically a reliability problem, as defined in the text — it does not, by itself, tell us anything about whether the instrument measures the right concept (validity), which is a separate question.`
      )
    );

    questions.push(
      q(
        "comparison",
        `Which would provide stronger evidence that ${f.tool} is valid: showing that it gives the same score when the same rater evaluates the same case twice, or showing that its scores correlate with independent, real-world outcomes related to the concept it claims to measure?`,
        buildOptions("Showing that its scores correlate with independent, real-world outcomes", ["Showing that it gives the same score when the same case is evaluated twice", "Both provide exactly equivalent evidence of validity", "Neither provides any evidence relevant to validity"]),
        `As explained in the text, showing consistent repeated scores is evidence of reliability, not validity. Evidence of validity specifically requires showing that the instrument's scores relate in expected ways to independent indicators of the actual concept being measured.`
      )
    );

    return {
      topicTitle: `Research Methods: Reliability and Validity in Measurement`,
      subject: "Social Sciences",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     31. HUMANITIES — Historical causation
     ============================================================ */
  function genHumCausation(diff, scenario) {
    const templates = [
      {
        label: "a fictional trade policy change",
        underlying: (n1) => `For several decades, the fictional country of ${n1} experienced a slow build-up of pressure from domestic industries seeking protection from foreign competition, as their market share gradually declined year after year.`,
        trigger: (n2) => `Then, following a sudden currency devaluation in a major trading partner, ${n2} imports became sharply cheaper almost overnight, prompting the government to act.`,
        outcome: `Within months, the government introduced a significant new set of trade tariffs.`,
      },
      {
        label: "a fictional technological adoption",
        underlying: (n1) => `Over many years, the fictional city of ${n1} had steadily built up the infrastructure, skilled workforce, and investment capital that would eventually make large-scale adoption of a new technology feasible.`,
        trigger: (n2) => `Then, a well-publicised successful pilot project in the neighbouring city of ${n2} demonstrated the technology's practicality to sceptical local officials.`,
        outcome: `Shortly afterward, the city council voted to fund a city-wide rollout of the technology.`,
      },
      {
        label: "a fictional public health reform",
        underlying: (n1) => `For a long period, the fictional region of ${n1} had experienced gradually rising rates of a preventable illness, straining local healthcare resources more each year.`,
        trigger: (n2) => `Then, a sudden, highly visible local outbreak in the town of ${n2} drew widespread public and media attention to the issue.`,
        outcome: `Within weeks, regional lawmakers passed a sweeping new public health reform.`,
      },
      {
        label: "a fictional regional conflict",
        underlying: (n1) => `Over many years, longstanding disputes over resource access had gradually built tension between communities in the fictional region of ${n1}.`,
        trigger: (n2) => `Then, a specific and highly publicised incident involving a disputed water source near ${n2} escalated tensions sharply within days.`,
        outcome: `Soon afterward, open conflict broke out between the two communities.`,
      },
    ];
    const tpl = pick(templates);
    const n1 = pick(["Velmara", "Korrenth", "Astoria Province", "Dellenberg", "Marisol"]);
    const n2 = pick(["Brennoc", "Tavistra", "Kelmouth", "Sundara", "Vireton"]);

    const underlyingSentence = tpl.underlying(n1);
    const triggerSentence = tpl.trigger(n2);
    const outcomeSentence = tpl.outcome;

    const sourceText = `
      <p>Historians distinguish between different types of causes that contribute to an event. An <strong>immediate (or "trigger") cause</strong> is the specific event that directly precipitates an outcome, typically occurring shortly before it. An <strong>underlying (or "long-term") cause</strong> refers to deeper structural conditions that develop over a longer period and make an outcome possible or likely, even though they do not, by themselves, immediately produce it.</p>
      <p>Historians also distinguish between a <strong>necessary cause</strong> — a factor without which the event would not have occurred, though it may not be enough on its own — and a <strong>sufficient cause</strong> — a factor that, by itself, guarantees the outcome. Because complex historical events typically result from many interacting factors, historians generally avoid explaining such events using a single sufficient cause; instead, they analyse how multiple immediate and underlying causes combined to produce the outcome, an approach often called <strong>multicausal</strong> explanation.</p>
      <p>For methodological practice, consider the following hypothetical case, illustrating ${tpl.label}: ${underlyingSentence} ${triggerSentence} ${outcomeSentence}</p>
    `;

    const questions = [];
    questions.push(
      q(
        "conceptual",
        `Which sentence from the passage describes the immediate (trigger) cause of the outcome?`,
        buildOptions(triggerSentence, [underlyingSentence, outcomeSentence, "Historians generally avoid explaining such events using a single sufficient cause."]),
        `As defined in the text, the immediate (trigger) cause is the specific event occurring shortly before the outcome that directly precipitates it — here, that is: "${triggerSentence}"`
      )
    );

    questions.push(
      q(
        "conceptual",
        `Which sentence from the passage describes an underlying (long-term) cause of the outcome?`,
        buildOptions(underlyingSentence, [triggerSentence, outcomeSentence, "Historians also distinguish between a necessary cause and a sufficient cause."]),
        `As defined in the text, an underlying cause develops over a longer period and creates the conditions that make an outcome possible — here, that is: "${underlyingSentence}"`
      )
    );

    questions.push(
      q(
        "conceptual",
        `What is the key difference between a "necessary" cause and a "sufficient" cause, as defined in the text?`,
        buildOptions("A necessary cause must be present for the event to occur (though it may not be enough alone); a sufficient cause guarantees the event by itself", ["A necessary cause guarantees the event by itself; a sufficient cause must be present but may not be enough alone", "The two terms are interchangeable and describe the same relationship", "A necessary cause occurs after the event; a sufficient cause occurs before it"]),
        `As defined in the text, a necessary cause is required for the outcome to occur but might not be enough on its own, while a sufficient cause alone guarantees the outcome — these are different (and often confused) relationships between a cause and an effect.`
      )
    );

    questions.push(
      q(
        "inference",
        `Why do historians generally avoid explaining complex events, like the one described, using only a single cause?`,
        buildOptions("Because such events typically result from multiple interacting immediate and underlying causes, rather than one sufficient cause acting alone", ["Because historical events never have any identifiable causes at all", "Because only economic causes are considered legitimate by historians", "Because immediate causes are always more important than underlying causes"]),
        `As explained in the text, historians favour multicausal explanations because complex events usually result from several contributing factors working together, rather than being fully explained by any single sufficient cause.`
      )
    );

    questions.push(
      q(
        "comparison",
        `Compared to an immediate (trigger) cause, what generally characterises an underlying (long-term) cause?`,
        buildOptions("It develops over a longer period, creating conditions that make the event possible, rather than directly precipitating it", ["It always occurs after the immediate cause, rather than before it", "It has no meaningful relationship to the eventual outcome", "It is, by definition, always more sufficient on its own than an immediate cause"]),
        `As defined in the text, underlying causes develop over a longer time frame and establish the conditions for an event, while immediate causes are the more specific triggers that occur shortly before the event itself.`
      )
    );

    questions.push(
      q(
        "interpretation",
        `Based on the distinction drawn in the passage, if the immediate trigger described had not occurred, would the outcome definitely have been avoided?`,
        buildOptions("Not necessarily — the underlying conditions might still have led to a similar outcome through a different trigger", ["Yes — without the specific trigger described, the outcome could never have occurred under any circumstances", "Yes, because the trigger described is, by definition, a sufficient cause", "This cannot be inferred, because the passage does not describe any underlying causes"]),
        `Since the passage describes an underlying, longer-term condition that had already been building independently of the specific trigger, it is reasonable to infer that similar underlying pressure could plausibly have led to a comparable outcome via a different trigger — which is exactly why historians treat a single trigger as insufficient for a full explanation on its own.`
      )
    );

    return {
      topicTitle: `Historical Methodology: Analysing Causation`,
      subject: "Humanities",
      difficulty: diff,
      sourceText,
      questions,
    };
  }

  /* ============================================================
     32. HUMANITIES — Ethics: utilitarian reasoning
     ============================================================ */
  function genHumEthicsUtilitarian(diff, scenario) {
    const flavors = {
      "a hypothetical public policy choice": { decider: "a town council", groupNoun: "resident group" },
      "a hypothetical business resource allocation": { decider: "a company's leadership team", groupNoun: "employee group" },
      "a hypothetical community resource decision": { decider: "a community organisation", groupNoun: "community group" },
      "a hypothetical hospital triage policy exercise": { decider: "a hospital planning committee", groupNoun: "patient group" },
    };
    const f = flavors[scenario] || flavors["a hypothetical public policy choice"];

    function makeOption(guaranteeNegativeGroup) {
      const groups = [];
      const nGroups = 2 + (coinFlip() ? 1 : 0);
      for (let i = 0; i < nGroups; i++) {
        const size = randInt(20, 200);
        let utilPerPerson = randInt(-8, 10);
        if (guaranteeNegativeGroup && i === 0) utilPerPerson = -randInt(2, 8);
        groups.push({ size, utilPerPerson });
      }
      const total = groups.reduce((s, g) => s + g.size * g.utilPerPerson, 0);
      return { groups, total };
    }
    const A = makeOption(true);
    const B = makeOption(false);

    const groupRows = (opt, label) =>
      opt.groups.map((g, i) => `<tr><td>Option ${label}</td><td>Group ${i + 1} (${g.size} people)</td><td>${g.utilPerPerson >= 0 ? "+" : ""}${g.utilPerPerson}</td></tr>`).join("");
    const table = `<table class="table"><caption>Table 1. Hypothetical utility scores by option and affected group</caption><thead><tr><th>Option</th><th>Affected group</th><th>Utility per person</th></tr></thead><tbody>${groupRows(A, "A")}${groupRows(B, "B")}</tbody></table>`;

    const sourceText = `
      <p><strong>Utilitarianism</strong> is a consequentialist ethical framework holding that the right action is the one that produces the greatest total wellbeing ("utility") for everyone affected, considered together. In a simplified, illustrative exercise, this can be modelled by assigning a hypothetical utility score to each outcome for each group affected by a decision, and summing (group size × utility per person) across all groups to get a total utility for each option; a strict utilitarian approach recommends whichever option has the higher total.</p>
      <p><strong>Deontology</strong> is a different ethical framework, holding that certain actions are right or wrong based on moral rules or duties — such as a duty to treat individuals fairly or to keep promises — regardless of whether following those rules produces the best total outcome in a specific case.</p>
      <p>A widely discussed criticism of relying purely on total utility is that a purely aggregate calculation can justify outcomes that harm a smaller group significantly, as long as the benefit to a larger group is great enough to outweigh that harm in the total sum — even though many people find this ethically troubling regardless of the arithmetic. This tension between aggregate outcomes and the treatment of individuals or minorities is a long-standing, unresolved debate in ethics, not a settled question with a single correct answer.</p>
      <p>${f.decider[0].toUpperCase() + f.decider.slice(1)} is comparing two hypothetical options, purely as an illustrative exercise in applying utilitarian reasoning. Estimated utility scores for each affected ${f.groupNoun} under each option are shown in Table 1.</p>
      ${table}
    `;

    const questions = [];
    questions.push(
      q(
        "calculation",
        `What is the total utility of Option A, summed across all affected groups?`,
        numDistractors(A.total, [A.groups.reduce((s, g) => s + g.utilPerPerson, 0), A.groups[0].size * A.groups[0].utilPerPerson, A.total / 2], ""),
        `Total utility = Σ (group size × utility per person) = ${A.groups.map((g) => `(${g.size} × ${g.utilPerPerson})`).join(" + ")} = ${A.groups.map((g) => g.size * g.utilPerPerson).join(" + ")} = ${A.total}.`
      )
    );

    questions.push(
      q(
        "calculation",
        `What is the total utility of Option B, summed across all affected groups?`,
        numDistractors(B.total, [B.groups.reduce((s, g) => s + g.utilPerPerson, 0), B.groups[0].size * B.groups[0].utilPerPerson, B.total / 2], ""),
        `Total utility = Σ (group size × utility per person) = ${B.groups.map((g) => `(${g.size} × ${g.utilPerPerson})`).join(" + ")} = ${B.groups.map((g) => g.size * g.utilPerPerson).join(" + ")} = ${B.total}.`
      )
    );

    const higherIsA = A.total > B.total;
    questions.push(
      q(
        "comparison",
        `Based purely on total utility, which option would a strict utilitarian recommend?`,
        buildOptions(higherIsA ? "Option A" : "Option B", [higherIsA ? "Option B" : "Option A", "Both options have exactly equal total utility", "Utilitarianism provides no basis for comparing these two options"]),
        `Total utility is ${A.total} for Option A and ${B.total} for Option B. A strict utilitarian approach recommends the option with the higher total, which is ${higherIsA ? "Option A" : "Option B"}.`
      )
    );

    questions.push(
      q(
        "conceptual",
        `How does utilitarianism differ from deontology in how it evaluates whether an action is right?`,
        buildOptions("Utilitarianism judges actions by their consequences (total wellbeing produced); deontology judges actions by whether they follow moral rules or duties, regardless of consequences", ["Utilitarianism and deontology always reach identical conclusions in practice", "Deontology judges actions only by their consequences; utilitarianism ignores consequences entirely", "Utilitarianism applies only to individuals, while deontology applies only to organisations"]),
        `As explained in the text, utilitarianism is a consequentialist framework focused on the total outcome produced, while deontology evaluates actions against fixed moral rules or duties, independent of whether those rules produce the best total outcome in a given case.`
      )
    );

    questions.push(
      q(
        "inference",
        `What is a classic criticism of relying purely on total utility to make a decision like this one?`,
        buildOptions("It can justify significant harm to a smaller group if the benefit to a larger group is great enough to outweigh it in the total sum", ["Total utility calculations are mathematically impossible to perform", "Utilitarianism always produces the same recommendation as deontology", "Total utility ignores group size entirely when making calculations"]),
        `As explained in the text, aggregating utility across everyone affected can, in principle, recommend an option that significantly harms a smaller group, as long as the total gain to other groups is large enough — a result many people find ethically troubling even when the arithmetic favours it.`
      )
    );

    questions.push(
      q(
        "interpretation",
        `In this exercise, does the option with the higher total utility necessarily leave every individual affected group better off?`,
        buildOptions("Not necessarily — a higher total can still occur even if one group is worse off, as long as other groups gain enough to outweigh it", ["Yes — a higher total utility guarantees that every single group is better off under that option", "Yes, but only if the two options involve exactly the same number of groups", "This cannot be determined from utility scores alone, regardless of the data given"]),
        `Because total utility is a sum across groups, it is entirely possible for the total to be higher even when a specific group has a negative utility score under that option — illustrating exactly the concern raised in the text about relying purely on aggregate totals.`
      )
    );

    return {
      topicTitle: `Ethics: Utilitarian Reasoning and Its Limits`,
      subject: "Humanities",
      difficulty: diff,
      sourceText,
      questions,
    };
  }
  /* ============================================================
     HIERARCHICAL TAXONOMY
     Subject -> Discipline -> Topic -> Subtopic -> Concept -> Scenario
     This is metadata ONLY: concepts, scenario labels, and generation
     constraints are stored here. The actual source text and questions
     are still produced dynamically by the generator functions above.
     ============================================================ */
  const TAXONOMY = [
    { id: "math_stats", subject: "Mathematics", discipline: "Statistics", topic: "Descriptive Statistics", subtopic: "Measures of Central Tendency & Spread", concept: "Mean, Median, Mode, Range", family: "math.family.descriptive-stats", scenarios: ["commute times", "clinic wait times", "quiz scores", "delivery times", "rainfall totals"], difficulties: ["easy", "medium", "hard"], fn: genMathStats },
    { id: "math_breakeven", subject: "Mathematics", discipline: "Algebra & Functions", topic: "Linear Functions", subtopic: "Cost-Revenue-Profit Modelling", concept: "Break-Even Analysis", family: "math.family.linear-functions", scenarios: ["bakery", "candle workshop", "print shop", "repair shop", "design studio"], difficulties: ["easy", "medium", "hard"], fn: genMathBreakeven },
    { id: "math_bayesian", subject: "Mathematics", discipline: "Statistics & Probability", topic: "Probability", subtopic: "Conditional Probability", concept: "Bayesian Updating", family: "math.family.probability", scenarios: ["medical testing", "quality control", "spam filtering", "airport security screening"], difficulties: ["easy", "medium", "hard"], fn: genMathBayesian },
    { id: "math_matrices", subject: "Mathematics", discipline: "Linear Algebra", topic: "Matrices", subtopic: "Linear Transformations", concept: "Determinants & Composition", family: "math.family.linear-algebra", scenarios: ["population migration model", "image scaling on screen", "economic input-output model", "robotics coordinate transform"], difficulties: ["medium", "hard"], fn: genMathMatrices },

    { id: "cs_bigo", subject: "Computational Sciences", discipline: "Computer Science", topic: "Algorithms", subtopic: "Computational Complexity", concept: "Big-O Time Complexity", family: "cs.family.algorithms", scenarios: ["linear search", "nested comparison", "binary search", "constant-time lookup"], difficulties: ["easy", "medium", "hard"], fn: genCsBigO },
    { id: "cs_numbers", subject: "Computational Sciences", discipline: "Computer Science", topic: "Data Representation", subtopic: "Number Systems", concept: "Binary, Decimal & Hexadecimal Conversion", family: "cs.family.computational-math", scenarios: ["binary conversion", "hexadecimal conversion"], difficulties: ["easy", "medium", "hard"], fn: genCsNumberSystems },
    { id: "cs_graph_shortest_path", subject: "Computational Sciences", discipline: "Computer Science", topic: "Algorithms", subtopic: "Graph Algorithms", concept: "Shortest Path", family: "cs.family.algorithms", scenarios: ["delivery route network", "flight connections", "public transit map", "computer network routing"], difficulties: ["medium", "hard"], fn: genCsGraphShortestPath },
    { id: "cs_crypto_keyspace", subject: "Computational Sciences", discipline: "Cybersecurity", topic: "Cryptography", subtopic: "Keyspace & Brute-Force Resistance", concept: "Password / Key Strength", family: "cs.family.computational-math", scenarios: ["password security", "device PIN codes", "encryption key strength", "access-code lock"], difficulties: ["easy", "medium", "hard"], fn: genCsCryptoKeyspace },

    { id: "natsci_kinematics", subject: "Natural Sciences", discipline: "Physics", topic: "Mechanics", subtopic: "Kinematics", concept: "Uniformly Accelerated Motion", family: "natsci.family.physics", scenarios: ["delivery drone", "cyclist", "test vehicle", "elevator car"], difficulties: ["easy", "medium", "hard"], fn: genNatSciKinematics },
    { id: "natsci_chem", subject: "Natural Sciences", discipline: "Chemistry", topic: "Solutions", subtopic: "Molarity & Dilution", concept: "Concentration Calculations", family: "natsci.family.chemistry", scenarios: ["sodium chloride", "glucose", "sodium hydroxide", "potassium chloride", "acetic acid"], difficulties: ["easy", "medium", "hard"], fn: genNatSciChem },
    { id: "natsci_enzyme_kinetics", subject: "Natural Sciences", discipline: "Biology", topic: "Biochemistry", subtopic: "Enzyme Kinetics", concept: "Temperature Effects on Reaction Rate", family: "natsci.family.biology", scenarios: ["laboratory enzyme assay", "industrial fermentation process", "food spoilage study", "biology coursework experiment"], difficulties: ["easy", "medium", "hard"], fn: genNatSciEnzymeKinetics },
    { id: "natsci_genetics", subject: "Natural Sciences", discipline: "Biology", topic: "Genetics", subtopic: "Mendelian Inheritance", concept: "Punnett Squares & Probability", family: "natsci.family.biology", scenarios: ["pea plant breeding experiment", "flower colour genetics", "fruit fly genetics coursework", "animal coat colour breeding"], difficulties: ["easy", "medium", "hard"], fn: genNatSciGenetics },

    { id: "eng_circuits", subject: "Engineering", discipline: "Electrical Engineering", topic: "Circuit Analysis", subtopic: "Ohm's Law", concept: "Series & Parallel Resistor Networks", family: "eng.family.electrical", scenarios: ["series circuit", "parallel circuit"], difficulties: ["easy", "medium", "hard"], fn: genEngCircuits },
    { id: "eng_statics", subject: "Engineering", discipline: "Mechanical Engineering", topic: "Statics", subtopic: "Moments & Equilibrium", concept: "Lever Balance", family: "eng.family.mechanical", scenarios: ["lever balance scenario"], difficulties: ["easy", "medium", "hard"], fn: genEngStatics },
    { id: "eng_hydrostatics", subject: "Engineering", discipline: "Mechanical Engineering", topic: "Fluid Mechanics", subtopic: "Pressure", concept: "Hydrostatic Pressure", family: "eng.family.fluids", scenarios: ["water storage tank", "irrigation pipe network", "dam wall design", "aquarium tank design"], difficulties: ["easy", "medium", "hard"], fn: genEngHydrostatics },
    { id: "eng_oee", subject: "Engineering", discipline: "Industrial & Manufacturing Engineering", topic: "Production Metrics", subtopic: "Equipment Effectiveness", concept: "Overall Equipment Effectiveness (OEE)", family: "eng.family.manufacturing", scenarios: ["automotive parts plant", "electronics assembly line", "packaging plant", "textile manufacturing line"], difficulties: ["easy", "medium", "hard"], fn: genEngOEE },

    { id: "bus_eoq", subject: "Business Administration", discipline: "Operations Management", topic: "Inventory Management", subtopic: "Order Quantity Optimisation", concept: "Economic Order Quantity", family: "bus.family.inventory", scenarios: ["hardware store", "bakery supplier", "pharmacy", "bookstore", "auto parts distributor"], difficulties: ["easy", "medium", "hard"], fn: genBusEOQ },
    { id: "bus_productivity", subject: "Business Administration", discipline: "Operations Management", topic: "Production Planning", subtopic: "Efficiency Metrics", concept: "Labour Productivity & Capacity Utilisation", family: "bus.family.operations-metrics", scenarios: ["furniture workshop", "textile factory", "print shop", "food processing plant"], difficulties: ["easy", "medium", "hard"], fn: genBusProductivity },
    { id: "bus_reorder_point", subject: "Business Administration", discipline: "Operations Management", topic: "Inventory Management", subtopic: "Reorder Point", concept: "Demand Variability & Safety Stock", family: "bus.family.inventory", scenarios: ["retail warehouse", "auto parts distributor", "online grocery fulfilment centre", "electronics wholesaler"], difficulties: ["easy", "medium", "hard"], fn: genBusReorderPoint },
    { id: "bus_decision_ev", subject: "Business Administration", discipline: "Management", topic: "Organisational Decision-Making", subtopic: "Decision Analysis", concept: "Expected Value", family: "bus.family.decision-analysis", scenarios: ["new product launch decision", "marketing campaign choice", "equipment investment decision", "market entry decision"], difficulties: ["easy", "medium", "hard"], fn: genBusDecisionEV },

    { id: "econ_supplydemand", subject: "Economics", discipline: "Microeconomics", topic: "Market Behaviour", subtopic: "Supply and Demand", concept: "Market Equilibrium", family: "econ.family.market-analysis", scenarios: ["umbrellas", "bicycles", "coffee", "notebooks", "concert tickets", "office chairs"], difficulties: ["easy", "medium", "hard"], fn: genEconSupplyDemand },
    { id: "econ_elasticity", subject: "Economics", discipline: "Microeconomics", topic: "Market Behaviour", subtopic: "Elasticity", concept: "Price Elasticity of Demand", family: "econ.family.elasticity", scenarios: ["restaurant meals", "gasoline", "designer handbags", "breakfast cereal", "domestic flights", "streaming subscriptions"], difficulties: ["easy", "medium", "hard"], fn: genEconElasticity },
    { id: "econ_externalities", subject: "Economics", discipline: "Microeconomics", topic: "Market Failure", subtopic: "Externalities", concept: "Pigovian Taxation", family: "econ.family.market-analysis", scenarios: ["factory air pollution", "vehicle traffic congestion", "plastic packaging waste", "noise pollution near an airport"], difficulties: ["medium", "hard"], fn: genEconExternalities },
    { id: "econ_gdp", subject: "Economics", discipline: "Macroeconomics", topic: "National Income Accounting", subtopic: "GDP", concept: "Expenditure Approach", family: "econ.family.macro", scenarios: ["national economy annual report", "regional economic analysis", "quarterly economic briefing", "country comparison exercise"], difficulties: ["easy", "medium", "hard"], fn: genEconGDP },

    { id: "soc_sampling", subject: "Social Sciences", discipline: "Research Methods", topic: "Sampling", subtopic: "Sampling Techniques", concept: "Representativeness", family: "soc.family.survey-methods", scenarios: ["study habits", "customer satisfaction", "commuting preferences", "workplace wellbeing"], difficulties: ["easy", "medium", "hard"], fn: genSocSampling },
    { id: "soc_correlation", subject: "Social Sciences", discipline: "Research Methods", topic: "Causal Inference", subtopic: "Correlation", concept: "Correlation vs Causation", family: "soc.family.measurement-and-inference", scenarios: ["sleep and concentration", "ice cream and drowning", "exercise and stress", "class size and test scores"], difficulties: ["easy", "medium", "hard"], fn: genSocCorrelation },
    { id: "soc_nonresponse", subject: "Social Sciences", discipline: "Research Methods", topic: "Sampling", subtopic: "Sampling Bias", concept: "Non-Response Bias", family: "soc.family.survey-methods", scenarios: ["employee engagement survey", "customer satisfaction survey", "public health survey", "political opinion poll"], difficulties: ["easy", "medium", "hard"], fn: genSocNonresponse },
    { id: "soc_reliability_validity", subject: "Social Sciences", discipline: "Research Methods", topic: "Measurement", subtopic: "Psychometrics", concept: "Reliability & Validity", family: "soc.family.measurement-and-inference", scenarios: ["psychological test development", "employee performance evaluation tool", "standardized academic test", "customer satisfaction survey instrument"], difficulties: ["easy", "medium", "hard"], fn: genSocReliabilityValidity },

    { id: "hum_fallacy", subject: "Humanities", discipline: "Philosophy", topic: "Logic & Argumentation", subtopic: "Informal Fallacies", concept: "Argument Analysis", family: "hum.family.logic", scenarios: ["study technique", "recycling programme", "product line", "homework policy", "training method"], difficulties: ["easy", "medium", "hard"], fn: genHumFallacy },
    { id: "hum_sources", subject: "Humanities", discipline: "History", topic: "Historiography", subtopic: "Source Criticism", concept: "Primary vs Secondary Sources", family: "hum.family.historiography", scenarios: ["town history research"], difficulties: ["easy", "medium", "hard"], fn: genHumSources },
    { id: "hum_causation", subject: "Humanities", discipline: "History", topic: "Historiography", subtopic: "Historical Analysis", concept: "Causation", family: "hum.family.historiography", scenarios: ["a fictional trade policy change", "a fictional technological adoption", "a fictional public health reform", "a fictional regional conflict"], difficulties: ["easy", "medium", "hard"], fn: genHumCausation },
    { id: "hum_ethics_utilitarian", subject: "Humanities", discipline: "Philosophy", topic: "Ethics", subtopic: "Normative Ethical Theories", concept: "Utilitarian Reasoning", family: "hum.family.ethics", scenarios: ["a hypothetical public policy choice", "a hypothetical business resource allocation", "a hypothetical community resource decision", "a hypothetical hospital triage policy exercise"], difficulties: ["medium", "hard"], fn: genHumEthicsUtilitarian },
  ];

  const ALL_SUBJECTS = Array.from(new Set(TAXONOMY.map((n) => n.subject)));

  /* ============================================================
     HYBRID ACADEMIC TOPIC RANDOMIZATION ENGINE
     Replaces flat "avoid last N ids" selection with:
       - weighted, memory-aware subject selection (no fixed cycling)
       - multi-level cooldowns (concept / subtopic / concept-family)
       - a topic novelty score combining recency across every level
       - difficulty-aware filtering of which concepts are eligible
     ============================================================ */
  function weightedRandomPick(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return pick(items);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function makeSelectionEngine() {
    // history: most-recent-last list of records describing each accepted generation
    let history = [];

    function distanceSince(matchFn, cap) {
      // number of generations since a history entry last matched matchFn;
      // returns `cap` (max novelty) if it has never appeared.
      for (let i = history.length - 1, dist = 1; i >= 0; i--, dist++) {
        if (matchFn(history[i])) return Math.min(dist, cap);
      }
      return cap;
    }

    function windowCount(matchFn, windowSize) {
      return history.slice(-windowSize).filter(matchFn).length;
    }

    function subjectWeight(subject) {
      const dist = distanceSince((h) => h.subject === subject, 16);
      const countRecent = windowCount((h) => h.subject === subject, 12);
      // Higher when NOT used recently and NOT overused lately; every subject
      // keeps a positive floor so none can ever be starved out entirely.
      return Math.max(0.2, 1 + dist * 0.55 - countRecent * 0.75);
    }

    function pickSubjectWithMemory(eligibleSubjects) {
      const weights = eligibleSubjects.map(subjectWeight);
      return weightedRandomPick(eligibleSubjects, weights);
    }

    function poolSize(matchFn) {
      return TAXONOMY.filter(matchFn).length;
    }

    function isOnCooldown(node) {
      const conceptPool = poolSize(() => true);
      const subtopicPool = poolSize((n) => n.subtopic === node.subtopic);
      const familyPool = poolSize((n) => n.family === node.family);

      const conceptCooldown = Math.min(30, Math.max(2, conceptPool - 1));
      const subtopicCooldown = Math.min(15, Math.max(1, subtopicPool > 1 ? subtopicPool + 2 : 0));
      const familyCooldown = Math.min(10, Math.max(1, familyPool > 1 ? familyPool + 2 : 0));

      const distConcept = distanceSince((h) => h.conceptId === node.id, 999);
      const distSubtopic = distanceSince((h) => h.subtopic === node.subtopic, 999);
      const distFamily = distanceSince((h) => h.family === node.family, 999);

      if (distConcept < conceptCooldown) return true;
      if (subtopicCooldown > 0 && distSubtopic < subtopicCooldown) return true;
      if (familyCooldown > 0 && distFamily < familyCooldown) return true;
      return false;
    }

    function noveltyScore(node, scenario) {
      const wSubject = distanceSince((h) => h.subject === node.subject, 14) * 0.5;
      const wDiscipline = distanceSince((h) => h.discipline === node.discipline, 14) * 0.8;
      const wTopic = distanceSince((h) => h.topic === node.topic, 20) * 1.0;
      const wSubtopic = distanceSince((h) => h.subtopic === node.subtopic, 20) * 1.4;
      const wConcept = distanceSince((h) => h.conceptId === node.id, 40) * 1.8;
      const wFamily = distanceSince((h) => h.family === node.family, 20) * 1.3;
      const wScenario = scenario ? distanceSince((h) => h.scenario === scenario, 10) * 0.6 : 3;
      const immediateRepeatPenalty = history.length && history[history.length - 1].conceptId === node.id ? -1000 : 0;
      return wSubject + wDiscipline + wTopic + wSubtopic + wConcept + wFamily + wScenario + immediateRepeatPenalty;
    }

    // Selects the next {node, scenario} to generate from, honouring difficulty,
    // cooldowns, and novelty scoring. Falls back gracefully (never deadlocks)
    // by relaxing cooldowns and finally by novelty-only ranking if needed.
    function selectConcept(difficulty) {
      const eligible = TAXONOMY.filter((n) => difficulty === "random" || n.difficulties.includes(difficulty));
      const pool = eligible.length ? eligible : TAXONOMY;
      const subjectsAvailable = Array.from(new Set(pool.map((n) => n.subject)));

      let best = null;
      let bestScore = -Infinity;
      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const relaxCooldowns = attempt > 40; // graceful degradation, never deadlocks
        const subject = pickSubjectWithMemory(subjectsAvailable);
        const candidates = pool.filter((n) => n.subject === subject);
        if (!candidates.length) continue;
        const node = pick(candidates);
        if (!relaxCooldowns && isOnCooldown(node)) continue;
        if (history.length && history[history.length - 1].conceptId === node.id) continue; // hard block on an exact immediate repeat
        const scenario = node.scenarios && node.scenarios.length ? pick(node.scenarios) : null;
        const score = noveltyScore(node, scenario);
        if (score > bestScore) {
          bestScore = score;
          best = { node, scenario };
        }
        if (attempt >= 10 && bestScore > 8) break; // good enough candidate found, stop searching
      }
      if (!best) {
        // final, guaranteed-non-null fallback: pick anything not identical to the last concept
        const fallbackPool = pool.filter((n) => !(history.length && history[history.length - 1].conceptId === n.id));
        const node = pick(fallbackPool.length ? fallbackPool : pool);
        const scenario = node.scenarios && node.scenarios.length ? pick(node.scenarios) : null;
        best = { node, scenario };
      }
      return best;
    }

    function recordAcceptedTopic(node, scenario) {
      history.push({
        subject: node.subject,
        discipline: node.discipline,
        topic: node.topic,
        subtopic: node.subtopic,
        conceptId: node.id,
        family: node.family,
        scenario,
      });
      if (history.length > 300) history.shift();
    }

    return {
      selectConcept,
      recordAcceptedTopic,
      getHistory: () => history.slice(),
      // legacy-compatible surface (kept in case anything else inspects a tracker instance)
      reset() { history = []; },
    };
  }

  // Preserve the historical function name/signature (`makeHistoryTracker(maxLen)`)
  // used by the surrounding application, but have it build the new hybrid
  // selection engine instead of the old "avoid last N ids" tracker. Callers
  // that already do `const tracker = Engine.makeHistoryTracker(3)` and then
  // `Engine.generateTopic(diff, tracker)` continue to work unchanged.
  function makeHistoryTracker(_maxLenLegacyArg) {
    return makeSelectionEngine();
  }

  function isValidSubject(subjectName) {
    return ALL_SUBJECTS.indexOf(subjectName) !== -1;
  }

  function generateTopic(difficultySetting, engineOrTracker) {
    let diff = difficultySetting;
    if (diff === "random") diff = pick(["easy", "medium", "hard"]);
    const engine = engineOrTracker || makeSelectionEngine();
    let topic = null;
    let tries = 0;
    while (tries < 40 && !topic) {
      tries++;
      const selection = engine.selectConcept(diff);
      if (!selection) continue;
      const { node, scenario } = selection;
      let candidate = null;
      try {
        candidate = node.fn(diff, scenario);
      } catch (e) {
        candidate = null;
      }
      if (!candidate) continue;

      candidate.subject = candidate.subject || node.subject;
      candidate.generatorId = node.id;
      candidate.discipline = node.discipline;
      candidate.topic = node.topic;
      candidate.subtopic = node.subtopic;
      candidate.concept = node.concept;
      candidate.family = node.family;
      candidate.scenario = scenario;

      const structurallyValid = validateTopic(candidate);
      const subjectValid = isValidSubject(candidate.subject);
      if (structurallyValid && subjectValid) {
        topic = candidate;
        engine.recordAcceptedTopic(node, scenario);
      }
    }
    return topic; // null only if something is fundamentally broken (should not happen)
  }

  const Engine = {
    randInt, randFloat, pick, pickN, shuffle, coinFlip,
    fmtNum, fmtInt,
    buildOptions, numDistractors, q,
    validateTopic, plainWordCount,
    TAXONOMY,
    GENERATORS: TAXONOMY, // backward-compatible alias
    ALL_SUBJECTS,
    makeSelectionEngine,
    makeHistoryTracker,
    generateTopic,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Engine;
  } else {
    root.Engine = Engine;
  }
})(typeof window !== "undefined" ? window : globalThis);
