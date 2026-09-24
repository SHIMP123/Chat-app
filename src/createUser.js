import { db } from "./db/db.js"
import { usersSchema } from "./db/schema.js"

async function createUser(){
    try{
        const user = await db.insert(usersSchema).values({
            username: "test-user",
            passwordHash: "test-password"
        }).returning();

        console.log(user);
    }catch(e){
        console.error(`Error adding user: ${e}`)
    }
}

createUser();