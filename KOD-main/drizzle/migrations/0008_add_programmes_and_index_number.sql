CREATE TABLE IF NOT EXISTS "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "index_number" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "programme_id" uuid;

DO $$ BEGIN
 ALTER TABLE "programmes" ADD CONSTRAINT "programmes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_index_number_unique" UNIQUE("index_number");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "programmes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programmes are readable by anyone" ON "programmes" AS PERMISSIVE FOR SELECT TO public USING (true);
