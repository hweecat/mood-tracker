-- Deploy mood-tracker:seed-password to sqlite

BEGIN;

UPDATE users SET password = '$2b$10$EXuFdGHCFMRB8k.Arb/d2.YE0P7SrJknc0XJOfB1kf7ePDcLD.Sra' WHERE id = '1';

COMMIT;