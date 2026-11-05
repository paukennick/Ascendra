-- REQ-089: one explanation per multiple-choice option, so a wrong pick is
-- told why it is wrong instead of just "Not quite." Null for lessons cached
-- before this, which only explained the right answer; grading falls back to
-- that explanation for them.

alter table lesson_content
  add column if not exists fade_choice_feedback jsonb,
  add column if not exists solo_choice_feedback jsonb;
