// REQ-217 (FAIL-1058): runs async jobs one after another, in the order they
// were asked for, whether or not an earlier one failed. Rescheduling the study
// reminders is "cancel everything, then schedule the plan"; two of those
// running at once (a toggle tapped twice, a sign-in sync and a settings
// change) interleaved, so one's cancel removed the other's new reminders or
// both added theirs and the learner got each reminder twice.
export function createSerialQueue(): <T>(job: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(job: () => Promise<T>): Promise<T> => {
    const run = tail.then(() => job());
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}
