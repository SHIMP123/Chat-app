import {
    pgTable,
    serial,
    integer,
    text,
    timestamp
} from "drizzle-orm/pg-core";

export const usersSchema = pgTable("users", {
    id: serial("id").primaryKey(),

    username: text("username").notNull().unique(),

    passwordHash: text("password_hash").notNull()
})

export const sessionsSchema = pgTable("sessions", {
    id: serial("id").primaryKey(),

    userId: integer("user_id").notNull().references(() => usersSchema.id),

    token: text("token").notNull().unique(),

    createdAt: timestamp("created_at")
               .defaultNow()
               .notNull()
})

export const messageSchema = pgTable("message", {
    id: serial("id").primaryKey(),

    userId: integer("user_id").references(() => usersSchema.id),

    username: text("username").notNull(),

    content: text("content").notNull(),

    replyTo: integer("reply_to").references(() => messageSchema.id),

    createdAt: timestamp("created_at").defaultNow().notNull()
});