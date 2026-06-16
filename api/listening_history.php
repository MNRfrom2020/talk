<?php
// api/listening_history.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? 'list';
$userId = $_GET['user_uid'] ?? null;

if (!$userId) sendResponse(['error' => 'User UID missing'], 400);

switch ($action) {
    case 'list':
        // Fixed column names to match actual database schema
        $sql = "
            SELECT
                p.id,
                p.title,
                p.cover_art,
                p.cover_art_hint,
                p.audio_url,
                p.created_at,
                lh.listened_at AS last_played_at,
                lh.progress_seconds AS duration,
                COALESCE(json_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '[]'::json) AS artist,
                COALESCE(json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '[]'::json) AS categories
            FROM listening_history lh
            JOIN podcasts p ON lh.podcast_id = p.id
            LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
            LEFT JOIN artists a ON pa.artist_uuid = a.uuid
            LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
            LEFT JOIN categories c ON pc.category_uuid = c.uuid
            WHERE lh.user_id = ?
            GROUP BY p.id, lh.listened_at, lh.progress_seconds
            ORDER BY lh.listened_at DESC
            LIMIT 50
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['artist'] = json_decode($row['artist'], true);
            $row['categories'] = json_decode($row['categories'], true);
        }

        sendResponse($rows);
        break;

    case 'last_played':
        $sql = "SELECT podcast_id FROM listening_history WHERE user_id = ? ORDER BY listened_at DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        sendResponse($row ? $row : null);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}
?>
