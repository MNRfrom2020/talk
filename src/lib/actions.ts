
"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";
import { z } from "zod";

// Function to get current time in Bangladesh Standard Time (UTC+6)
const getBstDate = () => {
  const now = new Date();
  const bstOffset = 6 * 60; // 6 hours in minutes
  const clientOffset = now.getTimezoneOffset(); // Client's offset from UTC in minutes
  const bstTime = new Date(now.getTime() + (bstOffset - clientOffset) * 60000);
  return bstTime;
}

export async function upsertListeningHistory(payload: {
  user_uid: string;
  podcast_id: string;
  duration?: number;
}) {
  try {
    const dataToUpsert: { [key: string]: any } = {
      user_uid: payload.user_uid,
      podcast_id: payload.podcast_id,
      last_played_at: getBstDate().toISOString(),
    };

    if (payload.duration !== undefined && !isNaN(payload.duration)) {
      dataToUpsert.duration = Math.round(payload.duration);
    }

    const { error } = await supabase.from("listening_history").upsert(
      dataToUpsert,
      { onConflict: "user_uid,podcast_id" },
    );
    if (error) throw error;
    return { message: "Successfully updated listening history." };
  } catch (error: any) {
    return {
      message: `Database Error: Failed to update listening history. ${error.message}`,
    };
  }
}


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

const PartialPodcastFormSchema = PodcastFormSchema.partial();

type PodcastFormValues = z.infer<typeof PodcastFormSchema>;

export type PodcastState = {
  errors?: z.ZodError<PodcastFormValues>["formErrors"]["fieldErrors"];
  message?: string | null;
};

export async function createPodcast(
  values: PodcastFormValues,
): Promise<PodcastState> {
  const validatedFields = PodcastFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Podcast.",
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
    created_at: data.created_at ? new Date(data.created_at).toISOString() : getBstDate().toISOString(),
  };

  try {
    const { error } = await supabase.from("podcasts").insert(podcastData);
    if (error) throw error;
  } catch (error: any) {
    return {
      message: `Database Error: Failed to Create Podcast. ${error.message}`,
    };
  }

  revalidatePath("/admin/dashboard/audios");
  revalidatePath("/");
  return { message: "Successfully created podcast." };
}

export async function updatePodcast(
  id: string,
  values: Partial<PodcastFormValues>,
): Promise<PodcastState> {
    const validatedFields = PartialPodcastFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid Fields. Failed to Update Podcast.",
        };
    }
    
    const data = validatedFields.data;

    const podcastData: { [key: string]: any } = {};

    // Only add fields that are present in the partial `data` object
    if (data.title) podcastData.title = data.title;
    if (data.artist) podcastData.artist = data.artist.split(",").map((s) => s.trim());
    if (data.categories) podcastData.categories = data.categories.split(",").map((s) => s.trim());
    if (data.cover_art) podcastData.cover_art = data.cover_art;
    if (data.cover_art_hint) podcastData.cover_art_hint = data.cover_art_hint;
    if (data.audio_url) podcastData.audio_url = data.audio_url;
    if (data.created_at) podcastData.created_at = new Date(data.created_at).toISOString();

    try {
        const { error } = await supabase
            .from("podcasts")
            .update(podcastData)
            .eq("id", id);
        if (error) throw error;
    } catch (error: any) {
        return {
            message: `Database Error: Failed to Update Podcast. ${error.message}`,
        };
    }

    revalidatePath("/admin/dashboard/audios");
    revalidatePath("/");
    return { message: "Successfully updated podcast." };
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

// System Playlist Actions
const PlaylistFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  podcast_ids: z.array(z.string()).optional(),
  cover: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});


type PlaylistFormValues = z.infer<typeof PlaylistFormSchema>;

export type PlaylistState = {
  errors?: z.ZodError<z.infer<typeof UserPlaylistFormSchema>>["formErrors"]["fieldErrors"];
  message?: string | null;
};

