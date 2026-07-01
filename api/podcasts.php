<?php
// api/podcasts.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $category = $_GET['category'] ?? null;
        $artist = $_GET['artist'] ?? null;
        $playlist_id = $_GET['playlist_id'] ?? null;
        $limit = $_GET['limit'] ?? 2000;
        $offset = $_GET['offset'] ?? 0;

        $whereConditions = ["p.created_at <= NOW()"];
        $params = [];

        if ($category) {
            $whereConditions[] = "EXISTS (
                SELECT 1 FROM podcast_categories pc
                INNER JOIN categories c ON pc.category_uuid = c.uuid
                WHERE pc.podcast_id = p.id AND c.name = ?
            )";
            $params[] = $category;
        }

        if ($artist) {
            $whereConditions[] = "EXISTS (
                SELECT 1 FROM podcast_artists pa
                INNER JOIN artists a ON pa.artist_uuid = a.uuid
                WHERE pa.podcast_id = p.id AND a.name = ?
            )";
            $params[] = $artist;
        }

        if (!empty($playlist_id)) {
            // Comma-separated IDs (from local playlists)
            if (strpos($playlist_id, ',') !== false || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $playlist_id)) {
                $whereConditions[] = "p.id = ANY( string_to_array(?, ',')::uuid[] )";
                $params[] = $playlist_id;
            } else {
                // Single playlist ID — use junction tables
                $whereConditions[] = "(
                    p.id IN (SELECT podcast_id FROM admin_playlist_items WHERE playlist_id = ?::uuid)
                    OR p.id IN (SELECT podcast_id FROM playlist_items WHERE playlist_id = ?::uuid)
                )";
                $params[] = $playlist_id;
                $params[] = $playlist_id;
            }
        }

        $whereClause = implode(" AND ", $whereConditions);

        $sql = "
            WITH PaginatedPodcasts AS (
                SELECT p.id
                FROM podcasts p
                WHERE {$whereClause}
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            )
            SELECT 
                p.id, 
                p.title, 
                p.cover_art, 
                p.cover_art_hint, 
                p.audio_url, 
                p.created_at,
                COALESCE(json_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '[]'::json) AS artist,
                COALESCE(json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '[]'::json) AS categories
            FROM PaginatedPodcasts pp
            INNER JOIN podcasts p ON p.id = pp.id
            LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
            LEFT JOIN artists a ON pa.artist_uuid = a.uuid
            LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
            LEFT JOIN categories c ON pc.category_uuid = c.uuid
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ";

        $params[] = (int)$limit;
        $params[] = (int)$offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $podcasts = $stmt->fetchAll();

        foreach ($podcasts as &$p) {
            $p['artist'] = json_decode($p['artist'], true);
            $p['categories'] = json_decode($p['categories'], true);
        }

        sendResponse($podcasts);
        break;

    case 'get':
        $id = $_GET['id'] ?? null;
        if (!$id) sendResponse(['error' => 'ID missing'], 400);

        $sql = "
            SELECT 
                p.id, 
                p.title, 
                p.cover_art, 
                p.cover_art_hint, 
                p.audio_url, 
                p.created_at,
                COALESCE(json_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '[]'::json) AS artist,
                COALESCE(json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '[]'::json) AS categories
            FROM podcasts p
            LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
            LEFT JOIN artists a ON pa.artist_uuid = a.uuid
            LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
            LEFT JOIN categories c ON pc.category_uuid = c.uuid
            WHERE p.id = ?
            GROUP BY p.id
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $podcast = $stmt->fetch();

        if ($podcast) {
            $podcast['artist'] = json_decode($podcast['artist'], true);
            $podcast['categories'] = json_decode($podcast['categories'], true);
            sendResponse($podcast);
        } else {
            sendResponse(['error' => 'Podcast not found'], 404);
        }
        break;

    // ... (আপনার আগের categories, meta, create কেসগুলো একদম ঠিক আছে, সেগুলো অপরিবর্তিত থাকবে)
    case 'categories':
        $stmt = $pdo->query("SELECT DISTINCT name FROM categories ORDER BY name");
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        sendResponse($categories);
        break;

    case 'meta':
        // Get categories that have at least 1 podcast with created_at <= NOW()
        $sql = "
            SELECT DISTINCT c.name 
            FROM categories c
            INNER JOIN podcast_categories pc ON c.uuid = pc.category_uuid
            INNER JOIN podcasts p ON pc.podcast_id = p.id
            WHERE p.created_at <= NOW()
            ORDER BY c.name ASC
        ";
        $stmt = $pdo->query($sql);
        $all_categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        // ✅ No exclusion - return ALL categories with published audio
        // Frontend (homepage) will filter Quran/Nasheed to avoid duplicates

        // Get artists that have at least 1 podcast with created_at <= NOW()
        $sql = "
            SELECT DISTINCT a.name 
            FROM artists a
            INNER JOIN podcast_artists pa ON a.uuid = pa.artist_uuid
            INNER JOIN podcasts p ON pa.podcast_id = p.id
            WHERE p.created_at <= NOW()
            ORDER BY a.name ASC
        ";
        $stmt = $pdo->query($sql);
        $all_artists = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $exclude_artists = ["Mahmud Huzaifa", "Mazharul Islam", "Moeen Uddin", "Usaid Zahid Siddique", "MercifulServant"];
        $filtered_artists = array_filter($all_artists, function($a) use ($exclude_artists) {
            return !in_array(trim($a), $exclude_artists);
        });

        sendResponse([
            'categories' => array_values($all_categories),
            'artists' => array_values($filtered_artists)
        ]);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}
?>
