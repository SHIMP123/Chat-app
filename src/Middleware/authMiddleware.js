import { db } from "../db/db.js";
import { sessionsSchema, usersSchema } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function authenticationToken(req, res, next){
    try{
        const authHeaders = req.headers.authoriztion;

        if(!authHeaders){
            return res.status(401).json({
                message: "Authoriztion header missing."
            });
        }

        const token = authHeaders.split(" ")[1];

        if(!token){
            return res.status(401).json({
                message: "Authoriztion header missing."
            });
        }

        const session = await db.select({
            sessionId: sessionsSchema.id,
            userId: sessionsSchema.userId,
            username: usersSchema.username
        })
        .from(sessionsSchema)
        .innerJoin(
            usersSchema,
            eq(sessionsSchema.userId, usersSchema.id)
        )
        .where(eq(sessionsSchema.token, token));

        if (sessionsSchema.length === 0){
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        req.user = session[0];

        next()

    }catch(e){
        console.error(e);

        res.status(500).json({
            message: "Internal server error."
        });
    }
}