<?php
require_once 'db.php';
require_once 'utils.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare("
                    SELECT id, name, description, cover_art, podcast_ids, created_at
                    FROM playlists
                    WHERE id = ?::uuid
                ");
                $stmt->execute([$_GET['id']]);
                $playlist = $stmt->fetch();
                if ($playlist) {
                    $playlist['podcast_ids'] = parsePgArray($playlist['podcast_ids']);
                    sendResponse($playlist);
                }
                sendResponse(["error" => "Playlist not found"], 404);
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $stmt = $pdo->prepare("
                SELECT id, name, description, cover_art, podcast_ids, created_at
                FROM playlists
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $playlists = $stmt->fetchAll();

            foreach ($playlists as &$playlist) {
                $playlist['podcast_ids'] = parsePgArray($playlist['podcast_ids']);
            }

            $total = $pdo->query("SELECT count(*) FROM playlists")->fetchColumn();
            sendResponse(["data" => $playlists, "count" => (int)$total]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            $stmt = $pdo->prepare("
                INSERT INTO playlists (name, description, cover_art, podcast_ids, created_at)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                trim($input['name'] ?? ''),
                $input['description'] ?? '',
                $input['cover_art'] ?? '',
                formatPgArray($input['podcast_ids'] ?? []),
                $input['created_at'] ?? date('c'),
            ]);

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
            if (array_key_exists('podcast_ids', $input)) {
                $fields[] = "podcast_ids = ?";
                $values[] = formatPgArray($input['podcast_ids'] ?? []);
            }
            if (array_key_exists('created_at', $input)) {
                $fields[] = "created_at = ?";
                $values[] = $input['created_at'];
            }

            if (empty($fields)) {
                sendResponse(["error" => "No fields to update"], 400);
            }

            $sql = "UPDATE playlists SET " . implode(", ", $fields) . " WHERE id = ?::uuid";
            $values[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            sendResponse(["message" => "Playlist updated successfully"]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                sendResponse(["error" => "Missing ID"], 400);
            }

            $stmt = $pdo->prepare("DELETE FROM playlists WHERE id = ?::uuid");
            $stmt->execute([$id]);
            sendResponse(["message" => "Playlist deleted successfully"]);
            break;

        default:
            sendResponse(["error" => "Method Not Allowed"], 405);
    }
} catch (PDOException $e) {
    handleSqlError($e, "Playlist operation failed");
}
?>
