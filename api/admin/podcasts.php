<?php
require_once 'db.php';
require_once 'utils.php';

$method = $_SERVER['REQUEST_METHOD'];

function fetchPodcastById(PDO $pdo, string $id) {
    $sql = "
        SELECT
            p.id,
            p.title,
            p.cover_art,
            p.cover_art_hint,
            p.audio_url,
            p.created_at,
            COALESCE(json_agg(DISTINCT jsonb_build_object('uuid', a.uuid, 'name', a.name))
                FILTER (WHERE a.uuid IS NOT NULL), '[]'::json) AS artists,
            COALESCE(json_agg(DISTINCT jsonb_build_object('uuid', c.uuid, 'name', c.name))
                FILTER (WHERE c.uuid IS NOT NULL), '[]'::json) AS categories
        FROM podcasts p
        LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
        LEFT JOIN artists a ON pa.artist_uuid = a.uuid
        LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
        LEFT JOIN categories c ON pc.category_uuid = c.uuid
        WHERE p.id = ?::uuid
        GROUP BY p.id
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    $podcast = $stmt->fetch();

    if (!$podcast) {
        return null;
    }

    $artists = json_decode($podcast['artists'], true) ?: [];
    $categories = json_decode($podcast['categories'], true) ?: [];

    $podcast['artist'] = array_values(array_map(fn($artist) => $artist['name'], $artists));
    $podcast['artist_uuids'] = array_values(array_map(fn($artist) => $artist['uuid'], $artists));
    $podcast['categories'] = array_values(array_map(fn($category) => $category['name'], $categories));
    $podcast['category_uuids'] = array_values(array_map(fn($category) => $category['uuid'], $categories));

    unset($podcast['artists'], $podcast['categories']);

    return $podcast;
}

