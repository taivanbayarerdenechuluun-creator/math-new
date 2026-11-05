-- Өгөгдлийн сангийн түвшний хамгаалалт (PostgreSQL / Supabase / Neon)
-- Энэ migration-ыг давтан ажиллуулж болно (idempotent) бөгөөд ЗӨВХӨН IQ MATH-ийн хүснэгтүүдэд нөлөөлнө.
-- Алхам бүр тусдаа хамгаалагдсан: нэг алхам амжилтгүй болбол NOTICE хэвлээд үргэлжилнэ.
-- 1) RLS: апп хүснэгтийн эзэмшигч эрхээр холбогддог тул RLS-д хамаарахгүй; харин anon/authenticated
--    (Supabase, Neon Data API) үүргээр шууд хандахыг хаана — policy үүсгээгүй тул ямар ч мөр харагдахгүй.
-- 2) Enum утгуудыг CHECK хязгаарлалтаар баталгаажуулна.

DO $$
DECLARE
  t text;
  r text;
BEGIN
  FOREACH t IN ARRAY ARRAY['User','TeacherTopicAssignment','Grade','CurriculumUnit','Topic','TopicPrerequisite','Subtopic','Lesson','Formula','QuestionSource','Question','QuestionOption','Solution','QuestionReview','QuestionImportJob','Examination','ExaminationQuestion','ExaminationAttempt','StudentAnswer','PracticeAnswer','LearningProgress','SavedQuestion','SolvedProblem','DailyActivity','Achievement','UserAchievement','AiConversation','AiMessage','UploadedFile','Notification','AuditLog'] LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'RLS %: %', t, SQLERRM;
    END;
    FOREACH r IN ARRAY ARRAY['anon','authenticated','anonymous'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        BEGIN
          EXECUTE format('REVOKE ALL ON public.%I FROM %I', t, r);
        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'REVOKE % %: %', t, r, SQLERRM;
        END;
      END IF;
    END LOOP;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public."User"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_role_chk') THEN
    ALTER TABLE "User" ADD CONSTRAINT "user_role_chk" CHECK ("role" IN ('STUDENT','TEACHER','ADMIN'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'user_role_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."User"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_grade_chk') THEN
    ALTER TABLE "User" ADD CONSTRAINT "user_grade_chk" CHECK ("grade" IS NULL OR "grade" BETWEEN 6 AND 12);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'user_grade_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."User"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_xp_chk') THEN
    ALTER TABLE "User" ADD CONSTRAINT "user_xp_chk" CHECK ("xp" >= 0 AND "streak" >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'user_xp_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Grade"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_id_chk') THEN
    ALTER TABLE "Grade" ADD CONSTRAINT "grade_id_chk" CHECK ("id" BETWEEN 6 AND 12);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'grade_id_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Question"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_type_chk') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "question_type_chk" CHECK ("type" IN ('MULTIPLE_CHOICE','NUMERIC','EXPRESSION','OPEN'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'question_type_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Question"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_status_chk') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "question_status_chk" CHECK ("status" IN ('DRAFT','PROCESSING','NEEDS_REVIEW','VERIFIED','PUBLISHED','REJECTED'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'question_status_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Question"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_difficulty_chk') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "question_difficulty_chk" CHECK ("difficulty" BETWEEN 1 AND 5);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'question_difficulty_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Question"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_published_reviewed_chk') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "question_published_reviewed_chk" CHECK ("status" <> 'PUBLISHED' OR "reviewerId" IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'question_published_reviewed_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Question"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_ocr_conf_chk') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "question_ocr_conf_chk" CHECK ("ocrConfidence" IS NULL OR ("ocrConfidence" >= 0 AND "ocrConfidence" <= 1));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'question_ocr_conf_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."QuestionOption"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'option_label_chk') THEN
    ALTER TABLE "QuestionOption" ADD CONSTRAINT "option_label_chk" CHECK ("label" IN ('A','B','C','D','E'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'option_label_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Examination"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_duration_chk') THEN
    ALTER TABLE "Examination" ADD CONSTRAINT "exam_duration_chk" CHECK ("durationMinutes" > 0 AND "passingScore" BETWEEN 0 AND 100);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'exam_duration_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."ExaminationQuestion"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_question_points_chk') THEN
    ALTER TABLE "ExaminationQuestion" ADD CONSTRAINT "exam_question_points_chk" CHECK ("points" > 0);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'exam_question_points_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."ExaminationAttempt"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attempt_status_chk') THEN
    ALTER TABLE "ExaminationAttempt" ADD CONSTRAINT "attempt_status_chk" CHECK ("status" IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'attempt_status_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."AiConversation"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_mode_chk') THEN
    ALTER TABLE "AiConversation" ADD CONSTRAINT "ai_mode_chk" CHECK ("mode" IN ('BEGINNER','STANDARD','ADVANCED'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'ai_mode_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."AiMessage"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_message_role_chk') THEN
    ALTER TABLE "AiMessage" ADD CONSTRAINT "ai_message_role_chk" CHECK ("role" IN ('user','assistant'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'ai_message_role_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."UploadedFile"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_size_chk') THEN
    ALTER TABLE "UploadedFile" ADD CONSTRAINT "file_size_chk" CHECK ("size" > 0);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'file_size_chk: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public."SolvedProblem"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solved_verification_chk') THEN
    ALTER TABLE "SolvedProblem" ADD CONSTRAINT "solved_verification_chk" CHECK ("verification" IN ('VERIFIED','MISMATCH','UNVERIFIED'));
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'solved_verification_chk: %', SQLERRM;
END $$;
