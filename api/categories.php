<?php
// api/categories.php
require_once 'db.php';

$pdo = getDbConnection();

// Get action from query params
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        // Get all categories ordered by name
        $stmt = $pdo->query("
            SELECT uuid, name, description, image_url 
            FROM categories 
            ORDER BY name ASC
        ");
        $categories = $stmt->fetchAll();
        sendResponse($categories);
        break;

    case 'get':
        // Get a single category by UUID
        $uuid = $_GET['uuid'] ?? null;
        if (!$uuid) {
            sendResponse(['error' => 'UUID missing'], 400);
        }

        $stmt = $pdo->prepare("
            SELECT uuid, name, description, image_url 
            FROM categories 
            WHERE uuid = ?
        ");
        $stmt->execute([$uuid]);
        $category = $stmt->fetch();

        if ($category) {
            sendResponse($category);
        } else {
            sendResponse(['error' => 'Category not found'], 404);
        }
        break;

    case 'podcasts':
        // Get all podcasts for a specific category
        $uuid = $_GET['uuid'] ?? null;
        if (!$uuid) {
            sendResponse(['error' => 'UUID missing'], 400);
        }

        $stmt = $pdo->prepare("
            SELECT 
                p.id, 
                p.title, 
                p.cover_art, 
                p.cover_art_hint, 
                p.audio_url, 
                p.created_at,
                COALESCE(json_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '[]') AS artist,
                COALESCE(json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '[]') AS categories
            FROM podcasts p
            LEFT JOIN podcast_artists pa ON p.id = pa.podcast_id
            LEFT JOIN artists a ON pa.artist_uuid = a.uuid
            LEFT JOIN podcast_categories pc ON p.id = pc.podcast_id
            LEFT JOIN categories c ON pc.category_uuid = c.uuid
            WHERE pc.category_uuid = ?
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([$uuid]);
        $podcasts = $stmt->fetchAll();

        // Decode JSON fields
        foreach ($podcasts as &$p) {
            $p['artist'] = json_decode($p['artist'], true);
            $p['categories'] = json_decode($p['categories'], true);
        }

        sendResponse($podcasts);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}