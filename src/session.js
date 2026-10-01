import { eq } from "drizzle-orm";
import { db } from "./db/db.js";
import { sessionsSchema, usersSchema } from "./db/schema.js";

export async function getSessionUser(token) {
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;

    const users = await db.select({ id: usersSchema.id, username: usersSchema.username })
        .from(sessionsSchema)
        .innerJoin(usersSchema, eq(sessionsSchema.userId, usersSchema.id))
        .where(eq(sessionsSchema.token, token))
        .limit(1);
    return users[0] ?? null;
}
