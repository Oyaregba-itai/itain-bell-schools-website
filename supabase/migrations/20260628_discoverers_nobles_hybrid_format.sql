-- Discoverers and Nobles classes use a hybrid format:
-- scores (portfolio + test + exam) + per-subject text comments on the same report card
UPDATE classes SET report_format = 'hybrid'
WHERE LOWER(TRIM(name)) IN ('discoverers', 'nobles');
