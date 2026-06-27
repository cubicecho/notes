ALTER TABLE "orgs" ADD COLUMN "personal_for_user_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_personal_for_user_id_key" UNIQUE("personal_for_user_id");--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_personal_for_user_id_users_id_fkey" FOREIGN KEY ("personal_for_user_id") REFERENCES "users"("id") ON DELETE CASCADE;