// REQ-162 (docs/sims.md 5.5, 5.6): the engine's own maths. Only + - * /,
// Math.sqrt, floor, ceil, round, abs, min, max, trunc and imul are used, all
// of which IEEE 754 or ECMAScript pin to the bit, so Hermes, V8, SpiderMonkey
// and JavaScriptCore agree. Math.exp, Math.sin, Math.pow and `**` do not
// (docs/sims-hermes-spike.md) and are banned in this folder by a source test.

export const SAT_MAX = 1e300;

// Every arithmetic result passes through this: non-finite values saturate,
// NaN (which the rules in 4.3 prevent, but a bug must not spread) becomes 0,
// and -0 is stored as 0.
export function sat(x: number): number {
  if (x !== x) return 0;
  if (x > SAT_MAX) return SAT_MAX;
  if (x < -SAT_MAX) return -SAT_MAX;
  return x === 0 ? 0 : x;
}

export function div(a: number, b: number): number {
  return b === 0 ? 0 : sat(a / b);
}

const LN2_HI = 6.93147180369123816490e-1;
const LN2_LO = 1.90821492927058770002e-10;
const LN2 = 0.6931471805599453;

// Exact scaling by a power of two: multiplying by 2 never rounds until the
// value leaves the normal range, which saturation handles.
function scale2(x: number, k: number): number {
  if (k > 0) for (let i = 0; i < k; i++) x = x * 2;
  else for (let i = 0; i < -k; i++) x = x / 2;
  return x;
}

// e^x: argument clamped to [-700, 700] (4.3), range-reduced by ln 2, then a
// fixed 22-term Taylor series. Deterministic by construction.
export function dexp(x: number): number {
  if (x !== x) return 1;
  if (x > 700) x = 700;
  if (x < -700) x = -700;
  const k = Math.round(x / LN2);
  const r = x - k * LN2_HI - k * LN2_LO;
  let term = 1;
  let sum = 1;
  for (let i = 1; i <= 22; i++) {
    term = (term * r) / i;
    sum = sum + term;
  }
  return sat(scale2(sum, k));
}

// Natural log: 0 for x <= 0 (4.3 totality rule), otherwise range reduction
// to [1/sqrt2, sqrt2] and the atanh series in z = (x-1)/(x+1).
export function dln(x: number): number {
  if (!(x > 0)) return 0;
  let k = 0;
  while (x > 1.4142135623730951) {
    x = x / 2;
    k++;
  }
  while (x < 0.7071067811865476) {
    x = x * 2;
    k--;
  }
  const z = (x - 1) / (x + 1);
  const z2 = z * z;
  let p = z;
  let sum = 0;
  for (let n = 1; n <= 61; n += 2) {
    sum = sum + p / n;
    p = p * z2;
  }
  return sat(2 * sum + k * LN2_LO + k * LN2_HI);
}

export const PI = 3.141592653589793;
const TWO_PI_HI = 6.283185307179586;
const TWO_PI_LO = 2.4492935982947064e-16;
const HALF_PI = 1.5707963267948966;

// Reduce to [-pi, pi] with a two-part 2*pi, then Taylor on [-pi/2, pi/2]
// by symmetry. Fixed 12 odd terms: more than enough for the double grid the
// tests pin, and identical everywhere because only + - * / are used.
function reducePi(x: number): number {
  const k = Math.round(x / TWO_PI_HI);
  return x - k * TWO_PI_HI - k * TWO_PI_LO;
}

function sinCore(r: number): number {
  // r in [-pi/2, pi/2]
  const r2 = r * r;
  let term = r;
  let sum = r;
  for (let i = 1; i <= 12; i++) {
    term = (-term * r2) / ((2 * i) * (2 * i + 1));
    sum = sum + term;
  }
  return sum;
}

export function dsin(x: number): number {
  if (x !== x) return 0;
  if (x > SAT_MAX || x < -SAT_MAX) return 0;
  let r = reducePi(x);
  if (r > HALF_PI) r = PI - r;
  else if (r < -HALF_PI) r = -PI - r;
  return sat(sinCore(r));
}

