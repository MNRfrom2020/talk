<?php
require_once 'db.php';
require_once 'utils.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(["error" => "Method Not Allowed"], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    sendResponse(["error" => "Username and password are required"], 400);
}

try {
    $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch();

    if (!$admin) {
        sendResponse(["error" => "Admin not found"], 404);
    }

    // Checking password (as per current frontend logic, simple comparison)
    if ($admin['password'] !== $password) {
        sendResponse(["error" => "Invalid password"], 401);
    }

    // Success - returning admin data (excluding sensitive password)
    unset($admin['password']);
    sendResponse($admin);

} catch (PDOException $e) {
    handleSqlError($e, "Auth error");
}
?>
