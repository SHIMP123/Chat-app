ALTER TABLE "message" ALTER COLUMN "reply_to" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;