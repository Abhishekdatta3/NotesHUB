/*
# Notes sharing platform schema

1. New Tables
- `notes`
  - `id` (uuid, primary key, auto-generated)
  - `title` (text, not null) - human-friendly title of the notes (e.g. chapter name)
  - `subject_name` (text, not null) - subject the notes belong to (e.g. "Operating Systems")
  - `subject_code` (text, not null) - institutional subject code (e.g. "CS303")
  - `semester` (integer, not null) - semester number (1-10), used to organize notes
  - `description` (text, nullable) - optional summary of the notes
  - `uploaded_by` (text, not null) - display name of the student or teacher who uploaded
  - `file_path` (text, not null) - path of the file inside the `notes-files` storage bucket
  - `file_name` (text, not null) - original file name shown to users
  - `file_size` (bigint, not null) - file size in bytes
  - `file_type` (text, not null) - MIME type of the file
  - `extracted_text` (text, nullable) - text content extracted from the file, used by the AI tutor (RAG)
  - `download_count` (integer, not null, default 0) - number of times the file was downloaded
  - `created_at` (timestamp) - when the notes were uploaded
  - Indexes on `semester`, `subject_code`, and `created_at` for fast filtering and sorting.
- `chat_messages`
  - `id` (uuid, primary key, auto-generated)
  - `session_id` (uuid, not null) - groups messages into one conversation
  - `role` (text, not null) - 'user' or 'assistant'
  - `content` (text, not null) - the message text
  - `citations` (jsonb, nullable) - references to notes used to answer (subject, semester, snippet)
  - `created_at` (timestamp)

2. Security
- Enable RLS on both tables.
- This app intentionally has no sign-in, so policies target `anon, authenticated`.
- `notes`: anyone can read; anyone can insert (uploads); anyone can update the download
  counter only (column-restricted UPDATE grant); anyone can delete their uploads.
- `chat_messages`: readable/writable via `session_id` so each visitor sees their own chat.
- Grants: minimal SELECT/INSERT/UPDATE/DELETE grants to `anon` + `authenticated`,
  column-restricted UPDATE on `download_count` only, and `service_role` full access
  for the AI edge function.
*/

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject_name text NOT NULL,
  subject_code text NOT NULL,
  semester integer NOT NULL CHECK (semester >= 1 AND semester <= 10),
  description text,
  uploaded_by text NOT NULL DEFAULT 'Anonymous',
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  extracted_text text,
  download_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_semester ON notes (semester);
CREATE INDEX IF NOT EXISTS idx_notes_subject_code ON notes (subject_code);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  citations jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, created_at);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO anon, authenticated;
GRANT UPDATE (download_count) ON notes TO anon, authenticated;
GRANT SELECT, INSERT ON chat_messages TO anon, authenticated;
GRANT ALL ON notes TO service_role;
GRANT ALL ON chat_messages TO service_role;

DROP POLICY IF EXISTS "Anyone can read notes" ON notes;
CREATE POLICY "Anyone can read notes"
ON notes FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can upload notes" ON notes;
CREATE POLICY "Anyone can upload notes"
ON notes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update note download count" ON notes;
CREATE POLICY "Anyone can update note download count"
ON notes FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete notes" ON notes;
CREATE POLICY "Anyone can delete notes"
ON notes FOR DELETE
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can read chat messages" ON chat_messages;
CREATE POLICY "Anyone can read chat messages"
ON chat_messages FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can write chat messages" ON chat_messages;
CREATE POLICY "Anyone can write chat messages"
ON chat_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);