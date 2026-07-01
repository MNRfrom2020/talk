<?php
// api/playlists.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $userUid = $_GET['user_uid'] ?? null;
        
        if ($userUid) {
            $sql = "
                SELECT
                    up.id,
                    up.name,
                    up.created_at,
                    up.cover_art,
                    COALESCE(
                        (SELECT json_agg(pi_sub.podcast_id ORDER BY pi_sub.sort_order ASC)
                         FROM playlist_items pi_sub
                         JOIN podcasts p_sub ON p_sub.id = pi_sub.podcast_id AND p_sub.created_at <= NOW()
                         WHERE pi_sub.playlist_id = up.id),
                        '[]'::json
                    ) AS podcast_ids
                FROM user_playlists up
                WHERE up.user_id = ?
                  AND EXISTS (
                      SELECT 1 FROM playlist_items pi_sub2
                      JOIN podcasts p_sub2 ON p_sub2.id = pi_sub2.podcast_id AND p_sub2.created_at <= NOW()
                      WHERE pi_sub2.playlist_id = up.id
                  )
                ORDER BY up.created_at DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userUid]);
            $playlists = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $sql = "
                SELECT
                    pl.id,
                    pl.name,
                    pl.description,
                    pl.cover_art,
                    pl.created_at,
                    COALESCE(
                        (SELECT json_agg(api_sub.podcast_id ORDER BY api_sub.sort_order ASC)
                         FROM admin_playlist_items api_sub
                         JOIN podcasts p_sub ON p_sub.id = api_sub.podcast_id AND p_sub.created_at <= NOW()
                         WHERE api_sub.playlist_id = pl.id),
                        '[]'::json
                    ) AS podcast_ids
                FROM playlists pl
                WHERE EXISTS (
                    SELECT 1 FROM admin_playlist_items api_sub2
                    JOIN podcasts p_sub2 ON p_sub2.id = api_sub2.podcast_id AND p_sub2.created_at <= NOW()
                    WHERE api_sub2.playlist_id = pl.id
                )
                ORDER BY pl.created_at DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $playlists = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        foreach ($playlists as &$p) {
            $parsedIds = json_decode($p['podcast_ids'], true) ?? [];
            $audioCount = count($parsedIds);
            $isPredefined = !$userUid;

            $p['podcast_ids'] = $parsedIds;
            $p['is_predefined'] = $isPredefined;
            $p['audio_count'] = $audioCount;

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

        $stmt = $pdo->prepare("
            SELECT id, name, description, cover_art, created_at FROM playlists WHERE id = ?::uuid
        ");
        $stmt->execute([$id]);
        $playlist = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($playlist) {
            $itemStmt = $pdo->prepare("
                SELECT pi.podcast_id FROM admin_playlist_items pi
                JOIN podcasts p ON p.id = pi.podcast_id AND p.created_at <= NOW()
                WHERE pi.playlist_id = ?::uuid
                ORDER BY pi.sort_order ASC
            ");
            $itemStmt->execute([$id]);
            $parsedIds = $itemStmt->fetchAll(PDO::FETCH_COLUMN);
            
            $playlist['podcast_ids'] = $parsedIds;
            $playlist['is_predefined'] = true;
            
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
            FROM admin_playlist_items api
            JOIN podcasts p ON p.id = api.podcast_id AND p.created_at <= NOW()
            LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
            LEFT JOIN artists a ON pa.artist_uuid = a.uuid
            LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
            LEFT JOIN categories c ON pc.category_uuid = c.uuid
            WHERE api.playlist_id = ?::uuid
            GROUP BY p.id
            ORDER BY api.sort_order ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $podcasts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($podcasts as &$p) {
            $p['artist'] = json_decode($p['artist'], true);
            $p['categories'] = json_decode($p['categories'], true);
            
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
        $cover_art = $data['cover_art'] ?? ($data['coverArt'] ?? ($data['cover'] ?? null));
        $podcast_ids = $data['podcast_ids'] ?? ($data['podcastIds'] ?? []);

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO playlists (id, name, description, cover_art, created_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$id, $data['name'], $description, $cover_art]);

            if (!empty($podcast_ids)) {
                $itemSql = "INSERT INTO admin_playlist_items (playlist_id, podcast_id, sort_order) VALUES (?, ?, ?)";
                $itemStmt = $pdo->prepare($itemSql);
                foreach ($podcast_ids as $index => $podcastId) {
                    $itemStmt->execute([$id, $podcastId, $index + 1]);
                }
            }

            $pdo->commit();
            sendResponse(['id' => $id, 'message' => 'Playlist created successfully']);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendResponse(['error' => 'Failed to create playlist: ' . $e->getMessage()], 500);
        }
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}
?>
