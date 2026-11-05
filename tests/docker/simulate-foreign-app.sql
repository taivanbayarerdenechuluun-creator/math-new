-- Neon дээрх бодит нөхцөл: public schema-д ӨӨР апп-ын хүснэгтүүд ба түүний migration-ы түүх байна.
CREATE TABLE public."User" (id serial PRIMARY KEY, email text, created_at timestamptz DEFAULT now());
INSERT INTO public."User" (email) VALUES ('old-app-user@example.com');
CREATE TABLE public."Post" (id serial PRIMARY KEY, title text);
CREATE TABLE public._prisma_migrations (
  id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz,
  migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0
);
INSERT INTO public._prisma_migrations VALUES
  ('o1', 'other-app', now() - interval '3 days', '0001_init', NULL, NULL, now() - interval '3 days', 1),
  ('o2', 'x', now(), '0002_security', NULL, NULL, now() - interval '20 minutes', 1),
  ('o3', 'x', NULL, '0003_file_data', 'relation "UploadedFile" does not exist', NULL, now() - interval '10 minutes', 0);
