// REQ-146 (FAIL-530): reading the app protocol header.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientProtocol, isHintAwareClient, CLIENT_PROTOCOL_HEADER, HINT_AWARE_PROTOCOL } from "./client-protocol";

const req = (v?: string) => new Request("http://t/x", { headers: v === undefined ? {} : { [CLIENT_PROTOCOL_HEADER]: v } });

test("no header is an app build without the hint flow", () => {
  assert.equal(clientProtocol(req()), 0);
  assert.equal(isHintAwareClient(req()), false);
});

test("the current app's header is hint-aware, read case-insensitively", () => {
  assert.equal(isHintAwareClient(req(String(HINT_AWARE_PROTOCOL))), true);
  assert.equal(isHintAwareClient(new Request("http://t/x", { headers: { "x-ascendra-client": " 1 " } })), true);
  assert.equal(clientProtocol(req("7")), 7);
});

test("an unreadable value counts as no header (the safe side: choices sent, hint recorded)", () => {
  for (const v of ["", "abc", "-1", "1.5", "0", "9999999"]) assert.equal(isHintAwareClient(req(v)), false, v);
});
