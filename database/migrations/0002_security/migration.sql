-- Өгөгдлийн сангийн түвшний хамгаалалт (PostgreSQL / Supabase)
-- 1) Бүх хүснэгтэд RLS идэвхжүүлнэ. Апп нь хүснэгтийн эзэмшигч (owner) эрхээр холбогддог тул RLS-д хамаарахгүй.
--    Харин Supabase-ийн anon/authenticated үүргээр (PostgREST, клиент SDK) шууд хандах боломжийг бүрэн хаана:
--    бодлого (policy) үүсгээгүй тул эдгээр үүрэг ямар ч мөрийг харах/өөрчлөх эрхгүй.
-- 2) Enum утгуудыг CHECK хязгаарлалтаар баталгаажуулна (апп-ын шалгалтаас гадна).

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherTopicAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumUnit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Topic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TopicPrerequisite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Formula" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Solution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionImportJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Examination" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SolvedProblem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UploadedFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
  END IF;
END $$;

ALTER TABLE "User" ADD CONSTRAINT "user_role_chk" CHECK ("role" IN ('STUDENT','TEACHER','ADMIN'));
ALTER TABLE "User" ADD CONSTRAINT "user_grade_chk" CHECK ("grade" IS NULL OR "grade" BETWEEN 6 AND 12);
ALTER TABLE "User" ADD CONSTRAINT "user_xp_chk" CHECK ("xp" >= 0 AND "streak" >= 0);
ALTER TABLE "Grade" ADD CONSTRAINT "grade_id_chk" CHECK ("id" BETWEEN 6 AND 12);
ALTER TABLE "Question" ADD CONSTRAINT "question_type_chk" CHECK ("type" IN ('MULTIPLE_CHOICE','NUMERIC','EXPRESSION','OPEN'));
ALTER TABLE "Question" ADD CONSTRAINT "question_status_chk" CHECK ("status" IN ('DRAFT','PROCESSING','NEEDS_REVIEW','VERIFIED','PUBLISHED','REJECTED'));
ALTER TABLE "Question" ADD CONSTRAINT "question_difficulty_chk" CHECK ("difficulty" BETWEEN 1 AND 5);
ALTER TABLE "Question" ADD CONSTRAINT "question_published_reviewed_chk" CHECK ("status" <> 'PUBLISHED' OR "reviewerId" IS NOT NULL);
ALTER TABLE "Question" ADD CONSTRAINT "question_ocr_conf_chk" CHECK ("ocrConfidence" IS NULL OR ("ocrConfidence" >= 0 AND "ocrConfidence" <= 1));
ALTER TABLE "QuestionOption" ADD CONSTRAINT "option_label_chk" CHECK ("label" IN ('A','B','C','D','E'));
ALTER TABLE "Examination" ADD CONSTRAINT "exam_duration_chk" CHECK ("durationMinutes" > 0 AND "passingScore" BETWEEN 0 AND 100);
ALTER TABLE "ExaminationQuestion" ADD CONSTRAINT "exam_question_points_chk" CHECK ("points" > 0);
ALTER TABLE "ExaminationAttempt" ADD CONSTRAINT "attempt_status_chk" CHECK ("status" IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED'));
ALTER TABLE "AiConversation" ADD CONSTRAINT "ai_mode_chk" CHECK ("mode" IN ('BEGINNER','STANDARD','ADVANCED'));
ALTER TABLE "AiMessage" ADD CONSTRAINT "ai_message_role_chk" CHECK ("role" IN ('user','assistant'));
ALTER TABLE "UploadedFile" ADD CONSTRAINT "file_size_chk" CHECK ("size" > 0);
ALTER TABLE "SolvedProblem" ADD CONSTRAINT "solved_verification_chk" CHECK ("verification" IN ('VERIFIED','MISMATCH','UNVERIFIED'));