export async function savePlaylist(
  values: PlaylistFormValues,
): Promise<PlaylistState> {
  const validatedFields = PlaylistFormSchema.safeParse(values);

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
  };
  
  if (data.created_at) {
    playlistData.created_at = new Date(data.created_at).toISOString();
  } else if (!id) {
    playlistData.created_at = getBstDate().toISOString();
  }

  try {
    if (id) {
       const { error } = await supabase
        .from("playlists")
        .update(playlistData)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("playlists").insert(playlistData);
       if (error) throw error;
    }
  } catch (error: any) {
     return {
      message: `Database Error: Failed to ${id ? "Update" : "Create"} Playlist. ${error.message}`,
    };
  }

  revalidatePath("/admin/dashboard/playlists");
  revalidatePath("/library");
  revalidatePath("/playlists/[playlistId]", "page");
  return { message: "Successfully saved playlist." };
}

// User Playlist Actions
const UserPlaylistFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  podcast_ids: z.array(z.string()).optional(),
  cover: z.string().url("Must be a valid URL").nullable().optional(),
  user_uid: z.string().uuid(),
});

const PartialUserPlaylistFormSchema = UserPlaylistFormSchema.partial().extend({
  id: z.string().uuid(),
  user_uid: z.string().uuid(),
});


type UserPlaylistFormValues = z.infer<typeof UserPlaylistFormSchema>;

export async function saveUserPlaylist(
  values: Partial<UserPlaylistFormValues>,
): Promise<PlaylistState> {

   const isUpdate = !!values.id;
   const schema = isUpdate ? PartialUserPlaylistFormSchema : UserPlaylistFormSchema;

   const validatedFields = schema.safeParse(values);
  
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Save User Playlist.",
    };
  }

  const { id, ...data } = validatedFields.data;
  
  const playlistData: { [key: string]: any } = { user_uid: data.user_uid };
  if (data.name) playlistData.name = data.name;
  if (data.podcast_ids) playlistData.podcast_ids = data.podcast_ids;
  if (data.cover !== undefined) playlistData.cover = data.cover;


  try {
    if (id) {
      const { error } = await supabase
        .from("user_playlists")
        .update(playlistData)
        .eq("id", id)
        .eq("user_uid", data.user_uid);
      if (error) throw error;
    } else {
      playlistData.created_at = getBstDate().toISOString();
      const { error } = await supabase.from("user_playlists").insert(playlistData);
      if (error) throw error;
    }
  } catch (error: any) {
    return {
      message: `Database Error: Failed to ${id ? "Update" : "Create"} User Playlist. ${error.message}`,
    };
  }

  revalidatePath("/library");
  revalidatePath("/playlists/[playlistId]", "page");
  return { message: "Successfully saved user playlist." };
}


export async function deletePlaylist(id: string, isUserPlaylist: boolean) {
    const table = isUserPlaylist ? 'user_playlists' : 'playlists';
    try {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
        
        revalidatePath("/admin/dashboard/playlists");
        revalidatePath("/library");
        revalidatePath("/playlists/[playlistId]", "page");
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
      // Update existing user, but do not change updated_at unless password is changed
      if (data.pass) {
        userData.updated_at = new Date().toISOString();
      }
      const { error } = await supabase.from("users").update(userData).eq("uid", uid);
      if (error) throw error;
    } else {
      // Create new user
       userData.created_at = getBstDate().toISOString();
       userData.updated_at = getBstDate().toISOString();
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
            created_at: getBstDate().toISOString(),
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

export async function updateUserFavoritePlaylists(
  uid: string,
  playlistIds: string[],
) {
  try {
    const { error } = await supabase
      .from("users")
      .update({ playlists_ids: playlistIds })
      .eq("uid", uid);

    if (error) throw error;

    revalidatePath("/library");
    revalidatePath("/profile");
    return { message: "Favorite playlists updated successfully." };
  } catch (error: any) {
    return {
      message: `Database Error: Failed to update favorite playlists. ${error.message}`,
    };
  }
}

    