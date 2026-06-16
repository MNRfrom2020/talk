<?php
// api/playlists.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        // Check if user_uid is provided - if so, fetch user playlists
        $userUid = $_GET['user_uid'] ?? null;
        
        if ($userUid) {
            // Fetch user-created playlists from user_playlists table
            $sql = "
                SELECT
                    up.id,
                    up.name,
                    up.podcast_ids,
                    up.created_at,
                    COALESCE(array_length(up.podcast_ids, 1), 0) AS audio_count
                FROM user_playlists up
                WHERE up.user_id = ?
                ORDER BY up.created_at DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userUid]);
            $playlists = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // Fetch predefined playlists from playlists table
            $sql = "
                SELECT
                    pl.id,
                    pl.name,
                    pl.description,
                    pl.cover_art,
                    pl.podcast_ids,
                    pl.created_at,
                    COALESCE(array_length(pl.podcast_ids, 1), 0) AS audio_count
                FROM playlists pl
                ORDER BY pl.created_at DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $playlists = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        foreach ($playlists as &$p) {
            $parsedIds = parsePgArray($p['podcast_ids']);
            $audioCount = (int)$p['audio_count'];
            $isPredefined = !$userUid; // If user_uid provided, these are user playlists

            // ডাটাবেসের অরিজিনাল snake_case (সেফটির জন্য রাখলাম)
            $p['podcast_ids'] = $parsedIds;
            $p['is_predefined'] = $isPredefined;
            $p['audio_count'] = $audioCount;

            // 🚀 ম্যাজিক ফিক্স: React-এর জন্য camelCase যুক্ত করে দিলাম!
            $p['podcastIds'] = $parsedIds;
            $p['coverArt'] = $p['cover_art'] ?? null;
            $p['createdAt'] = $p['created_at'];
            $p['isPredefined'] = $isPredefined;
            $p['audioCount'] = $audioCount;
        }

        sendResponse($playlists);
        break;

    case 'get':
        $id = $_GET['id'] ?? null;
        if (!$id) sendResponse(['error' => 'ID missing'], 400);

        $stmt = $pdo->prepare("SELECT id, name, description, cover_art, podcast_ids, created_at FROM playlists WHERE id = ?::uuid");
        $stmt->execute([$id]);
        $playlist = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($playlist) {
            $parsedIds = parsePgArray($playlist['podcast_ids']);
            
            // ডাটাবেসের অরিজিনাল snake_case
            $playlist['podcast_ids'] = $parsedIds;
            $playlist['is_predefined'] = true;
            
            // 🚀 ম্যাজিক ফিক্স: React-এর জন্য camelCase
            $playlist['podcastIds'] = $parsedIds;
            $playlist['coverArt'] = $playlist['cover_art'];
            $playlist['createdAt'] = $playlist['created_at'];
            $playlist['isPredefined'] = true;

            sendResponse($playlist);
        } else {
            sendResponse(['error' => 'Playlist not found'], 404);
        }
        break;

    case 'podcasts':
        $id = $_GET['id'] ?? null;
        if (!$id) sendResponse(['error' => 'Playlist ID missing'], 400);

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
            FROM playlists pl
            CROSS JOIN unnest(pl.podcast_ids) AS unnested_id
            JOIN podcasts p ON p.id = unnested_id
            LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
            LEFT JOIN artists a ON pa.artist_uuid = a.uuid
            LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
            LEFT JOIN categories c ON pc.category_uuid = c.uuid
            WHERE pl.id = ?::uuid
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $podcasts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($podcasts as &$p) {
            $p['artist'] = json_decode($p['artist'], true);
            $p['categories'] = json_decode($p['categories'], true);
            
            // পডকাস্টের ক্ষেত্রেও camelCase যুক্ত করে দিচ্ছি
            $p['coverArt'] = $p['cover_art'];
            $p['coverArtHint'] = $p['cover_art_hint'];
            $p['audioUrl'] = $p['audio_url'];
            $p['createdAt'] = $p['created_at'];
        }

        sendResponse($podcasts);
        break;

    case 'create':
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data || !isset($data['name'])) {
            sendResponse(['error' => 'Missing data'], 400);
        }

        $id = $data['id'] ?? uniqid('pl_'); 
        $description = $data['description'] ?? null;
        // ফ্রন্টএন্ড থেকে cover বা coverArt যেভাবেই আসুক, আমরা cover_art এ সেভ করব
        $cover_art = $data['cover_art'] ?? ($data['coverArt'] ?? ($data['cover'] ?? null));
        $podcast_ids = $data['podcast_ids'] ?? ($data['podcastIds'] ?? []);
        
        $pg_podcast_ids = "{" . implode(',', $podcast_ids) . "}";

        $stmt = $pdo->prepare("INSERT INTO playlists (id, name, description, cover_art, podcast_ids, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$id, $data['name'], $description, $cover_art, $pg_podcast_ids]);

        sendResponse(['id' => $id, 'message' => 'Playlist created successfully']);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}

function parsePgArray($pgArray) {
    if (is_array($pgArray)) return $pgArray;
    if (!$pgArray || $pgArray === '{}') return [];
    return explode(',', trim($pgArray, '{}'));
}
?>