function syncPodcastRelations(PDO $pdo, string $podcastId, string $table, string $column, array $uuids) {
    $deleteStmt = $pdo->prepare("DELETE FROM {$table} WHERE podcast_id = ?::uuid");
    $deleteStmt->execute([$podcastId]);

    if (empty($uuids)) {
        return;
    }

    $insertStmt = $pdo->prepare("INSERT INTO {$table} (podcast_id, {$column}) VALUES (?::uuid, ?::uuid)");
    foreach ($uuids as $uuid) {
        $insertStmt->execute([$podcastId, $uuid]);
    }
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $podcast = fetchPodcastById($pdo, $_GET['id']);
                if ($podcast) {
                    sendResponse($podcast);
                }
                sendResponse(["error" => "Podcast not found"], 404);
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $sql = "
                SELECT
                    p.id,
                    p.title,
                    p.cover_art,
                    p.cover_art_hint,
                    p.audio_url,
                    p.created_at,
                    COALESCE(json_agg(DISTINCT jsonb_build_object('uuid', a.uuid, 'name', a.name))
                        FILTER (WHERE a.uuid IS NOT NULL), '[]'::json) AS artists,
                    COALESCE(json_agg(DISTINCT jsonb_build_object('uuid', c.uuid, 'name', c.name))
                        FILTER (WHERE c.uuid IS NOT NULL), '[]'::json) AS categories
                FROM podcasts p
                LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
                LEFT JOIN artists a ON pa.artist_uuid = a.uuid
                LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
                LEFT JOIN categories c ON pc.category_uuid = c.uuid
                GROUP BY p.id
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$limit, $offset]);
            $podcasts = $stmt->fetchAll();

            foreach ($podcasts as &$podcast) {
                $artists = json_decode($podcast['artists'], true) ?: [];
                $categories = json_decode($podcast['categories'], true) ?: [];

                $podcast['artist'] = array_values(array_map(fn($artist) => $artist['name'], $artists));
                $podcast['artist_uuids'] = array_values(array_map(fn($artist) => $artist['uuid'], $artists));
                $podcast['categories'] = array_values(array_map(fn($category) => $category['name'], $categories));
                $podcast['category_uuids'] = array_values(array_map(fn($category) => $category['uuid'], $categories));

                unset($podcast['artists'], $podcast['categories']);
            }

            $total = $pdo->query("SELECT count(*) FROM podcasts")->fetchColumn();
            sendResponse(["data" => $podcasts, "count" => (int)$total]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $podcastId = $input['id'] ?? null;
            $title = trim($input['title'] ?? '');
            $coverArt = trim($input['cover_art'] ?? '');
            $coverArtHint = $input['cover_art_hint'] ?? '';
            $audioUrl = trim($input['audio_url'] ?? '');
            $createdAt = $input['created_at'] ?? date('c');
            $artistUuids = array_values(array_filter($input['artist_uuids'] ?? []));
            $categoryUuids = array_values(array_filter($input['category_uuids'] ?? []));

            if ($title === '' || $coverArt === '' || $audioUrl === '') {
                sendResponse(["error" => "Missing required podcast fields"], 400);
            }

            $pdo->beginTransaction();
            try {
                $sql = "
                    INSERT INTO podcasts (title, cover_art, cover_art_hint, audio_url, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    RETURNING id
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$title, $coverArt, $coverArtHint, $audioUrl, $createdAt]);
                $podcastId = $stmt->fetchColumn();

                syncPodcastRelations($pdo, $podcastId, 'podcast_artists', 'artist_uuid', $artistUuids);
                syncPodcastRelations($pdo, $podcastId, 'podcast_categories', 'category_uuid', $categoryUuids);

                $pdo->commit();
                sendResponse(["message" => "Podcast created successfully", "id" => $podcastId]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $podcastId = $input['id'] ?? null;

            if (!$podcastId) {
                sendResponse(["error" => "Missing ID"], 400);
            }

            $fields = [];
            $values = [];

            if (array_key_exists('title', $input)) {
                $fields[] = "title = ?";
                $values[] = trim($input['title']);
            }
            if (array_key_exists('cover_art', $input)) {
                $fields[] = "cover_art = ?";
                $values[] = trim($input['cover_art']);
            }
            if (array_key_exists('cover_art_hint', $input)) {
                $fields[] = "cover_art_hint = ?";
                $values[] = $input['cover_art_hint'] ?? '';
            }
            if (array_key_exists('audio_url', $input)) {
                $fields[] = "audio_url = ?";
                $values[] = trim($input['audio_url']);
            }
            if (array_key_exists('created_at', $input)) {
                $fields[] = "created_at = ?";
                $values[] = $input['created_at'];
            }

            $pdo->beginTransaction();
            try {
                if (!empty($fields)) {
                    $sql = "UPDATE podcasts SET " . implode(", ", $fields) . " WHERE id = ?::uuid";
                    $values[] = $podcastId;
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($values);
                }

                if (array_key_exists('artist_uuids', $input)) {
                    syncPodcastRelations($pdo, $podcastId, 'podcast_artists', 'artist_uuid', array_values(array_filter($input['artist_uuids'] ?? [])));
                }
                if (array_key_exists('category_uuids', $input)) {
                    syncPodcastRelations($pdo, $podcastId, 'podcast_categories', 'category_uuid', array_values(array_filter($input['category_uuids'] ?? [])));
                }

                $pdo->commit();
                sendResponse(["message" => "Podcast updated successfully"]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                sendResponse(["error" => "Missing ID"], 400);
            }

            $pdo->beginTransaction();
            try {
                $pdo->prepare("DELETE FROM podcast_artists WHERE podcast_id = ?::uuid")->execute([$id]);
                $pdo->prepare("DELETE FROM podcast_categories WHERE podcast_id = ?::uuid")->execute([$id]);
                $pdo->prepare("DELETE FROM podcasts WHERE id = ?::uuid")->execute([$id]);
                $pdo->commit();
                sendResponse(["message" => "Podcast deleted successfully"]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }

        default:
            sendResponse(["error" => "Method Not Allowed"], 405);
    }
} catch (PDOException $e) {
    handleSqlError($e, "Podcast operation failed");
}
?>
