// REQ-119 (Audit 3 product L1/item 8): what an empty screen says. Each one
// says what the screen is for and offers the one next action, and never
// claims more than is true ("All caught up" to someone who hasn't learned
// anything yet was the example).

export interface EmptyCopy {
  title: string;
  message: string;
  action?: { label: string; to: "explore" | "home" | "course" | "support" | "lessons" };
}

// Review hub, when nothing is due and there are no unit checks or missed
// scenarios. nextDueOn null means nothing is on the review schedule yet.
export function reviewEmpty(nextDueOn: string | null): EmptyCopy {
  if (!nextDueOn) {
    return {
      title: "Nothing to review yet",
      message:
        "Review brings back what you've learned, each time with a new question, so it sticks. Study a lesson and it will start showing up here.",
      action: { label: "Find something to study", to: "home" },
    };
  }
  return {
    title: "All caught up",
    message: "Nothing is due right now. What you've learned comes back here on its own schedule.",
  };
}

// Home, with no course started or favourited.
export const HOME_EMPTY: EmptyCopy = {
  title: "Nothing started yet",
  message: "Home keeps the courses you're studying close at hand. Pick one to begin; you can start from zero.",
  action: { label: "Find a course", to: "explore" },
};

// Explore, when the search or filter matches nothing.
export function exploreEmpty(query: string): EmptyCopy {
  const q = query.trim();
  return {
    title: "No courses match",
    message: q
      ? `Nothing here matches "${q}" yet. Try another word or filter, or ask us to add it.`
      : "Try a different filter, or ask us to add the course you need.",
    action: { label: "Request a course", to: "support" },
  };
}

// Compare look-alikes, once preparing has finished and found none (the
// screen shows its own "preparing" and "couldn't prepare" states).
export const COMPARE_EMPTY: EmptyCopy = {
  title: "Nothing to compare yet",
  message: "Comparison cards line up concepts that are easy to mix up. None were found for this course, so keep going with the lessons.",
  action: { label: "Back to the course", to: "course" },
};

// A course's answer history, with no answers yet.
export const HISTORY_EMPTY: EmptyCopy = {
  title: "No answers yet",
  message: "Every answer you give in this course is kept here, so you can see what changed. Start a lesson to add the first.",
  action: { label: "Back to the course", to: "course" },
};

// A course with no units.
export const COURSE_NO_UNITS: EmptyCopy = {
  title: "No units yet",
  message: "This course doesn't have any lessons yet. If you need it, tell us and we'll look at it.",
  action: { label: "Contact support", to: "support" },
};

// Prefill for the course-request form from an Explore search: trimmed,
// within the form's 200-character course-name cap, or null.
export function courseRequestPrefill(query: string | null | undefined): string | null {
  const q = (query ?? "").replace(/\s+/g, " ").trim();
  if (!q) return null;
  // 200 UTF-16 units (what the server counts), never half an emoji.
  let out = q.slice(0, 200);
  const last = out.charCodeAt(out.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  return out;
}
