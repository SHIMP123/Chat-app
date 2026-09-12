CREATE TABLE "message" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
