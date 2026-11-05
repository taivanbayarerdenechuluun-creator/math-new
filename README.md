# IQ MATH

6–12-р ангийн сурагчдад зориулсан математикийн сургалт, бодлого бодох, шалгалтын бэлтгэлийн платформ.
Интерфейс нь монгол хэл дээр. Стек: Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Prisma, KaTeX, MathLive, mathjs, Claude API.

## Хурдан эхлэх

```bash
npm install
cp .env.example .env        # AUTH_SECRET-д 32+ тэмдэгттэй санамсаргүй утга оруулна
npm run setup               # схем үүсгэж, анхны өгөгдөл (seed) оруулна
npm run dev                 # http://localhost:3000
```

| Эрх | Имэйл | Нууц үг |
|---|---|---|
| Сурагч (9-р анги, демо түүхтэй) | student@iqmath.mn | Student123! |
| Багш | teacher@iqmath.mn | Teacher123! |
| Хоёр дахь багш | teacher2@iqmath.mn | Teacher123! |
| Админ | admin@iqmath.mn | Admin123! |

> Production-д гаргахаасаа өмнө эдгээр бүртгэлийн нууц үгийг сольж эсвэл бүртгэлүүдийг устгана уу.

## Гадаад үйлчилгээ (credential шаардлагатай)

| Функц | Хувьсагч | Тохируулаагүй үед |
|---|---|---|
| AI багш, текст бодлого, AI бүтэцжүүлэлт, OCR fallback | `ANTHROPIC_API_KEY`, `AI_MODEL` (анхдагч `claude-opus-5-5`) | UI дээр "тохируулагдаагүй" гэж тодорхой харагдана. Тооцооллын хөдөлгүүр бүрэн ажиллана |
| Математик OCR | `MATHPIX_APP_ID`, `MATHPIX_APP_KEY` | Claude vision ашиглана. Аль нь ч байхгүй бол зураг/PDF таних идэвхгүй, гараар бичих боломжтой |

Бүх түлхүүр зөвхөн сервер талд ашиглагдана, клиент рүү хэзээ ч илгээгдэхгүй. Claude-ийн дуудлагууд аюулгүй байдлын шүүлтүүрээс татгалзсан үед сервер талын fallback (`fallbacks: "default"`) ашиглана.

**Анхаар:** AI/OCR интеграцийг бодит түлхүүрээр туршаагүй. Код SDK-ийн баримт бичигт нийцэж, TypeScript шалгалтыг давсан. Харин бодит дуудлагыг түлхүүр тохируулсны дараа шалгах шаардлагатай.

## Архитектур

```
app/            (auth) нэвтрэх/бүртгүүлэх · student/ · admin/ (багш + админ) · api/
components/     ui · navigation · mathematics · questions · examination · analytics · dashboard
features/       бизнес логик: math-solver, question-bank, question-import, examinations, progress, gamification, curriculum
services/       mathematics (symbolic хөдөлгүүр) · ai (Claude) · ocr (Mathpix/vision) · storage
lib/            auth, session, api (алдаа, rate limit, audit), db, constants
database/       schema.prisma · seed/
tests/          unit (vitest) · e2e/smoke.mjs
```

### Математикийн хөдөлгүүр (`services/mathematics`)
- LaTeX → mathjs хөрвүүлэлт
- Алхамтай бодолт:
  - шугаман, квадрат (яг радикал хэлбэр, Виетийн өөр арга), олон гишүүнт (рационал язгуур + Горнер), рационал тэгшитгэл (гадны язгуур хасна)
  - трансцендент тэгшитгэлийн тоон шийд
  - тэнцэтгэл биш (интервалын арга)
  - 2–4 хувьсагчтай шугаман систем (Крамер/Гаусс, rank шалгалт)
  - уламжлал (тоон дифференциалчлалаар шалгана)
  - тоон илэрхийлэл, хялбарчлах/үржигдэхүүнд задлах
- Хариу бүрийг орлуулах замаар бие даан шалгаж `VERIFIED / MISMATCH / UNVERIFIED` гэж тэмдэглэнэ.
- AI-ийн хариуг боломжтой үед энэ хөдөлгүүрээр дахин шалгана. Шалгах боломжгүй бол "шалгагдаагүй" гэж харуулна.
- Шалгалтын үнэлгээ:
  - тоон хүлцэл ба монгол аравтын таслал (`2,5`)
  - олон язгуур дарааллаас үл хамааран
  - илэрхийллийн тэнцүү байдал

