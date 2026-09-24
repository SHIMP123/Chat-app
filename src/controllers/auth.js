import { db } from "../db/db.js";
import { sessionsSchema, usersSchema } from "../db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function getUser(req, res){
    try{
        const data = await db.select({
            id: usersSchema.id,
            username: usersSchema.username
        }).from(usersSchema);

        res.json({ data });
    }catch(e){
        console.error(`Error finding user: ${e}`);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

export async function register(req, res) {
    const {username, password} = req.body;

    if(!username || !password){
        return res.status(400).json({
            message: "Username and password must not be empty!"
        })
    }

    const existingUser = await db.select()
                                 .from(usersSchema)
                                 .where(eq(usersSchema.username, username));

    if(existingUser.length > 0){
        return res.status(409).json({
            message: "Username already exists."
        })
    }

    const user = await db.insert(usersSchema)
                         .values({
                            username,
                            passwordHash: password
                         }).returning({
                            id: usersSchema.id,
                            username: usersSchema.username
                         })

    res.status(201).json(user[0])
}

export async function login(req, res){
    const { username, password } = req.body;

    if(!username || !password){
        return res.status(400).json({
            message: "Username and password must not be empty!"
        })
    }

    const findUsers = await db.select()
                         .from(usersSchema)
                         .where(eq(usersSchema.username, username));

    const user = findUsers[0];

    if(findUsers.length === 0 || user.passwordHash !== password){
        return res.status(400).json({
            message: "Username or password is wrong!"
        });
    }    
    
    const token = crypto.randomBytes(32).toString("hex");

    await db.insert(sessionsSchema)
            .values({
                userId: user.id,
                token
            })
    
    res.status(200).json({
        message: "Logged in successfully!",
        token,
        user: {
            id: user.id,
            username: user.username
        }
    })
}