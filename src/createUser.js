import { client, db } from "./db/db.js"
import { usersSchema } from "./db/schema.js"
import { hashPassword } from "./password.js";

async function createUser(){
    try{
        const { SEED_USERNAME, SEED_PASSWORD } = process.env;
        if (!SEED_USERNAME || !SEED_PASSWORD) {
            throw new Error("SEED_USERNAME and SEED_PASSWORD are required");
        }

        const user = await db.insert(usersSchema).values({
            username: SEED_USERNAME,
            passwordHash: await hashPassword(SEED_PASSWORD)
        }).returning({ id: usersSchema.id, username: usersSchema.username });

        console.log(user);
    }catch(e){
        console.error(`Error adding user: ${e}`);
        process.exitCode = 1;
    }finally{
        await client.end();
    }
}

createUser();
