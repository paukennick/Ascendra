// REQ-207 (FAIL-951): the pure part of pin-actions.mjs, so it can be tested
// without a network. Input is the output of `git ls-remote --tags <repo>`.
//
// For an annotated tag, ls-remote lists two entries: refs/tags/vX.Y.Z (the tag
// OBJECT) and refs/tags/vX.Y.Z^{} (the COMMIT the tag points at). A workflow
// must pin the commit, so the peeled entry wins when present. A lightweight
// tag has one entry, which already is the commit.

const SHA = /^[0-9a-f]{40}$/;

export function parseLsRemote(output) {
  const tags = new Map(); // tag -> { tagObject?, commit? }
  for (const line of output.split("\n")) {
    const m = /^([0-9a-f]{40})\trefs\/tags\/(.+?)(\^\{\})?$/.exec(line);
    if (!m) continue;
    const entry = tags.get(m[2]) ?? {};
    if (m[3]) entry.commit = m[1];
    else entry.tagObject = m[1];
    tags.set(m[2], entry);
  }
  return tags;
}

// The newest vX.Y.Z (or X.Y.Z; expo/expo-github-action has no "v") inside the
// major version a workflow names ("v4"). The comment is always written vX.Y.Z.
export function newestInMajor(repo, ref, tags) {
  const major = /^v(\d+)$/.exec(ref)?.[1];
  if (!major) throw new Error(`${repo}@${ref}: expected a major-version tag like v4`);
  const re = new RegExp(`^v?${major}\\.\\d+\\.\\d+$`);
  const names = [...tags.keys()].filter((t) => re.test(t));
  names.sort((a, b) => {
    const [x, y] = [a, b].map((t) => t.replace(/^v/, "").split(".").map(Number));
    return x[1] - y[1] || x[2] - y[2];
  });
  const tag = names.at(-1);
  if (!tag) throw new Error(`${repo}: no v${major}.x.y tag found`);
  const e = tags.get(tag);
  const sha = e.commit ?? e.tagObject;
  if (!SHA.test(sha ?? "")) throw new Error(`${repo}@${tag}: could not resolve a commit`);
  return { tag: `v${tag.replace(/^v/, "")}`, sha };
}
