
"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const image = formData.get("image") as string;
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;

  // 1. Generate a random 8-digit password
  const newPassword = Math.random().toString(36).slice(-8);

  // 2. Insert the new user
  const { data, error } = await supabase
    .from("users")
    .insert([{ name, image, username, email, pass: newPassword }])
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create user: " + error.message,
    };
  }

  revalidatePath("/admin/dashboard/users");

  // 3. Return user data with the generated password
  return {
    success: true,
    message: "User created successfully",
    data: { ...data, pass: newPassword },
  };
}

export async function updateUser(formData: FormData) {
  const uid = formData.get("uid") as string;
  const name = formData.get("name") as string;
  const image = formData.get("image") as string;
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const pass = formData.get("pass") as string;

  const { data, error } = await supabase
    .from("users")
    .update({ name, image, username, email, pass })
    .eq("uid", uid)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update user: " + error.message,
    };
  }

  revalidatePath("/admin/dashboard/users");

  return {
    success: true,
    data,
  };
}

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
  podcast_ids: z
    .string()
    .min(1, "At least one Podcast ID is required"),
  cover: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});

type PlaylistFormValues = z.infer<typeof PlaylistFormSchema>;

export type PlaylistState = {
  errors?: z.ZodError<PlaylistFormValues>["formErrors"]["fieldErrors"];
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

  const playlistData = {
      name: data.name,
      podcast_ids: data.podcast_ids.split(",").map(s => s.trim()),
      cover: data.cover,
      created_at: data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString(),
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
  return { message: "Successfully saved playlist." };
}

export async function deletePlaylist(id: string) {
    try {
        const { error } = await supabase.from("playlists").delete().eq("id", id);
        if (error) throw error;
        revalidatePath("/admin/dashboard/playlists");
        return { message: "Deleted Playlist." };
    } catch (error: any) {
        return {
             message: `Database Error: Failed to Delete Playlist. ${error.message}`,
        }
    }
}
