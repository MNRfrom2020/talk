<?php
require_once 'config.php';
require_once 'utils.php';

// Allow POST for exchanging code
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(["error" => "Method Not Allowed"], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$code = $input['code'] ?? '';
$state = $input['state'] ?? '';

if (empty($code)) {
    sendResponse(["error" => "Authorization code is required"], 400);
}

// 1. Exchange code for access token
$token_url = getenv('MNR_ID_TOKEN_URL');
$client_id = getenv('MNR_ID_CLIENT_ID');
$client_secret = getenv('MNR_ID_CLIENT_SECRET');
$redirect_uri = getenv('MNR_ID_REDIRECT_URI');

$ch = curl_init($token_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'grant_type' => 'authorization_code',
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'redirect_uri' => $redirect_uri,
    'code' => $code
]));

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    sendResponse(["error" => "Failed to exchange token", "details" => json_decode($response)], $http_code);
}

$token_data = json_decode($response, true);
$access_token = $token_data['access_token'];

// 2. Fetch user profile
$userinfo_url = getenv('MNR_ID_USERINFO_URL');
$ch = curl_init($userinfo_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $access_token"
]);

$user_response = curl_exec($ch);
$http_code_user = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code_user !== 200) {
    sendResponse(["error" => "Failed to fetch user info"], $http_code_user);
}

$user_data = json_decode($user_response, true);

// 3. RBAC: Check Role
// Assuming the user object has a 'role' field. Adjust if nested (e.g., $user_data['data']['role'])
$role = $user_data['role'] ?? $user_data['data']['role'] ?? '';

if ($role !== 'Super Admin') {
    // Return a specific error that the frontend can use to redirect
    sendResponse([
        "error" => "Access Denied",
        "redirect" => "https://talk.mnr.bd",
        "message" => "শুধুমাত্র Super Admin এই প্যানেলে প্রবেশ করতে পারবেন।"
    ], 403);
}

// 4. Success: Return user data
sendResponse([
    "id" => $user_data['id'] ?? $user_data['data']['id'],
    "name" => $user_data['name'] ?? $user_data['data']['name'] ?? $user_data['full_name'],
    "email" => $user_data['email'] ?? $user_data['data']['email'],
    "avatar" => $user_data['avatar'] ?? $user_data['data']['avatar'] ?? $user_data['image'] ?? '',
    "role" => $role
]);
?>
