<?php
// api/auth_mnr.php

// Start output buffering immediately to catch any warnings/notices
ob_start();

// Enable ALL error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';

/**
 * Clean way to send JSON responses
 */
function sendResponse($data, $status = 200) {
    // Clear ALL output buffers to prevent any HTML/whitespace in response
    while (ob_get_level()) {
        ob_end_clean();
    }
    header("Content-Type: application/json");
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Allow POST for exchanging code
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(["error" => "Method Not Allowed"], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$code = $input['code'] ?? '';

if (empty($code)) {
    sendResponse(["error" => "Authorization code is required"], 400);
}

// Load MNR ID configuration
$base_url = getenv('VITE_MNR_ID_URL');
$client_id = getenv('VITE_MNR_CLIENT_ID');
$client_secret = getenv('VITE_MNR_CLIENT_SECRET');
$redirect_uri = getenv('VITE_MNR_REDIRECT_URI');

// Check if configuration exists
if (empty($base_url) || empty($client_id) || empty($client_secret) || empty($redirect_uri)) {
    sendResponse([
        "error" => "MNR ID configuration missing",
        "details" => [
            "VITE_MNR_ID_URL" => empty($base_url),
            "VITE_MNR_CLIENT_ID" => empty($client_id),
            "VITE_MNR_CLIENT_SECRET" => empty($client_secret),
            "VITE_MNR_REDIRECT_URI" => empty($redirect_uri)
        ]
    ], 500);
}

// 1. Exchange code for access token
$token_url = $base_url . '/api/oauth/token';

$ch = curl_init($token_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'grant_type' => 'authorization_code',
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'redirect_uri' => $redirect_uri,
    'code' => $code
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$curl_error = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Handle cURL errors
if ($response === false || !empty($curl_error)) {
    sendResponse([
        "error" => "Failed to connect to MNR ID server",
        "details" => $curl_error
    ], 502);
}

if ($http_code !== 200) {
    $errorData = json_decode($response, true) ?? ['raw' => $response];
    sendResponse([
        "error" => "Token exchange failed",
        "details" => $errorData
    ], $http_code);
}

$token_data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    sendResponse([
        "error" => "Invalid response from MNR ID",
        "details" => json_last_error_msg()
    ], 500);
}

if (!isset($token_data['user'])) {
    sendResponse(["error" => "No user data received from MNR ID"], 500);
}

// Return only the user object expected by the frontend
sendResponse($token_data['user']);
?>
