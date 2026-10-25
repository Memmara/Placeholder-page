CREATE TABLE IF NOT EXISTS content_questions (
  question_id text PRIMARY KEY,
  subject_id text NOT NULL,
  specification_point_id text NOT NULL,
  question_type text NOT NULL,
  payload jsonb NOT NULL,
  content_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_questions_subject_idx ON content_questions(subject_id,active);
CREATE INDEX IF NOT EXISTS content_questions_spec_idx ON content_questions(subject_id,specification_point_id,active);
CREATE INDEX IF NOT EXISTS content_questions_type_idx ON content_questions(question_type,active);

CREATE TABLE IF NOT EXISTS content_curriculum (
  specification_point_id text PRIMARY KEY,
  subject_id text NOT NULL,
  topic_id text,
  subtopic_id text,
  sequence_no integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  content_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_curriculum_subject_idx ON content_curriculum(subject_id,active,sequence_no);

CREATE TABLE IF NOT EXISTS content_definitions (
  definition_id text PRIMARY KEY,
  subject_id text,
  payload jsonb NOT NULL,
  content_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_definitions_subject_idx ON content_definitions(subject_id,active);

REVOKE ALL ON content_questions,content_curriculum,content_definitions FROM PUBLIC;
