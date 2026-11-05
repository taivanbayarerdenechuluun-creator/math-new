-- Файлын агуулгыг өгөгдлийн санд хадгалах (STORAGE_DRIVER=db, Vercel)
ALTER TABLE "UploadedFile" ADD COLUMN IF NOT EXISTS "data" BYTEA;
