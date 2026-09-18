-- Support tickets and course-addition requests. One table with a `kind`
-- discriminator rather than two near-identical tables: both are "a user
-- submitted something that a human reads and acts on," share the same
-- status lifecycle, and are listed together in the app. Splitting them
-- would duplicate the status/index/ownership machinery for no gain.
--
-- course_name/course_source_url are only meaningful for kind =
-- 'course_request' and are left null for tickets; the check constraint
-- below enforces that a course request actually names a course, so a
-- half-filled row can't reach the queue.

create table if not exists support_requests (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    kind varchar(20) not null check (kind in ('ticket', 'course_request')),
    subject varchar(200) not null,
    body text not null,
    status varchar(20) not null default 'open'
        check (status in ('open', 'in_review', 'resolved', 'declined')),
    -- Optional context: which course the user was looking at when they filed
    -- a ticket. Set null rather than cascading -- deleting a course
    -- shouldn't erase the ticket history that mentions it.
    track_id uuid references subject_tracks(id) on delete set null,
    -- kind = 'course_request' only.
    course_name varchar(200),
    course_source_url text,
    -- Filled in by whoever works the queue; surfaced back to the user.
    admin_note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint course_request_names_a_course check (
        kind <> 'course_request' or course_name is not null
    )
);

create index if not exists idx_support_requests_user on support_requests(user_id, created_at desc);
create index if not exists idx_support_requests_queue on support_requests(status, created_at);
