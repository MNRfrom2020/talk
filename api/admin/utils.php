<?php

/**
 * Parses a PostgreSQL array string (e.g., {val1,val2}) into a PHP array.
 */
function parsePgArray($pgArray) {
    if ($pgArray === null || $pgArray === '{}') {
        return [];
    }
    
    // Remove curly braces and split by comma
    $clean = trim($pgArray, '{}');
    if ($clean === "") return [];

    // Simple split (may need more complex regex if values contain commas or quotes)
    return array_map(function($val) {
        return trim($val, '" ');
    }, explode(',', $clean));
}

/**
 * Formats a PHP array into a PostgreSQL array string (e.g., {val1,val2}).
 */
function formatPgArray($phpArray) {
    if (!is_array($phpArray) || empty($phpArray)) {
        return '{}';
    }
    
    // Join with commas and wrap in curly braces
    return '{' . implode(',', array_map(function($val) {
        return str_replace(['{', '}', ','], '', $val); // Basic sanitization
    }, $phpArray)) . '}';
}

/**
 * Helper to send JSON responses.
 */
function sendResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

/**
 * Basic SQL error handling for PDO.
 */
function handleSqlError($exception, $message = "Database error occurred.") {
    sendResponse(["error" => $message, "details" => $exception->getMessage()], 500);
}

?>
