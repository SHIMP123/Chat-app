import { db } from "../db/db.js";
import { profileSchema } from "../db/schema.js";
import { deleteSession } from "../session.js";
import { eq } from "drizzle-orm";
import { supabase } from "../supabase/supabase.js";

export async function getProfile(req, res){
    const userId = req.user.userId;
    try{
        const profile = await db.select()
                               .from(profileSchema)
                               .where(eq(profileSchema.userId, userId));
        
        if(profile.length === 0){
            return res.status(404).json({
                message: "Profile not found."
            })
        }
        
        return res.json(profile[0])
    }catch(e){
        console.error(`Error getting profile: ${e}`);

        res.status(500).json({
            message: "Internal server error."
        })
    }
}

export async function saveProfile(req, res){
    console.log("REQ BODY:", req.body)
    console.log("REQ FILE:", req.file)
    const userId = req.user.userId;
    const file = req.file;

    let avatarUrl;

    const [currentProfile] = await db.select()
                                     .from(profileSchema)
                                     .where(eq(profileSchema.userId, userId));

    avatarUrl = currentProfile?.avatarUrl ?? null;

    if(file){
        console.log(`Uploading file: ${file.originalname}`);

        const filePath = `${userId}-${Date.now()}-${file.originalname}`;

        const { data, error } = await supabase.storage
                                              .from("avatars")
                                              .upload(filePath, file.buffer, {
                                                contentType: file.mimetype,
                                              });

        if(error){
            console.error("Error uploading to supabase:", error);

            return res.status(500).json({
                message: "Failed to upload avatar"
            });
        }      
        
        console.log("Uploaded successfully: ", data);

        const { data: publicUrldata } = await supabase.storage
                                                      .from("avatars")
                                                      .getPublicUrl(filePath);

        avatarUrl = publicUrldata.publicUrl;
        
        console.log(`Uploaded avatar: ${avatarUrl}`);
    }

    const {
        displayName,
        bio,
        status,
    } = req.body;

    try{

        const updatedProfile = await db.update(profileSchema)
                                       .set({
                                        displayName,
                                        bio,
                                        status,
                                        avatarUrl,
                                        updatedAt: new Date()
                                       })
                                       .where(eq(profileSchema.userId, userId))
                                       .returning();

        if(updatedProfile.length === 0){
            return res.status(404).json({
                message: "Cannot find and update profile."
            });
        }
        
        res.json( updatedProfile[0] );
    }catch(e){
        console.error("Error saving profile changes: ", e);
        return res.status(500).json({
            message: "Internal server error."
        });
    }
}