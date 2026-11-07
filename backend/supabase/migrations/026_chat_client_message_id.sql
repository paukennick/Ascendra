-- REQ-091: idempotent coach chat messages.
--
-- POST /api/chat calls Anthropic (several seconds) and only then saves the
-- learner's message and the reply. A request that timed out on the phone but
-- finished on the server left the learner retrying -- and the retry paid for
-- a second reply and stored the question twice.
--
-- The app now sends one client_message_id per message and reuses it on a
-- retry. It is stored on the learner's own row; the assistant reply is the
-- assistant row saved with it. A repeat id returns that stored reply without
-- calling Anthropic. The partial unique index also settles two requests with
-- the same id racing each other: the slower insert fails and returns the
-- winner's reply.
--
-- Additive only, guarded with IF NOT EXISTS like every migration here.

alter table chat_messages add column if not exists client_message_id varchar(64);

create unique index if not exists chat_messages_user_client_message_unique
    on chat_messages (user_id, client_message_id)
    where client_message_id is not null;
