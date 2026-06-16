<?php
// api/user_auth.php - Only for MNR ID OAuth callback data forwarding
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? null;

switch ($action) {
    case 'profile':
        // For Offline-First: Just return what's sent to us, no DB query needed
        // The frontend sends user data in the request body
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if ($data) {
            // Return the user data as-is (no password field should be present)
            unset($data['pass']);
            sendResponse($data);
        } else {
            // Fallback: try GET parameter
            $uid = $_GET['uid'] ?? null;
            if (!$uid) sendResponse(['error' => 'UID or data required'], 400);
            
            // Return basic info without DB query
            sendResponse([
                'uid' => $uid,
                'message' => 'User data should be provided in request body for Offline-First mode'
            ]);
        }
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}
