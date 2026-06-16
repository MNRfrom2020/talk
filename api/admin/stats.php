<?php
require_once 'db.php';
require_once 'utils.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(["error" => "Method Not Allowed"], 405);
}

try {
    $counts = [
        "podcasts" => $pdo->query("SELECT count(*) FROM podcasts")->fetchColumn(),
        "playlists" => $pdo->query("SELECT count(*) FROM playlists")->fetchColumn(),
        "artists" => $pdo->query("SELECT count(*) FROM artists")->fetchColumn(),
        "categories" => $pdo->query("SELECT count(*) FROM categories")->fetchColumn()
    ];

    sendResponse($counts);

} catch (PDOException $e) {
    handleSqlError($e, "Failed to fetch counts");
}
?>
