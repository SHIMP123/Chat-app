import {
    pgTable,
    serial,
    integer,
    text,
    timestamp
} from "drizzle-orm/pg-core";

export const messageSchema = pgTable("message", {
    id: serial("id").primaryKey(),

    username: text("username").notNull(),

    content: text("content").notNull(),

    replyTo: integer("reply_to").references(() => messageSchema.id),

    createdAt: timestamp("created_at").defaultNow().notNull()
});