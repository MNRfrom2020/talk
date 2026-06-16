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
                        c.uuid,
                        c.name,
                        c.description,
                        c.image_url,
                        c.created_at,
                        COUNT(pc.podcast_id) AS podcast_count
                    FROM categories c
                    LEFT JOIN podcast_categories pc ON pc.category_uuid = c.uuid
                    WHERE c.uuid = ?::uuid
                    GROUP BY c.uuid
                ");
                $stmt->execute([$_GET['uuid']]);
                $category = $stmt->fetch();
                if ($category) {
                    $category['podcast_count'] = (int)$category['podcast_count'];
                    sendResponse($category);
                }
                sendResponse(["error" => "Category not found"], 404);
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $stmt = $pdo->prepare("
                SELECT
                    c.uuid,
                    c.name,
                    c.description,
                    c.image_url,
                    c.created_at,
                    COUNT(pc.podcast_id) AS podcast_count
                FROM categories c
                LEFT JOIN podcast_categories pc ON pc.category_uuid = c.uuid
                GROUP BY c.uuid
                ORDER BY c.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $categories = $stmt->fetchAll();

            foreach ($categories as &$category) {
                $category['podcast_count'] = (int)$category['podcast_count'];
            }

            $total = $pdo->query("SELECT count(*) FROM categories")->fetchColumn();
            sendResponse(["data" => $categories, "count" => (int)$total]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("
                INSERT INTO categories (name, description, image_url, created_at)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                trim($input['name'] ?? ''),
                $input['description'] ?? '',
                $input['image_url'] ?? '',
                $input['created_at'] ?? date('c'),
            ]);
            sendResponse(["message" => "Category created successfully"]);
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

            $sql = "UPDATE categories SET " . implode(", ", $fields) . " WHERE uuid = ?::uuid";
            $values[] = $uuid;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            sendResponse(["message" => "Category updated successfully"]);
            break;

        case 'DELETE':
            $uuid = $_GET['uuid'] ?? null;
            if (!$uuid) sendResponse(["error" => "Missing UUID"], 400);

            $pdo->beginTransaction();
            try {
                $pdo->prepare("DELETE FROM podcast_categories WHERE category_uuid = ?::uuid")->execute([$uuid]);
                $pdo->prepare("DELETE FROM categories WHERE uuid = ?::uuid")->execute([$uuid]);
                $pdo->commit();
                sendResponse(["message" => "Category deleted successfully"]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }

        default:
            sendResponse(["error" => "Method Not Allowed"], 405);
    }
} catch (PDOException $e) {
    handleSqlError($e, "Category operation failed");
}
?>
