import type { TxClient } from "./db";

// REQ-205 (FAIL-900): account deletion promised "nothing about you stays".
// item_flags.user_id is `on delete set null`, so a deleted learner's report
// of a wrong question stayed with the note they typed (up to 500
// characters), and the content review queue had copied the first 200
// characters of up to three notes into content_review_queue.evidence
// ->recentNotes (lib/content-review-queue.ts), where nothing linked them to
// anyone but anything could still read them.
//
// Run inside the deletion transaction, before the user row goes:
//   1. the learner's note text is collected (item_flags.note, and the first
//      200 characters of their "Report a problem with this lesson" bodies,
//      which the queue reads the same way);
//   2. each copy of it is removed from every queue row's recentNotes;
//   3. item_flags.note is cleared. The report itself (question, reason,
//      date) stays, unlinked, so a fix is not lost; the privacy policy and
//      the delete-account page say so.
// Matching is by exact text, so a different learner's identical note is
// removed too -- a harmless loss of one example sentence.
export async function scrubReportNotes(tx: TxClient, userId: string): Promise<{ notes: number; queueRows: number }> {
  const rows = await tx.query<{ t: string }>(
    `select left(note, 200) as t from item_flags where user_id = $1 and note is not null and note <> ''
     union
     select left(body, 200) from support_requests where user_id = $1 and kind = 'content_report' and body <> ''`,
    [userId]
  );
  const texts = rows.map((r) => r.t);
  let queueRows = 0;
  if (texts.length) {
    const updated = await tx.query<{ id: string }>(
      `update content_review_queue q
          set evidence = jsonb_set(q.evidence, '{recentNotes}',
                coalesce((select jsonb_agg(e.n order by e.i)
                            from jsonb_array_elements(q.evidence->'recentNotes') with ordinality as e(n, i)
                           where jsonb_typeof(e.n) <> 'string' or (e.n #>> '{}') <> all ($1::text[])), '[]'::jsonb))
        where jsonb_typeof(q.evidence->'recentNotes') = 'array'
          and exists (select 1 from jsonb_array_elements_text(q.evidence->'recentNotes') t where t = any ($1::text[]))
        returning q.id`,
      [texts]
    );
    queueRows = updated.length;
  }
  const cleared = await tx.query<{ id: string }>(
    `update item_flags set note = null where user_id = $1 and note is not null returning id`,
    [userId]
  );
  return { notes: cleared.length, queueRows };
}
