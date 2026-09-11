import { db } from "./db/db.js";

async function testDb() {
    try{
        await db.execute("SELECT 1");
        console.log("Data base connected successfully!")
    }catch(e){
        console.error("Cant connect to database: ", e)
    }
}

testDb()