export function dcos(x: number): number {
  if (x !== x) return 1;
  if (x > SAT_MAX || x < -SAT_MAX) return 1;
  // cos(x) = sin(x + pi/2), reduced the same way
  let r = reducePi(x) + HALF_PI;
  if (r > PI) r = r - TWO_PI_HI - TWO_PI_LO;
  if (r > HALF_PI) r = PI - r;
  else if (r < -HALF_PI) r = -PI - r;
  return sat(sinCore(r));
}

// pow(x, y): an integer y with |y| <= 64 is repeated squaring in a fixed
// order (negative y as 1 / pow(x, -y)); otherwise exp(y ln x) for x > 0 and 0
// for x <= 0; pow(0, 0) = 1 (5.5).
export function dpow(x: number, y: number): number {
  if (y === 0) return 1;
  if (y === Math.trunc(y) && y >= -64 && y <= 64) {
    let n = y < 0 ? -y : y;
    let base = x;
    let result = 1;
    while (n > 0) {
      if (n % 2 === 1) result = sat(result * base);
      n = Math.floor(n / 2);
      if (n > 0) base = sat(base * base);
    }
    return y < 0 ? div(1, result) : result;
  }
  if (!(x > 0)) return 0;
  return dexp(y * dln(x));
}

export function dsqrt(x: number): number {
  return x > 0 ? Math.sqrt(x) : 0; // sqrt is exactly rounded; non-positive -> 0 (4.3)
}

export function lerp(a: number, b: number, t: number): number {
  return sat(a + (b - a) * t);
}

export function clamp(x: number, lo: number, hi: number): number {
  if (lo > hi) {
    const t = lo;
    lo = hi;
    hi = t;
  }
  return x < lo ? lo : x > hi ? hi : x;
}

// ---- seeded randomness (5.6): mulberry32, integer ops and Math.imul only ----

// Derive a stream's initial state from (seed, stream name) so adding a stream
// never shifts another. FNV-1a over the name folded into the seed.
export function streamSeed(seed: number, name: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0;
  }
  return h >>> 0;
}

// One mulberry32 step: returns the next state and the draw in [0, 1).
export function mulberry32Step(state: number): { state: number; u: number } {
  let a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: a >>> 0, u };
}

// ---- state hash (5.5): FNV-1a as two 32-bit lanes over typed bytes ----

const F64 = new Float64Array(1);
const U32 = new Uint32Array(F64.buffer);

export interface Hasher {
  lo: number;
  hi: number;
}

export function hasherNew(): Hasher {
  return { lo: 0x811c9dc5, hi: 0xcbf29ce4 };
}

function mix(h: Hasher, byte: number): void {
  h.lo = Math.imul(h.lo ^ byte, 16777619) >>> 0;
  h.hi = Math.imul(h.hi ^ ((byte + 0x5bd1e995) & 0xff), 16777619) >>> 0;
  // cross the lanes so each depends on the other's history
  h.hi = (h.hi ^ (h.lo >>> 13)) >>> 0;
}

export function hashU32(h: Hasher, v: number): void {
  v = v >>> 0;
  mix(h, v & 0xff);
  mix(h, (v >>> 8) & 0xff);
  mix(h, (v >>> 16) & 0xff);
  mix(h, (v >>> 24) & 0xff);
}

export function hashTag(h: Hasher, tag: number): void {
  mix(h, tag & 0xff);
}

export function hashNumber(h: Hasher, x: number): void {
  F64[0] = x === 0 ? 0 : x; // -0 normalised
  hashU32(h, U32[0]);
  hashU32(h, U32[1]);
}

export function hashString(h: Hasher, s: string): void {
  hashU32(h, s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    mix(h, c & 0xff);
    mix(h, (c >>> 8) & 0xff);
  }
}

export function hashHex(h: Hasher): string {
  return hex8(h.hi) + hex8(h.lo);
}

export function hex8(v: number): string {
  let s = (v >>> 0).toString(16);
  while (s.length < 8) s = "0" + s;
  return s;
}
