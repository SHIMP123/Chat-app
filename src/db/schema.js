import {
    pgtable,
    serial,
    text,
    timestamp
} from "drizzle-orm/pg-core";

export const messageSchema = pgtable("message", {
    id: serial("id").primaryKey(),

    username: text("username").notNull(),

    content: text("content").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull()
});