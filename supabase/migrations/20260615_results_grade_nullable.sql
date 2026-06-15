-- The "results" table has always been completely empty: every score save
-- has failed because the legacy "grade" column is NOT NULL (no default),
-- but the app only ever sets "grade_letter" (which uses a different scale:
-- A+, A, B+, B, C+, C, D, E vs. grade's check constraint of A/B/C/D/F).
-- "grade" is unused by the app — make it nullable so inserts succeed.
ALTER TABLE public.results ALTER COLUMN grade DROP NOT NULL;
