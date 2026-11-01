import {
    pgTable,
    serial,
    integer,
    text,
    timestamp,
    unique,
    uniqueIndex
} from "drizzle-orm/pg-core";

export const usersSchema = pgTable("users", {
    id: serial("id").primaryKey(),

    username: text("username").notNull().unique(),

    email: text("email").notNull().unique(),

    passwordHash: text("password_hash").notNull()
});
export const profileSchema = pgTable("profiles", {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
            .notNull()
            .unique()
            .references(() => usersSchema.id),

    displayName: text("display_name"),

    bio: text("bio"),

    avatarUrl: text("avatar_url"),

    status: text("status"),

    createdAt: timestamp("created_at")
                        .notNull()
                        .defaultNow(),
                   
    updatedAt: timestamp("updated_at")
                        .notNull()
                        .defaultNow()                    
});
export const sessionsSchema = pgTable("sessions", {
    id: serial("id").primaryKey(),

    userId: integer("user_id").notNull().references(() => usersSchema.id),

    token: text("token").notNull().unique(),

    createdAt: timestamp("created_at")
               .defaultNow()
               .notNull()
});
export const messageSchema = pgTable("message", {
    id: serial("id").primaryKey(),

    userId: integer("user_id").references(() => usersSchema.id),

    username: text("username").notNull(),

    content: text("content").notNull(),

    replyTo: integer("reply_to").references(() => messageSchema.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [{
        uniqueMessageReader: unique("message_reads_message_reader_unique")
            .on(table.messageId, table.readerId)
    }]
);
export const messageReadsSchema = pgTable("message_reads", {
    id: serial("id").primaryKey(),

    messageId: integer("message_id").notNull().references(() => messageSchema.id),

    readerId: integer("reader_id").notNull().references(() => usersSchema.id),

    readAt: timestamp("read_at").notNull().defaultNow()
    },
    (table) => [
        uniqueIndex("message_reads_message_reader_unique")
            .on(table.messageId, table.readerId)
    ]
);
export const userReadPositionsSchema = pgTable("user_read_positions", {
    id: serial("id").primaryKey(),

    userId: integer("user_id").notNull().references(() => usersSchema.id).unique(),

    lastReadMessageId: integer("last_message_read_id").references(() => messageSchema.id),

    updatedAt: timestamp("updated_at").notNull().defaultNow()
                    
})