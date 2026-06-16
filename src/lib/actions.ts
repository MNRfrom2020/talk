
import { apiClient } from "./api-client";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Function to get current time in Bangladesh Standard Time (UTC+6)
const getBstDate = () => {
    return dayjs().tz("Asia/Dhaka").toDate();
};

export async function upsertListeningHistory(payload: {
    user_uid: string;
    podcast_id: string;
    duration?: number;
    role?: string | string[]; // Add role for verification
}) {
    try {
        // Check if role allows cloud sync (case-insensitive only, no space normalization)
        const allowedRoles = ['super user'];
        const userRoles = Array.isArray(payload.role) ? payload.role : [payload.role || ''];
        const normalizedUserRoles = userRoles.map(r => r.toLowerCase().trim());
        const hasAllowedRole = normalizedUserRoles.some(role => allowedRoles.includes(role));

        if (!hasAllowedRole) {
            return { message: 'Locally saved only (role not allowed for cloud sync)' };
        }

        const dataToUpsert = {
            user_uid: payload.user_uid,
            podcast_id: payload.podcast_id,
            role: payload.role, // Pass role for verification
            duration: payload.duration ? Math.round(payload.duration) : 0,
            last_played_at: getBstDate().toISOString(),
        };



        const result = await apiClient.post("actions.php?action=upsert_listening_history", dataToUpsert);
        return { message: result.message || "Successfully updated listening history." };
    } catch (error: any) {
        console.error('❌ [Cloud Sync] Failed to update listening history:', error.message);
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

export async function createPodcast(values: PodcastFormValues): Promise<PodcastState> {
    const validatedFields = PodcastFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Podcast.",
        };
    }

    const { id, ...data } = validatedFields.data;

    const podcastData = {
        title: data.title,
        artist: data.artist.split(",").map((s) => s.trim()),
        categories: data.categories.split(",").map((s) => s.trim()),
        cover_art: data.cover_art,
        cover_art_hint: data.cover_art_hint,
        audio_url: data.audio_url,
        created_at: data.created_at ? new Date(data.created_at).toISOString() : getBstDate().toISOString(),
    };

    try {
        const result = await apiClient.post("actions.php?action=save_podcast", podcastData);
        return { message: result.message || "Successfully created podcast." };
    } catch (error: any) {
        return { message: `Database Error: Failed to Create Podcast. ${error.message}` };
    }
}

export async function updatePodcast(id: string, values: Partial<PodcastFormValues>): Promise<PodcastState> {
    const validatedFields = PartialPodcastFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid Fields. Failed to Update Podcast.",
        };
    }

    const data = validatedFields.data;
    const podcastData: any = { id };

    if (data.title) podcastData.title = data.title;
    if (data.artist) podcastData.artist = data.artist.split(",").map((s) => s.trim());
    if (data.categories) podcastData.categories = data.categories.split(",").map((s) => s.trim());
    if (data.cover_art) podcastData.cover_art = data.cover_art;
    if (data.cover_art_hint) podcastData.cover_art_hint = data.cover_art_hint;
    if (data.audio_url) podcastData.audio_url = data.audio_url;
    if (data.created_at) podcastData.created_at = new Date(data.created_at).toISOString();

    try {
        const result = await apiClient.post("actions.php?action=save_podcast", podcastData);
        return { message: result.message || "Successfully updated podcast." };
    } catch (error: any) {
        return { message: `Database Error: Failed to Update Podcast. ${error.message}` };
    }
}

export async function deletePodcast(id: string) {
    try {
        const result = await apiClient.post("actions.php?action=delete_record", { table: "podcasts", id });
        return { message: result.message || "Deleted Podcast." };
    } catch (error: any) {
        return { message: `Database Error: Failed to Delete Podcast. ${error.message}` };
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
    errors?: z.ZodError<any>["formErrors"]["fieldErrors"];
    message?: string | null;
};

export async function savePlaylist(values: PlaylistFormValues): Promise<PlaylistState> {
    const validatedFields = PlaylistFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Save Playlist.",
        };
    }

    const { id, ...data } = validatedFields.data;
    const playlistData: any = { id, ...data };

    try {
        const result = await apiClient.post("actions.php?action=save_playlist", playlistData);
        return { message: result.message || "Successfully saved playlist." };
    } catch (error: any) {
        return { message: `Database Error: Failed to Save Playlist. ${error.message}` };
    }
}

// User Action
const UserFormSchema = z.object({
    uid: z.string().optional(),
    full_name: z.string().min(1, "Full name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    pass: z.string().optional().or(z.literal("")),
    playlists_ids: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof UserFormSchema>;
export type UserState = {
    errors?: z.ZodError<UserFormValues>["formErrors"]["fieldErrors"];
    message?: string | null;
};

export async function saveUser(values: UserFormValues): Promise<UserState> {
    const schema = values.uid
        ? UserFormSchema.extend({
            pass: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
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

    try {
        const result = await apiClient.post("actions.php?action=save_user", validatedFields.data);
        return { message: result.message || `Successfully saved user.` };
    } catch (error: any) {
        return { message: `Database Error: Failed to save user. ${error.message}` };
    }
}

export async function deleteUser(uid: string) {
    try {
        const result = await apiClient.post("actions.php?action=delete_record", { table: "users", id: uid });
        return { message: result.message || "Deleted User." };
    } catch (error: any) {
        return { message: `Database Error: Failed to Delete User. ${error.message}` };
    }
}

export async function updateUserFavoritePlaylists(uid: string, playlistIds: string[]) {
    try {
        const result = await apiClient.post("actions.php?action=save_user", { uid, playlists_ids: playlistIds });
        return { message: result.message || "Favorite playlists updated successfully." };
    } catch (error: any) {
        return { message: `Database Error: Failed to update favorite playlists. ${error.message}` };
    }
}

export async function saveUserPlaylist(values: any): Promise<PlaylistState> {
    try {
        const result = await apiClient.post("actions.php?action=save_user_playlist", values);
        return { message: result.message || "Successfully saved user playlist." };
    } catch (error: any) {
        // Throw error so calling functions can handle it
        throw new Error(`Database Error: Failed to save user playlist. ${error.message}`);
    }
}

export async function deletePlaylist(id: string, isUserPlaylist: boolean) {
    const table = isUserPlaylist ? "user_playlists" : "playlists";
    try {
        const result = await apiClient.post("actions.php?action=delete_record", { table, id });
        return { message: result.message || "Deleted Playlist." };
    } catch (error: any) {
        return { message: `Database Error: Failed to Delete Playlist. ${error.message}` };
    }
}

    
