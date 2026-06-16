<?php
// api/users.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        $limit = $_GET['limit'] ?? 100;
        $offset = $_GET['offset'] ?? 0;

        $stmt = $pdo->prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([(int)$limit, (int)$offset]);
        $users = $stmt->fetchAll();

        foreach ($users as &$u) {
            unset($u['pass']);
            $u['playlists_ids'] = parsePgArray($u['playlists_ids'] ?? '{}');
        }

        sendResponse($users);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}

function parsePgArray($pgArray) {
    if (is_array($pgArray)) return $pgArray;
    if (!$pgArray || $pgArray === '{}') return [];
    return explode(',', trim($pgArray, '{}'));
}
