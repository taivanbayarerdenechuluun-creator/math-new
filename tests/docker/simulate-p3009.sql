-- Neon дээр гарсан нөхцөлийг дуурайна: 0001 хэрэгжсэн, 0002 дундаа унасан (P3009),
-- мөн Neon Auth-ийн хүснэгт ба үүргүүд байгаа.
CREATE SCHEMA IF NOT EXISTS neon_auth;
CREATE TABLE IF NOT EXISTS neon_auth.users_sync (id text);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN CREATE ROLE anonymous NOLOGIN; END IF;
END $$;
-- 0002 хагас хэрэгжсэн байдал: зарим RLS, нэг constraint аль хэдийн байгаа
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ADD CONSTRAINT "user_role_chk" CHECK ("role" IN ('STUDENT','TEACHER','ADMIN'));
INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, logs, applied_steps_count)
VALUES ('sim-0002', 'x', '0002_security', now(), NULL, 'simulated failure: permission denied', 0);
