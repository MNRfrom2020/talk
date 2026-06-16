<?php
require_once 'db.php';
require_once 'utils.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['uuid'])) {
                $stmt = $pdo->prepare("
                    SELECT
                        a.uuid,
                        a.name,
                        a.description,
                        a.image_url,
                        a.created_at,
                        COUNT(pa.podcast_id) AS podcast_count
                    FROM artists a
                    LEFT JOIN podcast_artists pa ON pa.artist_uuid = a.uuid
                    WHERE a.uuid = ?::uuid
                    GROUP BY a.uuid
                ");
                $stmt->execute([$_GET['uuid']]);
                $artist = $stmt->fetch();
                if ($artist) {
                    $artist['podcast_count'] = (int)$artist['podcast_count'];
                    sendResponse($artist);
                }
                sendResponse(["error" => "Artist not found"], 404);
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $stmt = $pdo->prepare("
                SELECT
                    a.uuid,
                    a.name,
                    a.description,
                    a.image_url,
                    a.created_at,
                    COUNT(pa.podcast_id) AS podcast_count
                FROM artists a
                LEFT JOIN podcast_artists pa ON pa.artist_uuid = a.uuid
                GROUP BY a.uuid
                ORDER BY a.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $artists = $stmt->fetchAll();

            foreach ($artists as &$artist) {
                $artist['podcast_count'] = (int)$artist['podcast_count'];
            }

            $total = $pdo->query("SELECT count(*) FROM artists")->fetchColumn();
            sendResponse(["data" => $artists, "count" => (int)$total]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("
                INSERT INTO artists (name, description, image_url, created_at)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                trim($input['name'] ?? ''),
                $input['description'] ?? '',
                $input['image_url'] ?? '',
                $input['created_at'] ?? date('c'),
            ]);
            sendResponse(["message" => "Artist created successfully"]);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $uuid = $input['uuid'] ?? null;
            if (!$uuid) sendResponse(["error" => "Missing UUID"], 400);

            $fields = [];
            $values = [];

            if (array_key_exists('name', $input)) { $fields[] = "name = ?"; $values[] = trim($input['name']); }
            if (array_key_exists('description', $input)) { $fields[] = "description = ?"; $values[] = $input['description'] ?? ''; }
            if (array_key_exists('image_url', $input)) { $fields[] = "image_url = ?"; $values[] = $input['image_url'] ?? ''; }
            if (array_key_exists('created_at', $input)) { $fields[] = "created_at = ?"; $values[] = $input['created_at']; }

            if (empty($fields)) sendResponse(["error" => "No fields to update"], 400);

            $sql = "UPDATE artists SET " . implode(", ", $fields) . " WHERE uuid = ?::uuid";
            $values[] = $uuid;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            sendResponse(["message" => "Artist updated successfully"]);
            break;

        case 'DELETE':
            $uuid = $_GET['uuid'] ?? null;
            if (!$uuid) sendResponse(["error" => "Missing UUID"], 400);

            $pdo->beginTransaction();
            try {
                $pdo->prepare("DELETE FROM podcast_artists WHERE artist_uuid = ?::uuid")->execute([$uuid]);
                $pdo->prepare("DELETE FROM artists WHERE uuid = ?::uuid")->execute([$uuid]);
                $pdo->commit();
                sendResponse(["message" => "Artist deleted successfully"]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }

        default:
            sendResponse(["error" => "Method Not Allowed"], 405);
    }
} catch (PDOException $e) {
    handleSqlError($e, "Artist operation failed");
}
?>
