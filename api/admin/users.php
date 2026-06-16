<?php
require_once 'db.php';
require_once 'utils.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['uid'])) {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE uid = ?");
                $stmt->execute([$_GET['uid']]);
                $user = $stmt->fetch();
                if ($user) {
                    unset($user['pass']); // Don't send password
                    sendResponse($user);
                }
                sendResponse(["error" => "User not found"], 404);
            } else {
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
                $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
                
                $stmt = $pdo->prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?");
                $stmt->execute([$limit, $offset]);
                $users = $stmt->fetchAll();
                
                foreach ($users as &$u) {
                    unset($u['pass']);
                }
                
                $total = $pdo->query("SELECT count(*) FROM users")->fetchColumn();
                sendResponse(["data" => $users, "count" => (int)$total]);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $sql = "INSERT INTO users (full_name, username, email, image, pass, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $input['full_name'],
                $input['username'],
                $input['email'],
                $input['image'] ?? '',
                $input['pass'], // Password should ideally be hashed
                $input['created_at'] ?? date('Y-m-d H:i:s'),
                date('Y-m-d H:i:s')
            ]);
            sendResponse(["message" => "User created successfully"]);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $uid = $input['uid'] ?? null;
            if (!$uid) sendResponse(["error" => "Missing UID"], 400);

            $fields = [];
            $values = [];
            
            if (isset($input['full_name'])) { $fields[] = "full_name = ?"; $values[] = $input['full_name']; }
            if (isset($input['username'])) { $fields[] = "username = ?"; $values[] = $input['username']; }
            if (isset($input['email'])) { $fields[] = "email = ?"; $values[] = $input['email']; }
            if (isset($input['image'])) { $fields[] = "image = ?"; $values[] = $input['image']; }
            if (isset($input['pass']) && !empty($input['pass'])) { $fields[] = "pass = ?"; $values[] = $input['pass']; }
            
            $fields[] = "updated_at = NOW()";

            if (empty($fields)) sendResponse(["error" => "No fields to update"], 400);

            $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE uid = ?";
            $values[] = $uid;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            sendResponse(["message" => "User updated successfully"]);
            break;

        case 'DELETE':
            $uid = $_GET['uid'] ?? null;
            if (!$uid) sendResponse(["error" => "Missing UID"], 400);

            $stmt = $pdo->prepare("DELETE FROM users WHERE uid = ?");
            $stmt->execute([$uid]);
            sendResponse(["message" => "User deleted successfully"]);
            break;

        default:
            sendResponse(["error" => "Method Not Allowed"], 405);
    }

} catch (PDOException $e) {
    handleSqlError($e, "User operation failed");
}
?>
