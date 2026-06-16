<?php
// api/stats.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? 'counts';

switch ($action) {
    case 'counts':
        $podcastCount = $pdo->query("SELECT COUNT(*) FROM podcasts")->fetchColumn();
        $playlistCount = $pdo->query("SELECT COUNT(*) FROM playlists")->fetchColumn();

        sendResponse([
            'podcasts' => (int)$podcastCount,
            'playlists' => (int)$playlistCount
        ]);
        break;

    case 'listening_activity':
        $userId = $_GET['user_uid'] ?? null;
        $since = $_GET['since'] ?? null;

        if (!$userId) sendResponse(['error' => 'User UID missing'], 400);

        // Fixed: use correct column names matching database schema
        $sql = "SELECT progress_seconds AS duration, listened_at AS last_played_at FROM listening_history WHERE user_id = ?";
        $params = [$userId];

        if ($since) {
            $sql .= " AND listened_at >= ?::timestamp with time zone";
            $params[] = $since;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();

        sendResponse($data);
        break;

    case 'listening_stats':
        $userId = $_GET['user_uid'] ?? null;
        $since = $_GET['since'] ?? null;

        if (!$userId) sendResponse(['error' => 'User UID missing'], 400);

        // Fixed: use correct column names matching database schema
        $sql = "
            SELECT
                p.id,
                COALESCE(json_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '[]'::json) AS artist,
                COALESCE(json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '[]'::json) AS categories
            FROM listening_history lh
            JOIN podcasts p ON lh.podcast_id = p.id
            LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
            LEFT JOIN artists a ON pa.artist_uuid = a.uuid
            LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
            LEFT JOIN categories c ON pc.category_uuid = c.uuid
            WHERE lh.user_id = ?
        ";
        $params = [$userId];

        if ($since) {
            $sql .= " AND lh.listened_at >= ?::timestamp with time zone";
            $params[] = $since;
        }

        $sql .= " GROUP BY p.id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['artist'] = json_decode($row['artist'], true);
            $row['categories'] = json_decode($row['categories'], true);
        }

        sendResponse($rows);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}
?>
