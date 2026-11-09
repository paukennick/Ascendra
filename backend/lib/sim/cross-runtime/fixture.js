// REQ-141 (docs/sims.md 5.5, 16, 17 step 2): a tiny deterministic program
// run on every JS engine the app can run on (Node/V8 here and in CI; Hermes
// built from the app's own tag; Chromium, Firefox and WebKit in the browser
// job). Its output must be byte-identical everywhere; fixture.expected.txt is
// that output. Plain script, no modules or TypeScript, so Hermes can run it
// as is. Phase 1a step 3 replaces it with the engine's v1 corpus.
//
// simCrossRuntimeFixture() is the part that must match: IEEE arithmetic,
// pure-JS exp/ln (only + - * / and exact scaling), number formatting, a seeded
// PRNG, sort stability, key order, string handling. simCrossRuntimeNative()
// is informational only: native Math.exp/sin/pow/... are implementation-
// defined in ECMAScript, which is why the engine must not use them (5.5).
(function (g) {
  var view = new DataView(new ArrayBuffer(8));
  function bits(x) {
    view.setFloat64(0, x);
    return view.getUint32(0).toString(16).padStart(8, "0") + view.getUint32(4).toString(16).padStart(8, "0");
  }

  var LN2_HI = 6.93147180369123816490e-1;
  var LN2_LO = 1.90821492927058770002e-10;
  function scale2(x, k) {
    var i;
    if (k > 0) for (i = 0; i < k; i++) x = x * 2;
    else for (i = 0; i < -k; i++) x = x / 2;
    return x;
  }
  function dexp(x) {
    var k = Math.round(x / 0.6931471805599453);
    var r = x - k * LN2_HI - k * LN2_LO;
    var term = 1;
    var sum = 1;
    for (var i = 1; i <= 22; i++) {
      term = (term * r) / i;
      sum = sum + term;
    }
    return scale2(sum, k);
  }
  function dln(x) {
    if (!(x > 0)) return NaN;
    var k = 0;
    while (x > 1.4142135623730951) {
      x = x / 2;
      k++;
    }
    while (x < 0.7071067811865476) {
      x = x * 2;
      k--;
    }
    var z = (x - 1) / (x + 1);
    var z2 = z * z;
    var p = z;
    var sum = 0;
    for (var n = 1; n <= 61; n += 2) {
      sum = sum + p / n;
      p = p * z2;
    }
    return 2 * sum + k * LN2_LO + k * LN2_HI;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fnv1a(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }

  var GRID = [-20, -7.5, -1, -0.5, -1e-9, 0, 1e-9, 0.1, 0.5, 1, 2, 2.5, 3.14159, 10, 37.5, 100, 700];
  var LN_GRID = [1e-300, 1e-9, 0.001, 0.1, 0.5, 0.75, 1, 1.5, 2, 2.718281828459045, 10, 98.6, 1e6, 1e300];

  g.simCrossRuntimeFixture = function () {
    var out = [];
    function line(name, value) {
      out.push(name + ": " + value);
    }

    // IEEE-754 basics (correctly rounded everywhere)
    line("0.1+0.2", bits(0.1 + 0.2) + " " + String(0.1 + 0.2));
    line("1/3", bits(1 / 3) + " " + String(1 / 3));
    line("-0", String(1 / -0) + " " + Object.is(-0 * 1, -0) + " " + String(-0) + " " + bits(-0));
    line("div0", String(1 / 0) + " " + String(-1 / 0) + " " + String(0 / 0));
    line("max_safe+2", String(Number.MAX_SAFE_INTEGER + 2));
    line("epsilon", bits(Number.EPSILON));
    line("tiny", String(5e-324) + " " + bits(5e-324 / 2) + " " + String(Number.MIN_VALUE * 0.5));
    line("sqrt", [2, 3, 0.5, 1e-10, 12345.678].map(function (x) { return bits(Math.sqrt(x)); }).join(" "));
    line("mod", [5 % 3, -5 % 3, 5 % -3, 5.5 % 2, -0 % 1].map(String).join(" "));
    line("round", [2.5, -2.5, 0.49999999999999994, -0.5, 1.5].map(function (x) { return String(Math.round(x)); }).join(" "));
    line("floor/ceil/trunc/sign", [Math.floor(-1.5), Math.ceil(-1.5), Math.trunc(-1.5), Math.sign(-3), Math.abs(-0)].map(String).join(" "));
    line("min/max", String(Object.is(Math.min(0, -0), -0)) + " " + String(Object.is(Math.max(-0, 0), 0)));

    var acc = 0;
    for (var i = 0; i < 100000; i++) acc = acc + 0.1;
    line("sum 0.1 x 1e5", bits(acc) + " " + String(acc));
    var v = 72;
    for (var t = 0; t < 5400; t++) v = v + (0.02 * (130 - v) - 0.0001 * v * v) / 60;
    line("ode 5400 ticks", bits(v) + " " + String(v));

    // Deterministic maths built from + - * / only
    line("dexp", GRID.map(function (x) { return bits(dexp(x)); }).join(" "));
    line("dln", LN_GRID.map(function (x) { return bits(dln(x)); }).join(" "));
    line("dexp(1) dln(10)", String(dexp(1)) + " " + String(dln(10)));

    // Number to string and back
    var nums = [0.1, 100, 1e21, 1e-7, 123456789012345680000, 1.005, 2.5, 0.000001, -1.5e-10, 1 / 3, 98.6, 37.00000000000001];
    line("String", nums.map(String).join(" "));
    line("toFixed", [1.005, 2.5, 1.45, 0.5, -1.5, 98.649999, 1e21].map(function (x) { return x.toFixed(2) + "|" + x.toFixed(0); }).join(" "));
    line("toPrecision", [123.456, 0.000123456, 1e21].map(function (x) { return x.toPrecision(4); }).join(" "));
    line("toExponential", [123.456, 0, 5e-324].map(function (x) { return x.toExponential(3); }).join(" "));
    line("parseFloat", ["0.1", "1e-7", "  3.14abc", "-0", "0x10", "Infinity"].map(function (s) { return bits(parseFloat(s)); }).join(" "));
    line("JSON", JSON.stringify({ b: 1, a: [0.1, -0, 1e21, 1 / 3], 2: "x", 1: true, z: null }));

    // Seeded randomness (integer ops only)
    var rand = mulberry32(141);
    var draws = [];
    for (var d = 0; d < 1000; d++) draws.push(bits(rand()));
    line("mulberry32 first", draws.slice(0, 3).join(" "));
    line("mulberry32 1000 hash", fnv1a(draws.join(",")));

    // Ordering
    var items = [];
    for (var s = 0; s < 40; s++) items.push({ k: s % 4, id: s });
    items.sort(function (x, y) { return x.k - y.k; });
    line("stable sort", items.map(function (o) { return o.id; }).join(","));
    var keys = { b: 0, 10: 0, a: 0, 2: 0, "-1": 0, 1.5: 0 };
    line("key order", Object.keys(keys).join(","));

    // Strings (ASCII and BMP only; no locale-dependent calls)
    line("strings", ["Tamponade", "SpO₂", "café"].map(function (x) { return x.toUpperCase() + "/" + x.length; }).join(" "));
    line("replace", "MAP 65 mmHg; HR 120 bpm".replace(/(\d+)/g, "<$1>"));
    line("codes", String.fromCharCode(72, 105, 0x2014) + " " + "é".charCodeAt(0));

    var body = out.join("\n");
    return body + "\nhash: " + fnv1a(body);
  };

  g.simCrossRuntimeNative = function () {
    var fns = ["exp", "log", "sin", "cos", "tan", "atan2", "pow", "expm1", "log1p", "cbrt", "hypot"];
    var out = [];
    for (var f = 0; f < fns.length; f++) {
      var name = fns[f];
      var vals = [];
      for (var i = 0; i < GRID.length; i++) {
        var x = GRID[i];
        var y;
        if (name === "atan2" || name === "pow" || name === "hypot") y = Math[name](x, 1.7);
        else if (name === "log" || name === "log1p") y = Math[name](Math.abs(x) + 0.37);
        else y = Math[name](x);
        vals.push(bits(y));
      }
      out.push("native " + name + ": " + vals.join(" "));
    }
    return out.join("\n");
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
