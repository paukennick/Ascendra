-- REQ-040: widen credential_exams_identified now that
-- 'vendor_exam_unpublished_code' (016) is committed and safe to reference.
-- A row is identified by exam_code (AWS/Azure), standard_name
-- (accreditation/licensure -- nursing), or, now, a vendor exam whose vendor
-- never publishes a code at all (Google Cloud).

alter table credential_exams
    drop constraint if exists credential_exams_identified;
alter table credential_exams
    add constraint credential_exams_identified
    check (
        exam_code is not null
        or standard_name is not null
        or basis = 'vendor_exam_unpublished_code'
    );
