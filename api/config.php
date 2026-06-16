<?php
// api/config.php

// Simple generic .env loader without dependencies
// Checks for .env.local first (standard for Vite) then .env as fallback
$rootPath = dirname(__DIR__);
$envPath = $rootPath . '/.env.local';

if (!file_exists($envPath)) {
    $envPath = $rootPath . '/.env';
}

if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value, " \t\n\r\0\x0B\"'"); // remove quotes and spaces
            if (!getenv($name)) {
                putenv("$name=$value");
                $_ENV[$name] = $value;
            }
        }
    }
}

// Database configuration for CPanel PostgreSQL using Environment Variables
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'your_database_name');
define('DB_USER', getenv('DB_USER') ?: 'your_database_user');
define('DB_PASS', getenv('DB_PASS') ?: 'your_database_password');
define('DB_PORT', getenv('DB_PORT') ?: '5432');

// Security Key for JWT (Change this to a long random string)
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-very-secret-key-12345');
