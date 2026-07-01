<?php
require_once 'db.php';
require_once 'utils.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare("
                    SELECT id, name, description, cover_art, created_at
                    FROM playlists
                    WHERE id = ?::uuid
                ");
                $stmt->execute([$_GET['id']]);
                $playlist = $stmt->fetch();
                if ($playlist) {
                    $itemStmt = $pdo->prepare("
                        SELECT pi.podcast_id FROM admin_playlist_items pi
                        JOIN podcasts p ON p.id = pi.podcast_id AND p.created_at <= NOW()
                        WHERE pi.playlist_id = ?::uuid
                        ORDER BY pi.sort_order ASC
                    ");
                    $itemStmt->execute([$_GET['id']]);
                    $playlist['podcast_ids'] = $itemStmt->fetchAll(PDO::FETCH_COLUMN);
                    sendResponse($playlist);
                }
                sendResponse(["error" => "Playlist not found"], 404);
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $stmt = $pdo->prepare("
                SELECT id, name, description, cover_art, created_at
                FROM playlists
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $playlists = $stmt->fetchAll();

            foreach ($playlists as &$playlist) {
                $itemStmt = $pdo->prepare("
                    SELECT pi.podcast_id FROM admin_playlist_items pi
                    JOIN podcasts p ON p.id = pi.podcast_id AND p.created_at <= NOW()
                    WHERE pi.playlist_id = ?::uuid
                    ORDER BY pi.sort_order ASC
                ");
                $itemStmt->execute([$playlist['id']]);
                $playlist['podcast_ids'] = $itemStmt->fetchAll(PDO::FETCH_COLUMN);
            }

            $total = $pdo->query("SELECT count(*) FROM playlists")->fetchColumn();
            sendResponse(["data" => $playlists, "count" => (int)$total]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $name = trim($input['name'] ?? '');
            $description = $input['description'] ?? '';
            $cover_art = $input['cover_art'] ?? '';
            $podcast_ids = $input['podcast_ids'] ?? [];
            $created_at = $input['created_at'] ?? date('c');

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
                INSERT INTO playlists (name, description, cover_art, created_at)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$name, $description, $cover_art, $created_at]);
            $newId = $pdo->lastInsertId() ?: null;

            // If driver doesn't support lastInsertId, fetch it
            if (!$newId) {
                $idStmt = $pdo->prepare("SELECT id FROM playlists WHERE name = ? ORDER BY created_at DESC LIMIT 1");
                $idStmt->execute([$name]);
                $newId = $idStmt->fetchColumn();
            }

            if (!empty($podcast_ids) && $newId) {
                $itemStmt = $pdo->prepare("INSERT INTO admin_playlist_items (playlist_id, podcast_id, sort_order) VALUES (?, ?, ?)");
                foreach ($podcast_ids as $index => $pid) {
                    $itemStmt->execute([$newId, $pid, $index + 1]);
                }
            }

            $pdo->commit();
            sendResponse(["message" => "Playlist created successfully"]);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? null;
            if (!$id) {
                sendResponse(["error" => "Missing ID"], 400);
            }

            $fields = [];
            $values = [];

            if (array_key_exists('name', $input)) {
                $fields[] = "name = ?";
                $values[] = trim($input['name']);
            }
            if (array_key_exists('description', $input)) {
                $fields[] = "description = ?";
                $values[] = $input['description'] ?? '';
            }
            if (array_key_exists('cover_art', $input)) {
                $fields[] = "cover_art = ?";
                $values[] = $input['cover_art'] ?? '';
            }
            if (array_key_exists('created_at', $input)) {
                $fields[] = "created_at = ?";
                $values[] = $input['created_at'];
            }

            if (!empty($fields)) {
                $sql = "UPDATE playlists SET " . implode(", ", $fields) . " WHERE id = ?::uuid";
                $values[] = $id;
                $stmt = $pdo->prepare($sql);
                $stmt->execute($values);
            }

            // If podcast_ids provided, replace all items in junction table
            if (array_key_exists('podcast_ids', $input)) {
                $podcast_ids = $input['podcast_ids'] ?? [];
                
                $pdo->beginTransaction();
                $pdo->prepare("DELETE FROM admin_playlist_items WHERE playlist_id = ?::uuid")->execute([$id]);
                
                if (!empty($podcast_ids)) {
                    $itemStmt = $pdo->prepare("INSERT INTO admin_playlist_items (playlist_id, podcast_id, sort_order) VALUES (?::uuid, ?, ?)");
                    foreach ($podcast_ids as $index => $pid) {
                        $itemStmt->execute([$id, $pid, $index + 1]);
                    }
                }
                
                $pdo->commit();
            }

            sendResponse(["message" => "Playlist updated successfully"]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                sendResponse(["error" => "Missing ID"], 400);
            }

            // Junction items will cascade delete via ON DELETE CASCADE
            $stmt = $pdo->prepare("DELETE FROM playlists WHERE id = ?::uuid");
            $stmt->execute([$id]);
            sendResponse(["message" => "Playlist deleted successfully"]);
            break;

        default:
            sendResponse(["error" => "Method Not Allowed"], 405);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    handleSqlError($e, "Playlist operation failed");
}
?>
