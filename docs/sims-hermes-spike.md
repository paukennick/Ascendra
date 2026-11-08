# Sim engine: the Hermes spike (REQ-141, Phase 1a step 2)

Question from `docs/sims.md` 16 and 17: can CI run the engine under Hermes,
the JavaScript engine the app uses on phones, so golden replays are checked
on it and not only on Node?

**Answer: yes, by building the Hermes VM from source at the exact tag the
app's React Native pins, cached by that tag.** No prebuilt, runnable Hermes VM
for Linux exists for this version. CI now runs a deterministic fixture under
that VM (as source, and as the app's own `-O` bytecode), under Node, and in
Chromium, Firefox and WebKit, and fails unless all outputs are byte-identical.
On 2026-11-07 they were, locally. An on-device run is still required before
Phase 1c exits (below).

## What the app ships

Observed in `mobile/node_modules` after `npm ci` (lockfile at master `ac9fe3f`):

- `react-native` 0.86.3, `expo` 57.0.24.
- `react-native/sdks/.hermesv1version` = `hermes-v250829098.0.17`;
  `.hermesversion` = `hermes-v0.17.0` (legacy Hermes).
- React Native 0.86 uses **Hermes V1** unless a build opts out:
  `sdks/hermes-engine/hermes-engine.podspec` picks V1 unless
  `RCT_HERMES_V1_ENABLED=0`; the Android gradle plugin
  (`ProjectUtils.isHermesV1Enabled`) reads `hermesV1Enabled`. The repo has no
  `android/` or `ios/` folder and `app.json` sets neither, so V1 is the
  default. Inference, not checked: Expo's prebuild template could set the
  gradle property; the on-device run settles it.
- `hermes-compiler` 250829098.0.17 provides `hermesc` for linux64, osx and
  win64. It is a compiler only: `hermesc file.js` answers "hermesc does not
  support -exec". `hermesc -version`: Hermes release 1.0.0, HBC bytecode 98.
- No `hermes`, `hermes-engine` or `hermes-engine-cli` package is installed.
  `react-native/sdks/hermes-engine/` holds only the podspec and Ruby helpers;
  `ReactAndroid/hermes-engine/` only a gradle build file.

## Where a runnable VM could come from

| Source | Result |
| --- | --- |
| npm `hermes-engine-cli` | Latest 0.12.0 (legacy Hermes, 2022). Wrong engine; rejected. |
| npm `hermes-engine` | Latest 0.11.0, legacy. Rejected. |
| Maven `com.facebook.hermes:hermes-ios:250829098.0.17` (`hermes-ios-release.tar.gz`, sha256 `2967ee51...309d`) | `destroot/bin` has only `hermesc` (macOS universal) and `hermes-lit`; the VM is `hermesvm.framework` (macOS/iOS dylib). A macOS runner could host it through a small C++ JSI program; not pursued (macOS minutes, a C++ harness to maintain). |
| Maven `hermes-android:250829098.0.17` | `.aar` with Android (bionic) libraries; not runnable on a Linux runner. |
| GitHub releases of facebook/hermes | Not reachable from the spike sandbox (API blocked); Hermes' own CI uploads Linux `hermesc` only (`.github/workflows/build-hermesc-linux.yml` at the tag). |
| **Source at tag `hermes-v250829098.0.17`** (commit `3477757e`) | **Works.** `cmake -G Ninja -DCMAKE_BUILD_TYPE=Release -DHERMES_ENABLE_TEST_SUITE=OFF`, target `hermes`: 785 s on 2 cores locally; needs `libicu-dev` and `libreadline-dev`. `hermes -version`: "Hermes JavaScript compiler and Virtual Machine", release 1.0.0, HBC bytecode 98, the same as the app's `hermesc`. |

## What ran and what matched (local, 2026-11-07)

The fixture is `backend/lib/sim/cross-runtime/fixture.js`: IEEE arithmetic
(as raw float64 bits), `-0`, a 5,400-step integration, exp and ln built from
`+ - * /` only, number formatting (`String`, `toFixed`, `toPrecision`,
`toExponential`, `JSON.stringify`), `parseFloat`, a seeded integer PRNG
(1,000 draws), sort stability, property order and ASCII/BMP strings, ending
in an FNV-1a hash. Node's output is committed as `fixture.expected.txt`
(hash `020b753a`) and `lib/sim/cross-runtime/fixture.test.ts` holds Node to
it.

| Engine | Fixture vs Node | Native `Math` functions differing from Node 22 on the grid |
| --- | --- | --- |
| Hermes VM (built from the tag), source | byte-identical | log, sin, cos, tan, atan2, pow, cbrt |
| Hermes VM, bytecode from the app's `hermesc -emit-binary -O` | byte-identical | (same VM) |
| Chromium 156.0.8078.4 (Playwright 1.64.1) | byte-identical | log, sin, cos, tan, atan2, pow, expm1, log1p, cbrt |
| Firefox 157.0 | byte-identical | cos, pow, hypot |
| WebKit 27.2 | byte-identical | log, sin, cos, tan, atan2, pow, cbrt, hypot |

The native column is the evidence for the rule in `docs/sims.md` 5.5: the
engine must not call `Math.exp`, `Math.sin`, `Math.pow` and the like, because
engines disagree in the last bits, even two versions of V8.

## What CI runs now (`.github/workflows/ci.yml`)

- **Sim cross-runtime (Hermes)**: `npm ci` in both packages, reads the tag
  from `react-native/sdks/.hermesv1version`, restores the VM from the cache
  (key: tag, runner OS, release) or builds it, then requires the fixture as
  source and as `-O` bytecode to `cmp` equal to `fixture.expected.txt`. It
  prints which native `Math` functions differ, without failing. A React
  Native upgrade that moves the Hermes tag rebuilds the VM automatically.
- **Sim cross-runtime (Chromium, Firefox, WebKit)**: installs Playwright
  1.64.1 into a temp folder (not a dependency of either package) and runs
  `npm run sim:cross-runtime -- browsers`.

Phase 1a step 3 replaces the fixture with the v1 corpus; both jobs keep
their shape.

## What this does not prove

- The VM CI runs is built by us on x86-64 Linux with GCC, not the binary the
  App Store and Play builds link (prebuilt by Meta for arm64 iOS and Android,
  built with Clang). JavaScript arithmetic is specified to the bit, so the
  same source should give the same answers, but a compiler or CPU difference
  in Hermes' own number formatting or parsing would only show on a device.
- So the requirement in `docs/sims.md` 16 and 17 stands: **before Phase 1c
  exits, a developer-only screen runs the v1 corpus on a real iPhone and a
  real Android phone and the hashes are recorded against Node's.** That run
  also confirms the release build really uses Hermes V1.
- Each browser is the version Playwright 1.64.1 bundles, not every browser
  version a learner may use; Expo web on an older browser is covered only by
  the same specification argument.

## Reproduce

```sh
# Node reference and the browser run (backend/)
npm run sim:cross-runtime -- print | cmp - lib/sim/cross-runtime/fixture.expected.txt
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright npm run sim:cross-runtime -- browsers

# Hermes (needs cmake, ninja, libicu-dev, libreadline-dev)
git clone --depth 1 --branch "$(cat ../mobile/node_modules/react-native/sdks/.hermesv1version)" \
  https://github.com/facebook/hermes /tmp/hermes
cmake -S /tmp/hermes -B /tmp/hermes-build -G Ninja -DCMAKE_BUILD_TYPE=Release -DHERMES_ENABLE_TEST_SUITE=OFF
cmake --build /tmp/hermes-build --target hermes
npm run sim:cross-runtime -- hermes-script fixture /tmp/fixture.js
/tmp/hermes-build/bin/hermes /tmp/fixture.js | cmp - lib/sim/cross-runtime/fixture.expected.txt
```
