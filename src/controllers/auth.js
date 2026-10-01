import { db } from "../db/db.js";
import { sessionsSchema, usersSchema } from "../db/schema.js";
import { deleteSession } from "../session.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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
    const {username, email, password} = req.body;

    if(!username || !password || !email){
        return res.status(400).json({
            message: "Credentials must not be empty!"
        })
    }


    const existingUser = await db.select()
                                 .from(usersSchema)
                                 .where(
                                    eq(usersSchema.username, username),
                                    eq(usersSchema.email, email)
                                );

    if(existingUser.length > 0){
        return res.status(409).json({
            message: "Username or email already exists."
        });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let user;
    try {
        user = await db.insert(usersSchema)
                       .values({
                          username,
                          email,
                          passwordHash: hashedPassword
                       }).returning({
                          id: usersSchema.id,
                          username: usersSchema.username,
                          email: usersSchema.email
                       });
    } catch (error) {
        if (error.code === "23505" && error.constraint === "users_username_unique") {
            return res.status(409).json({
                message: "Username already exists."
            });
        }

        throw error;
    }

    res.status(201).json(user[0]);
    console.log(user[0]);
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if(findUsers.length === 0 || !isPasswordValid){
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

export async function logout(req, res){

    try{
        const authHeader = req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({
                message: "Authorization headers missing."
            });
        }

        const token = authHeader.split(" ")[1];

        if(!token){
            return res.status(401).json({
                message: "Token missing."
            });
        }

        await deleteSession(token);

        res.status(201).json({
            message: "Logged out successfully!"
        });
    }catch(e){
        console.error(`Error logging out: ${e}`);

        res.status(500).json({
            message: "Internal server error."
        })
    }
}