### Аюулгүй байдал
- Нэвтрэлт: bcrypt + HS256 JWT (httpOnly cookie).
- Middleware нь зөвхөн UX-ийн чиглүүлэлт хийнэ. Жинхэнэ эрхийг API route болон server component бүрт DB-ээс дахин шалгана.
- Багшид анги хуваарилах (`canManageGrade`). Багш өөрийн үүсгэсэн бодлогыг өөрөө баталгаажуулахгүй.
- Зөвхөн `PUBLISHED` бодлого дасгал ба шалгалтад орно. Нийтлэгдсэн бодлогын агуулгыг өөрчлөхөд дахин хянуулах төлөвт шилжинэ.
- Зөв хариу клиент рүү илгээгдэхгүй. Шалгалтын цагийг сервер шалгана (хугацаа дууссан бол автоматаар илгээнэ).
- Файлын төрлийг magic byte-аар шалгана. Хэмжээний хязгаартай. Файлыг нийтийн бус хавтсанд хадгалж, эрх шалгах `/api/files/[id]`-ээр үзүүлнэ.
- Rate limit, аудит лог, монгол хэлээрх алдааны мессеж.
- Насанд хүрээгүй хэрэглэгчдийг харгалзаж: хамгийн бага мэдээлэл цуглуулна, бүртгэлээ өөрөө устгах боломжтой, багшид имэйл харагдахгүй.

## Тест

```bash
npm test              # 158 unit тест (vitest): математикийн хөдөлгүүр, хариуны тэнцүү байдал, бүх 95 жишээ бодлогын хариуг бие даан шалгана, бүх сэдэвт хичээл байгааг шалгана
npm run build
npm run test:e2e      # тусдаа database/e2e.db дээр production сервер асааж HTTP-ээр 68 шалгалт
npm run test:browser  # 18 Playwright тест (системийн Chrome): desktop ба гар утас (Pixel 7), хэвтээ гүйлгээ, hydration/консолын алдаа; дэлгэцийн зураг tests/browser/screenshots/
npm run test:postgres # docker compose up -d db хийсний дараа: PostgreSQL дээр migration + seed + 68 e2e шалгалт, дараа нь SQLite руу буцаана
```

Хөтчийн тест өөрийн `database/e2e-browser.db`-г үүсгэнэ — хөгжүүлэлтийн `dev.db`-д хүрэхгүй.
Тестийн серверт `RATE_LIMIT_MULTIPLIER=100` тохируулдаг (олон удаа нэвтрэхэд rate limit-д баригдахгүйн тулд) — production-д тохируулахгүй.

## Агуулга нэмэх

```bash
npm run db:content    # шинэ хичээл, томьёо, жишээ бодлогыг одоо байгаа санд давхардуулахгүйгээр нэмнэ
```

## Production deploy (PostgreSQL / Supabase / Docker)

Migration-ууд `database/migrations/` дотор (PostgreSQL):
- `0001_init` — бүх хүснэгт, индекс, гадаад түлхүүр
- `0002_security` — бүх хүснэгтэд RLS (Supabase-ийн `anon`/`authenticated` үүргийн шууд хандалтыг хаана), enum утгын CHECK хязгаарлалт, "нийтлэгдсэн бодлого заавал хянагчтай" дүрэм

### Docker Compose (PostgreSQL + апп)
```bash
export AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
docker compose up -d --build                         # migration автоматаар хэрэгжинэ
docker compose exec app npx tsx database/seed/seed.ts  # анхны өгөгдөл (заавал биш)
```

