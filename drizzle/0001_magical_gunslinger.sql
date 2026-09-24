CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "reply_to" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_reply_to_message_id_fk" FOREIGN KEY ("reply_to") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;