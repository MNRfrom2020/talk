
"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";
import { z } from "zod";

// Podcast Actions
const PodcastFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  artist: z.string().min(1, "Artist is required"),
  categories: z.string().min(1, "Categories are required"),
  cover_art: z.string().url("Must be a valid URL"),
  cover_art_hint: z.string().optional().or(z.literal("")),
  audio_url: z.string().url("Must be a valid URL"),
  created_at: z.string().optional(),
});

type PodcastFormValues = z.infer<typeof PodcastFormSchema>;

export type PodcastState = {
  errors?: z.ZodError<PodcastFormValues>["formErrors"]["fieldErrors"];
  message?: string | null;
};

export async function savePodcast(
  values: PodcastFormValues,
): Promise<PodcastState> {
  const validatedFields = PodcastFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Save Podcast.",
    };
  }

  const { id, ...data } = validatedFields.data;

  const podcastData: { [key: string]: any } = {
    title: data.title,
    artist: data.artist.split(",").map((s) => s.trim()),
    categories: data.categories.split(",").map((s) => s.trim()),
    cover_art: data.cover_art,
    cover_art_hint: data.cover_art_hint,
    audio_url: data.audio_url,
  };

  if (data.created_at) {
    podcastData.created_at = new Date(data.created_at).toISOString();
  }

  try {
    if (id) {
      // Update existing podcast
      const { error } = await supabase
        .from("podcasts")
        .update(podcastData)
        .eq("id", id);
      if (error) throw error;
    } else {
      // Create new podcast
      const { error } = await supabase.from("podcasts").insert(podcastData);
      if (error) throw error;
    }
  } catch (error: any) {
    return {
      message: `Database Error: Failed to ${id ? "Update" : "Create"} Podcast. ${error.message}`,
    };
  }

  revalidatePath("/admin/dashboard/audios");
  revalidatePath("/");
  return { message: "Successfully saved podcast." };
}

export async function deletePodcast(id: string) {
  try {
    const { error } = await supabase.from("podcasts").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/dashboard/audios");
    revalidatePath("/");
    return { message: "Deleted Podcast." };
  } catch (error: any) {
    return {
      message: `Database Error: Failed to Delete Podcast. ${error.message}`,
    };
  }
}

// Playlist Actions
const PlaylistFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  podcast_ids: z.array(z.string()).min(0, "Select at least one podcast").optional(),
  cover: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
  user_uid: z.string().uuid().optional(),
});


type PlaylistFormValues = Omit<z.infer<typeof PlaylistFormSchema>, "podcast_ids"> & {
    podcast_ids: string;
};


export type PlaylistState = {
  errors?: z.ZodError<z.infer<typeof PlaylistFormSchema>>["formErrors"]["fieldErrors"];
  message?: string | null;
};

export async function savePlaylist(
  values: PlaylistFormValues,
): Promise<PlaylistState> {

   const transformedValues = {
    ...values,
    podcast_ids: values.podcast_ids ? values.podcast_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
  };

  const validatedFields = PlaylistFormSchema.safeParse(transformedValues);


  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Save Playlist.",
    };
  }
  
  const { id, ...data } = validatedFields.data;

  const playlistData: { [key: string]: any } = {
      name: data.name,
      podcast_ids: data.podcast_ids,
      cover: data.cover,
      user_uid: data.user_uid
  };
  
  if(data.created_at) {
    playlistData.created_at = new Date(data.created_at).toISOString()
  }


  try {
    if (id) {
       const { error } = await supabase
        .from("user_playlists")
        .update(playlistData)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("user_playlists").insert(playlistData);
       if (error) throw error;
    }
  } catch (error: any) {
     return {
      message: `Database Error: Failed to ${id ? "Update" : "Create"} Playlist. ${error.message}`,
    };
  }

  revalidatePath("/admin/dashboard/playlists");
  revalidatePath("/library");
  return { message: "Successfully saved playlist." };
}

export async function deletePlaylist(id: string) {
    try {
        const { error } = await supabase.from("user_playlists").delete().eq("id", id);
        if (error) throw error;
        revalidatePath("/admin/dashboard/playlists");
        revalidatePath("/library");
        return { message: "Deleted Playlist." };
    } catch (error: any) {
        return {
             message: `Database Error: Failed to Delete Playlist. ${error.message}`,
        }
    }
}


// User Actions
const UserFormSchema = z.object({
  uid: z.string().uuid().optional(),
  full_name: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  pass: z.string().optional().or(z.literal("")),
});

type UserFormValues = z.infer<typeof UserFormSchema>;

export type UserState = {
  errors?: z.ZodError<UserFormValues>["formErrors"]["fieldErrors"];
  message?: string | null;
};

export async function saveUser(values: UserFormValues): Promise<UserState> {
  // If pass is provided, it must be at least 6 characters. If not provided, it's optional.
  const schema = values.uid
    ? UserFormSchema.extend({
        pass: z
          .string()
          .min(6, "Password must be at least 6 characters")
          .optional()
          .or(z.literal("")),
      })
    : UserFormSchema.extend({
        pass: z.string().min(6, "Password is required and must be at least 6 characters"),
      });

  const validatedFields = schema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Save User.",
    };
  }

  const { uid, ...data } = validatedFields.data;

  const userData: { [key: string]: any } = {
    full_name: data.full_name,
    username: data.username,
    email: data.email,
    image: data.image,
  };

  if (data.pass) {
    userData.pass = data.pass; // In a real app, you'd hash this password
  }

  try {
    if (uid) {
      // Update existing user
      userData.updated_at = new Date().toISOString();
      const { error } = await supabase.from("users").update(userData).eq("uid", uid);
      if (error) throw error;
    } else {
      // Create new user
      const { data: newUser, error } = await supabase
        .from("users")
        .insert(userData)
        .select()
        .single();

      if (error) throw error;

      if (newUser) {
        // Create a default "Favorites" playlist for the new user
        const { error: playlistError } = await supabase
          .from("user_playlists")
          .insert({
            user_uid: newUser.uid,
            name: "Favorites",
            podcast_ids: [],
          });

        if (playlistError) {
          // Log the error, but don't block the user creation response
          console.error(
            `Failed to create favorites playlist for user ${newUser.uid}:`,
            playlistError,
          );
        }
      }
    }
  } catch (error: any) {
    return {
      message: `Database Error: Failed to ${uid ? "Update" : "Create"} User. ${error.message}`,
    };
  }

  revalidatePath("/admin/dashboard/users");
  revalidatePath("/profile");
  return { message: `Successfully ${uid ? "updated" : "created"} user.` };
}

export async function deleteUser(uid: string) {
  try {
    const { error } = await supabase.from("users").delete().eq("uid", uid);
    if (error) throw error;
    revalidatePath("/admin/dashboard/users");
    return { message: "Deleted User." };
  } catch (error: any) {
    return {
      message: `Database Error: Failed to Delete User. ${error.message}`,
    };
  }
}

    