### Supabase эсвэл бусад PostgreSQL
1. `node scripts/use-db.mjs postgresql && npx prisma generate`
2. `DATABASE_URL`-д холболтын мөр (Supabase: "Session pooler" эсвэл шууд холболт)
3. `npx prisma migrate deploy`, хүсвэл `npm run db:seed`
4. `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `MATHPIX_*` тохируулаад `npm run build && npm start`

Хөгжүүлэлт рүү буцах: `node scripts/use-db.mjs sqlite && npx prisma generate`.

Файл хадгалалт: `STORAGE_DRIVER=local` (анхдагч, `STORAGE_DIR`, Docker-т volume) эсвэл `STORAGE_DRIVER=db` (файлыг PostgreSQL-д хадгална, Vercel дээр автоматаар). Rate limiter санах ойд ажилладаг — олон instance-д Redis/Upstash ашиглана.

## Vercel дээр deploy

Vercel дээр SQLite ажиллахгүй (диск түр зуурын). `vercel.json` нь build-ийг `scripts/vercel-build.mjs`-ээр ажиллуулдаг. Энэ скрипт:
- PostgreSQL руу шилжинэ
- migration-уудыг хэрэгжүүлнэ
- сан хоосон бол анхны агуулгыг оруулна

Зургийг өгөгдлийн санд хадгална (Vercel дээр автоматаар).

1. **Vercel → Project → Storage → Create Database → Neon** (эсвэл Supabase) сонгоод төсөлдөө холбоно. `DATABASE_URL` автоматаар нэмэгдэнэ.
2. **Settings → Environment Variables** (Production + Preview):
   - `AUTH_SECRET`: 32+ тэмдэгттэй санамсаргүй утга. Жишээ нь `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10+ тэмдэгт, үсэг ба тоо), `ADMIN_NAME`: анхны deploy-д таны админ бүртгэл үүснэ. Демо бүртгэл үүсэхгүй.
   - Заавал биш: `ANTHROPIC_API_KEY`, `MATHPIX_APP_ID`, `MATHPIX_APP_KEY`
3. **Deployments → Redeploy** хийнэ.
4. `https://<таны-домэйн>/api/health` хаягаар тохиргоог шалгана. Бүх шалгалт `ok: true` байх ёстой.

Тестийн сайт дээр демо бүртгэл хэрэгтэй бол `SEED_DEMO_USERS=true` болон `NEXT_PUBLIC_DEMO_LOGINS=true` нэмнэ. Нийтийн сайтад үүнийг ашиглахгүй: нууц үгнүүд нь энэ README-д бичигдсэн байгаа.

Deployment Protection асаалттай бол сайтыг зөвхөн Vercel бүртгэлээр нэвтэрсэн хүн харна (Settings → Deployment Protection).

Локалд дуурайж шалгах:
```bash
docker compose -f docker-compose.yml -f tests/docker/vercel-sim.yml up -d --build vtest
node tests/e2e/vercel-sim-check.mjs http://localhost:3500 owner@school.mn StrongPass2026
```

## Хөтөлбөрийн тухай

Анги бүрийн бүтэц нь IQ MATH-ийн бэлтгэсэн **ноорог** бөгөөд бүх бүлэг `isOfficial = false` төлөвтэй үүснэ. UI дээр "баталгаажаагүй" гэж харагдана.
Албан ёсны цөм хөтөлбөртэй тулгасны дараа админ "Хөтөлбөр" хэсгээс баталгаажуулна.
Seed дотор 38 хичээл (38 сэдэв бүрт нэг), 95 нийтлэгдсэн жишээ бодлого байна (албан ёсны шалгалтын даалгавар биш).

## Түлхүүр шаардлагатай / хийгээгүй зүйлс

- **AI ба OCR-ийн бодит туршилт** — ANTHROPIC_API_KEY (эсвэл MATHPIX_*) тохируулсны дараа: AI багш, текст бодлого, зураг танилт, импортын AI бүтэцжүүлэлт. Код бэлэн, түлхүүргүй үед UI тодорхой мэдэгдэнэ.
- **Бодит камер** — хөтчийн тестэд камерын fallback-ийг шалгасан; жинхэнэ утасны камераар туршаагүй.
- **Албан ёсны хөтөлбөртэй тулгах** — багш/админ хийх ажил (UI-д "баталгаажаагүй" тэмдэглэгээтэй).
- **Cloud deploy** — Docker image болон PostgreSQL migration бэлэн; hosting-ийн бүртгэл шаардлагатай.
- **Англи хэл** — интерфейсийн текстүүд одоогоор компонент дотор монголоор бичигдсэн; i18n давхарга нэмэх нь дараагийн шат.
