
import { api } from "./api";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const getBstDate = () => {
  return dayjs().tz("Asia/Dhaka").toDate();
};

// Podcast Actions
const PodcastFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  artist_uuids: z.array(z.string()).min(1, "Select at least one artist"),
  category_uuids: z.array(z.string()).min(1, "Select at least one category"),
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

  const podcastData: { [key: string]: any; } = {
    title: data.title,
    artist_uuids: data.artist_uuids,
    category_uuids: data.category_uuids,
    cover_art: data.cover_art,
    cover_art_hint: data.cover_art_hint,
    audio_url: data.audio_url,
    created_at: data.created_at ? new Date(data.created_at).toISOString() : getBstDate().toISOString(),
  };

  try {
    await api.post("/podcasts.php", podcastData);
  } catch (error: any) {
    return {
      message: `Database Error: Failed to Create Podcast. ${error.message}`,
    };
  }

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

    const podcastData: { [key: string]: any; } = { id };

    if (data.title) podcastData.title = data.title;
    if (data.artist_uuids) podcastData.artist_uuids = data.artist_uuids;
    if (data.category_uuids) podcastData.category_uuids = data.category_uuids;
    if (data.cover_art) podcastData.cover_art = data.cover_art;
    if (data.cover_art_hint) podcastData.cover_art_hint = data.cover_art_hint;
    if (data.audio_url) podcastData.audio_url = data.audio_url;
    if (data.created_at) podcastData.created_at = new Date(data.created_at).toISOString();

    try {
        await api.put("/podcasts.php", podcastData);
    } catch (error: any) {
        return {
            message: `Database Error: Failed to Update Podcast. ${error.message}`,
        };
    }

    return { message: "Successfully updated podcast." };
}

export async function deletePodcast(id: string) {
  try {
    await api.delete("/podcasts.php", { id });
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
  description: z.string().optional().or(z.literal("")),
  podcast_ids: z.array(z.string()).optional(),
  cover_art: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});

type PlaylistFormValues = z.infer<typeof PlaylistFormSchema>;

export type PlaylistState = {
  errors?: z.ZodError<any>["formErrors"]["fieldErrors"];
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

  const playlistData: { [key: string]: any; } = {
      name: data.name,
      description: data.description || "",
      podcast_ids: data.podcast_ids,
      cover_art: data.cover_art,
  };
  
  if (data.created_at) {
    playlistData.created_at = new Date(data.created_at).toISOString();
  } else if (!id) {
    playlistData.created_at = getBstDate().toISOString();
  }

  try {
    if (id) {
       playlistData.id = id;
       await api.put("/playlists.php", playlistData);
    } else {
       await api.post("/playlists.php", playlistData);
    }
  } catch (error: any) {
     return {
      message: `Database Error: Failed to ${id ? "Update" : "Create"} Playlist. ${error.message}`,
    };
  }

  return { message: "Successfully saved playlist." };
}

export async function deletePlaylist(id: string) {
    try {
        await api.delete("/playlists.php", { id });
        return { message: "Deleted Playlist." };
    } catch (error: any) {
        return {
             message: `Database Error: Failed to Delete Playlist. ${error.message}`,
        }
    }
}

const ArtistFormSchema = z.object({
  uuid: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});

type ArtistFormValues = z.infer<typeof ArtistFormSchema>;
export type ArtistState = {
  errors?: z.ZodError<ArtistFormValues>["formErrors"]["fieldErrors"];
  message?: string | null;
};

export async function saveArtist(values: ArtistFormValues): Promise<ArtistState> {
  const validatedFields = ArtistFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Save Artist.",
    };
  }

  const { uuid, ...data } = validatedFields.data;

  try {
    if (uuid) {
      await api.put("/artists.php", { uuid, ...data });
    } else {
      await api.post("/artists.php", {
        ...data,
        created_at: data.created_at ? new Date(data.created_at).toISOString() : getBstDate().toISOString(),
      });
    }
  } catch (error: any) {
    return {
      message: `Database Error: Failed to save artist. ${error.message}`,
    };
  }

  return { message: `Successfully saved artist.` };
}

export async function deleteArtist(uuid: string) {
  try {
    await api.delete("/artists.php", { uuid });
    return { message: "Deleted Artist." };
  } catch (error: any) {
    return {
      message: `Database Error: Failed to Delete Artist. ${error.message}`,
    };
  }
}

const CategoryFormSchema = z.object({
  uuid: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;
export type CategoryState = {
  errors?: z.ZodError<CategoryFormValues>["formErrors"]["fieldErrors"];
  message?: string | null;
};

export async function saveCategory(values: CategoryFormValues): Promise<CategoryState> {
  const validatedFields = CategoryFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Save Category.",
    };
  }

  const { uuid, ...data } = validatedFields.data;

  try {
    if (uuid) {
      await api.put("/categories.php", { uuid, ...data });
    } else {
      await api.post("/categories.php", {
        ...data,
        created_at: data.created_at ? new Date(data.created_at).toISOString() : getBstDate().toISOString(),
      });
    }
  } catch (error: any) {
    return {
      message: `Database Error: Failed to save category. ${error.message}`,
    };
  }

  return { message: "Successfully saved category." };
}

export async function deleteCategory(uuid: string) {
  try {
    await api.delete("/categories.php", { uuid });
    return { message: "Deleted Category." };
  } catch (error: any) {
    return {
      message: `Database Error: Failed to Delete Category. ${error.message}`,
    };
  }
}
