// What a signed-in learner leaves on the device: unsent chat and support
// drafts, PBQ simulator progress and lesson positions. All are keyed per user
// (src/lib/drafts.ts, src/lib/lessonProgress.ts), so a second account never
// sees them, but they stayed in plain AsyncStorage (localStorage on web)
// after "Log out" and "Log out of all devices" (Audit 2 mobile item 10,
// FAIL-070). This is the pure half of removing them: which keys belong to a
// user, and a guard that stops a screen still unmounting from writing one
// back after the sweep.
//
// Key shapes:
//   ascendra.draft.<thread>.<userId>.<id>   (chat, support)
//   ascendra.pbqProgress.<userId>.<unitId>
//   ascendra.lessonProgress.<userId>.<objectiveId>
//   ascendra.labDraft.<userId>.<objectiveId>   (lab report answers, REQ-106;
//                                             FAIL-235: missed until integration)
//   ascendra.reminders.<userId>                (study reminder settings, REQ-119)
//   ascendra.reminderPlan.<userId>             (the last reminder plan, REQ-197:
//                                             names the learner's topics)
//   ascendra.dictationHint.<userId>            (dictation tip dismissed, REQ-197)
//   ascendra.simJournal.<userId>.<simId>       (unsent sim commands, REQ-199)

const PREFIX = "ascendra.";

// The user id segment of one of the keys above, or null for any other key.
export function localDataOwner(key: string): string | null {
  if (!key.startsWith(PREFIX)) return null;
  const parts = key.slice(PREFIX.length).split(".");
  if (parts[0] === "draft") return parts.length >= 4 && parts[2] ? parts[2] : null;
  if (parts[0] === "pbqProgress" || parts[0] === "lessonProgress" || parts[0] === "labDraft" || parts[0] === "simJournal") return parts.length >= 3 && parts[1] ? parts[1] : null;
  if (parts[0] === "reminders" || parts[0] === "reminderPlan" || parts[0] === "dictationHint") {
    return parts.length === 2 && parts[1] ? parts[1] : null;
  }
  return null;
}

export function userLocalDataKeys(keys: readonly string[], userId: string): string[] {
  if (!userId) return [];
  return keys.filter((k) => localDataOwner(k) === userId);
}

// Users who have logged out on this device since the app started. A draft
// write for one of them is dropped. Cleared when that user signs in again.
export interface LocalDataGuard {
  loggedOut(userId: string): void;
  signedIn(userId: string): void;
  mayWrite(key: string): boolean;
  isLoggedOut(userId: string): boolean;
}

export function createLocalDataGuard(): LocalDataGuard {
  const blocked = new Set<string>();
  return {
    loggedOut(userId) {
      if (userId) blocked.add(userId);
    },
    signedIn(userId) {
      blocked.delete(userId);
    },
    mayWrite(key) {
      const owner = localDataOwner(key);
      return owner === null || !blocked.has(owner);
    },
    isLoggedOut(userId) {
      return blocked.has(userId);
    },
  };
}

export const localDataGuard = createLocalDataGuard();
