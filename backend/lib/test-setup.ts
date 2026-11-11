// REQ-219 (FAIL-1109): preloaded by `npm run test:db` and
// scripts/ci/db-tests-as-runtime.sh (`--import ./lib/test-setup.ts`).
//
// requireUser refuses an account that has not accepted the Terms and Privacy
// Policy its client must accept (403 terms_required). The integration suites
// create bare accounts to exercise other things, and none of them accepted;
// this switches the check off for them. lib/terms-enforcement.dbtest.ts (and
// the G4 suite) switch it back on, and lib/terms-enforcement.test.ts checks
// that the default is ON and that both scripts load this file.
import { __setTermsEnforcementForTest } from "./auth/requireUser";

__setTermsEnforcementForTest(false);
