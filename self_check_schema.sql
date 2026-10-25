-- Apply after schema.sql. Stores authored marking criteria separately from
-- append-only learner answers, revisions, self-checks and challenges.
BEGIN;

ALTER TABLE mark_schemes
    ADD CONSTRAINT uq_mark_scheme_id_total_marks UNIQUE (id, total_marks);

CREATE TABLE mark_scheme_criteria (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mark_scheme_id      uuid NOT NULL REFERENCES mark_schemes(id) ON DELETE RESTRICT,
    criterion_code      text NOT NULL,
    sequence_number     smallint NOT NULL CHECK (sequence_number > 0),
    marks               numeric(6,2) NOT NULL CHECK (marks > 0),
    criterion_text      text NOT NULL,
    acceptable_evidence jsonb NOT NULL DEFAULT '[]'::jsonb
                        CHECK (jsonb_typeof(acceptable_evidence) = 'array'),
    feedback_if_met     text,
    feedback_if_missed  text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (mark_scheme_id, criterion_code),
    UNIQUE (mark_scheme_id, sequence_number),
    UNIQUE (id, mark_scheme_id),
    UNIQUE (id, mark_scheme_id, marks)
);
CREATE INDEX ix_mark_scheme_criteria_order
    ON mark_scheme_criteria(mark_scheme_id, sequence_number);

CREATE TABLE attempt_response_revisions (
    attempt_id          bigint NOT NULL,
    attempt_submitted_at timestamptz NOT NULL,
    revision_number     smallint NOT NULL CHECK (revision_number > 0),
    response_content    jsonb NOT NULL
                        CHECK (jsonb_typeof(response_content) IN ('object','array','string')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    mark_scheme_seen_at timestamptz,
    model_answer_seen_at timestamptz,
    PRIMARY KEY (attempt_id, attempt_submitted_at, revision_number),
    FOREIGN KEY (attempt_id, attempt_submitted_at)
        REFERENCES student_question_attempts(attempt_id, submitted_at) ON DELETE RESTRICT
);
CREATE INDEX ix_attempt_revisions_time
    ON attempt_response_revisions(attempt_id, attempt_submitted_at, revision_number DESC);

CREATE TABLE attempt_self_checks (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          bigint NOT NULL,
    attempt_submitted_at timestamptz NOT NULL,
    review_number       smallint NOT NULL CHECK (review_number > 0),
    revision_number     smallint NOT NULL CHECK (revision_number > 0),
    mark_scheme_id      uuid NOT NULL REFERENCES mark_schemes(id) ON DELETE RESTRICT,
    awarded_marks       numeric(7,3) NOT NULL CHECK (awarded_marks >= 0),
    max_marks           numeric(7,3) NOT NULL CHECK (max_marks >= 0),
    checked_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, attempt_submitted_at, review_number),
    UNIQUE (id, mark_scheme_id),
    CHECK (awarded_marks <= max_marks),
    FOREIGN KEY (mark_scheme_id, max_marks)
        REFERENCES mark_schemes(id, total_marks) ON DELETE RESTRICT,
    FOREIGN KEY (attempt_id, attempt_submitted_at, revision_number)
        REFERENCES attempt_response_revisions(attempt_id, attempt_submitted_at, revision_number) ON DELETE RESTRICT
);
CREATE INDEX ix_attempt_self_checks_time
    ON attempt_self_checks(attempt_id, attempt_submitted_at, checked_at DESC);

CREATE TABLE attempt_self_check_criteria (
    self_check_id       uuid NOT NULL,
    mark_scheme_id      uuid NOT NULL,
    criterion_id        uuid NOT NULL,
    learner_says_met    boolean NOT NULL,
    criterion_max_marks numeric(6,2) NOT NULL CHECK (criterion_max_marks > 0),
    awarded_marks       numeric(6,2) NOT NULL CHECK (awarded_marks >= 0),
    PRIMARY KEY (self_check_id, criterion_id),
    FOREIGN KEY (self_check_id, mark_scheme_id)
        REFERENCES attempt_self_checks(id, mark_scheme_id) ON DELETE RESTRICT,
    FOREIGN KEY (criterion_id, mark_scheme_id)
        REFERENCES mark_scheme_criteria(id, mark_scheme_id) ON DELETE RESTRICT,
    FOREIGN KEY (criterion_id, mark_scheme_id, criterion_max_marks)
        REFERENCES mark_scheme_criteria(id, mark_scheme_id, marks) ON DELETE RESTRICT,
    CHECK (awarded_marks <= criterion_max_marks)
);
CREATE INDEX ix_self_check_criteria_criterion
    ON attempt_self_check_criteria(criterion_id, learner_says_met);

CREATE TABLE mark_scheme_challenges (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    self_check_id       uuid NOT NULL,
    mark_scheme_id      uuid NOT NULL,
    criterion_id        uuid NOT NULL,
    student_id          uuid NOT NULL REFERENCES students(user_id) ON DELETE RESTRICT,
    reason              text NOT NULL CHECK (length(trim(reason)) > 0),
    status              text NOT NULL DEFAULT 'saved_locally'
                        CHECK (status = 'saved_locally'),
    created_at          timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (self_check_id, mark_scheme_id)
        REFERENCES attempt_self_checks(id, mark_scheme_id) ON DELETE RESTRICT,
    FOREIGN KEY (criterion_id, mark_scheme_id)
        REFERENCES mark_scheme_criteria(id, mark_scheme_id) ON DELETE RESTRICT
);
CREATE INDEX ix_mark_scheme_challenges_student
    ON mark_scheme_challenges(student_id, created_at DESC);

COMMIT;
