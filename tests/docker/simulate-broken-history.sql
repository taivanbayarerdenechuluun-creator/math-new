-- Neon дээр гарсан нөхцөл: migration-ы түүхэнд 0001, 0002 "хэрэгжсэн", 0003 "амжилтгүй",
-- гэвч манай хүснэгтүүд public-д огт байхгүй. Neon Auth-ийн хүснэгт байгаа.
CREATE SCHEMA IF NOT EXISTS neon_auth;
CREATE TABLE IF NOT EXISTS neon_auth.users_sync (id text);
CREATE TABLE public._prisma_migrations (
  id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz,
  migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0
);
INSERT INTO public._prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES
  ('a1', 'x', '0001_init', now() - interval '3 minutes', now() - interval '3 minutes', 1),
  ('a2', 'x', '0002_security', now() - interval '2 minutes', now() - interval '2 minutes', 1);
INSERT INTO public._prisma_migrations (id, checksum, migration_name, started_at, finished_at, logs, applied_steps_count) VALUES
  ('a3', 'x', '0003_file_data', now() - interval '1 minute', NULL, 'relation "UploadedFile" does not exist', 0);
