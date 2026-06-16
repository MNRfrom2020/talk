<?php
// api/actions.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? null;
if (!$action) sendResponse(['error' => 'Action missing'], 400);

// GET requests don't have JSON body
$json = $_SERVER['REQUEST_METHOD'] === 'POST' ? file_get_contents('php://input') : '';
$data = $json ? json_decode($json, true) : [];

// 🔐 Security Function: Verify user role from request data
function verifyUserRole($request_data, $allowed_roles) {
    // Role comes from frontend, not from database
    $user_role = $request_data['role'] ?? null;
    
    if (!$user_role) {
        error_log("verifyUserRole: No role provided. Request data: " . json_encode($request_data));
        sendResponse(['error' => 'Role not provided'], 400);
    }

    // Debug logging
    error_log("verifyUserRole: Original role = " . json_encode($user_role));
    error_log("verifyUserRole: Allowed roles = " . json_encode($allowed_roles));

    // Handle both string and array roles - check if ANY role matches
    $roles_array = is_array($user_role) ? $user_role : [$user_role];
    $matched = false;
    
    foreach ($roles_array as $role) {
        $role_normalized = strtolower(trim($role));
        error_log("verifyUserRole: Checking role '" . $role_normalized . "'");
        
        if (in_array($role_normalized, $allowed_roles)) {
            $matched = true;
            error_log("verifyUserRole: Match found for role '" . $role_normalized . "'");
            break;
        }
    }

    if (!$matched) {
        error_log("verifyUserRole: FAILED - No matching role found");
        sendResponse([
            'error' => 'Insufficient permissions',
            'your_roles' => $roles_array,
            'normalized_roles' => array_map(function($r) { return strtolower(trim($r)); }, $roles_array),
            'required_roles' => $allowed_roles
        ], 403);
    }

    error_log("verifyUserRole: SUCCESS - Role allowed");
    return true;
}

switch ($action) {
    case 'upsert_listening_history':
        if (!isset($data['user_uid'], $data['podcast_id'])) {
            sendResponse(['error' => 'Missing required fields'], 400);
        }

        try {
            // 🔐 Security Validation - Verify user role from request
            verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

            // First try with ON CONFLICT (requires unique constraint)
            // If constraint doesn't exist, fall back to manual check
            try {
                $sql = "
                    INSERT INTO listening_history (user_id, podcast_id, listened_at, progress_seconds)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT (user_id, podcast_id)
                    DO UPDATE SET
                        listened_at = EXCLUDED.listened_at,
                        progress_seconds = COALESCE(EXCLUDED.progress_seconds, listening_history.progress_seconds)
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['user_uid'],
                    $data['podcast_id'],
                    $data['last_played_at'] ?? date('c'),
                    $data['duration'] ?? null
                ]);
            } catch (\PDOException $e) {
                // If ON CONFLICT fails (no unique constraint), use manual upsert
                if (strpos($e->getMessage(), '42P10') !== false || strpos($e->getMessage(), 'unique') !== false) {
                    error_log("ON CONFLICT failed, using manual upsert: " . $e->getMessage());
                    
                    // Check if record exists
                    $checkSql = "SELECT id FROM listening_history WHERE user_id = ? AND podcast_id = ?";
                    $checkStmt = $pdo->prepare($checkSql);
                    $checkStmt->execute([$data['user_uid'], $data['podcast_id']]);
                    $existing = $checkStmt->fetch();
                    
                    if ($existing) {
                        // Update existing record
                        $updateSql = "
                            UPDATE listening_history 
                            SET listened_at = ?, progress_seconds = COALESCE(?, progress_seconds)
                            WHERE user_id = ? AND podcast_id = ?
                        ";
                        $updateStmt = $pdo->prepare($updateSql);
                        $updateStmt->execute([
                            $data['last_played_at'] ?? date('c'),
                            $data['duration'] ?? null,
                            $data['user_uid'],
                            $data['podcast_id']
                        ]);
                    } else {
                        // Insert new record
                        $insertSql = "
                            INSERT INTO listening_history (user_id, podcast_id, listened_at, progress_seconds)
                            VALUES (?, ?, ?, ?)
                        ";
                        $insertStmt = $pdo->prepare($insertSql);
                        $insertStmt->execute([
                            $data['user_uid'],
                            $data['podcast_id'],
                            $data['last_played_at'] ?? date('c'),
                            $data['duration'] ?? null
                        ]);
                    }
                } else {
                    // Re-throw if it's a different error
                    throw $e;
                }
            }
            sendResponse(['message' => 'Listening history updated']);
        } catch (Exception $e) {
            error_log("Error in upsert_listening_history: " . $e->getMessage());
            sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    // নতুন: ব্যাচে লিসেনিং হিস্ট্রি আপসার্ট করা (দ্রুত সিঙ্কের জন্য)
    case 'upsert_listening_history_batch':
        if (!isset($data['user_uid'], $data['history']) || !is_array($data['history'])) {
            sendResponse(['error' => 'Missing required fields'], 400);
        }

        // 🔐 Security Validation - Verify user role from request
        verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

        $user_uid = $data['user_uid'];
        $history = $data['history'];

        if (empty($history)) {
            sendResponse(['message' => 'No history to sync']);
        }

        // Build batch insert query
        $values = [];
        $params = [];
        $update_sets = [];

        foreach ($history as $index => $item) {
            $values[] = "(?, ?, ?, ?)";
            $params[] = $user_uid;
            $params[] = $item['podcast_id'];
            $params[] = $item['last_played_at'] ?? date('c');
            $params[] = $item['duration'] ?? null;
        }

        $sql = "
            INSERT INTO listening_history (user_id, podcast_id, listened_at, progress_seconds)
            VALUES " . implode(', ', $values) . "
            ON CONFLICT (user_id, podcast_id)
            DO UPDATE SET
                listened_at = EXCLUDED.listened_at,
                progress_seconds = COALESCE(EXCLUDED.progress_seconds, listening_history.progress_seconds)
        ";

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            sendResponse(['message' => 'Listening history batch updated', 'count' => count($history)]);
        } catch (\PDOException $e) {
            // If ON CONFLICT fails, fallback to individual upserts
            if (strpos($e->getMessage(), '42P10') !== false || strpos($e->getMessage(), 'unique') !== false) {
                error_log("Batch ON CONFLICT failed, using individual upserts: " . $e->getMessage());
                $successCount = 0;
                foreach ($history as $item) {
                    try {
                        // Check if exists
                        $checkSql = "SELECT id FROM listening_history WHERE user_id = ? AND podcast_id = ?";
                        $checkStmt = $pdo->prepare($checkSql);
                        $checkStmt->execute([$user_uid, $item['podcast_id']]);
                        $existing = $checkStmt->fetch();
                        
                        if ($existing) {
                            $updateSql = "UPDATE listening_history SET listened_at = ?, progress_seconds = COALESCE(?, progress_seconds) WHERE user_id = ? AND podcast_id = ?";
                            $updateStmt = $pdo->prepare($updateSql);
                            $updateStmt->execute([
                                $item['last_played_at'] ?? date('c'),
                                $item['duration'] ?? null,
                                $user_uid,
                                $item['podcast_id']
                            ]);
                        } else {
                            $insertSql = "INSERT INTO listening_history (user_id, podcast_id, listened_at, progress_seconds) VALUES (?, ?, ?, ?)";
                            $insertStmt = $pdo->prepare($insertSql);
                            $insertStmt->execute([
                                $user_uid,
                                $item['podcast_id'],
                                $item['last_played_at'] ?? date('c'),
                                $item['duration'] ?? null
                            ]);
                        }
                        $successCount++;
                    } catch (\Exception $innerE) {
                        error_log("Failed to upsert history item: " . $innerE->getMessage());
                    }
                }
                sendResponse(['message' => 'Listening history batch updated (manual upsert)', 'count' => $successCount]);
            } else {
                throw $e;
            }
        }
        break;

    // নতুন যোগ করা হলো: Server-Side Merging API
    case 'merge_initial_data':
        if (!isset($data['user_uid'])) {
            sendResponse(['error' => 'Missing user_uid'], 400);
        }

        // 🔐 Security Validation - Verify user role from request
        verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

        $user_uid = $data['user_uid'];
        $history = $data['history'] ?? [];
        $playlists = $data['playlists'] ?? [];
        $favorite_playlist_ids = $data['favorite_playlist_ids'] ?? [];

        $results = ['history_merged' => 0, 'playlists_merged' => 0, 'favorites_merged' => 0, 'errors' => []];

        // 1. Merge History (Batch Upsert Logic)
        if (!empty($history) && is_array($history)) {
            $successCount = 0;
            // Instead of complex batch SQL, simple loop with ON CONFLICT (fallback to manual) for stability during migrations.
            foreach ($history as $item) {
                try {
                    $pid = $item['podcast_id'] ?? $item['id'] ?? null;
                    if (!$pid) continue;

                    $checkSql = "SELECT id FROM listening_history WHERE user_id = ? AND podcast_id = ?";
                    $checkStmt = $pdo->prepare($checkSql);
                    $checkStmt->execute([$user_uid, $pid]);
                    $existing = $checkStmt->fetch();

                    if ($existing) {
                        $updateSql = "UPDATE listening_history SET listened_at = ?, progress_seconds = COALESCE(?, progress_seconds) WHERE user_id = ? AND podcast_id = ?";
                        $updateStmt = $pdo->prepare($updateSql);
                        $updateStmt->execute([
                            $item['last_played_at'] ?? date('c'),
                            $item['duration'] ?? null,
                            $user_uid,
                            $pid
                        ]);
                    } else {
                        $insertSql = "INSERT INTO listening_history (user_id, podcast_id, listened_at, progress_seconds) VALUES (?, ?, ?, ?)";
                        $insertStmt = $pdo->prepare($insertSql);
                        $insertStmt->execute([
                            $user_uid,
                            $pid,
                            $item['last_played_at'] ?? date('c'),
                            $item['duration'] ?? null
                        ]);
                    }
                    $successCount++;
                } catch (\Exception $e) {
                    $results['errors'][] = 'History merge error: ' . $e->getMessage();
                }
            }
            $results['history_merged'] = $successCount;
        }

        // 2. Merge Playlists (Merge or Insert)
        if (!empty($playlists) && is_array($playlists)) {
            $successCount = 0;
            foreach ($playlists as $pl) {
                try {
                    $name = $pl['name'] ?? null;
                    if (!$name) continue;

                    $raw_pids = $pl['podcast_ids'] ?? [];
                    // Ensure valid pg array string
                    $pg_ids = "{" . implode(',', $raw_pids) . "}";

                    $stmt = $pdo->prepare("SELECT id, podcast_ids FROM user_playlists WHERE user_id = ? AND name = ?");
                    $stmt->execute([$user_uid, $name]);
                    $existing = $stmt->fetch();

                    if ($existing) {
                        $existing_ids = parsePgArray($existing['podcast_ids']);
                        $new_ids = array_unique(array_merge($existing_ids, $raw_pids));
                        $merged_pg_ids = "{" . implode(',', $new_ids) . "}";

                        $updateStmt = $pdo->prepare("UPDATE user_playlists SET podcast_ids = ? WHERE id = ?");
                        $updateStmt->execute([$merged_pg_ids, $existing['id']]);
                    } else {
                        $newId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
                        $cover_art = $pl['coverArt'] ?? $pl['cover'] ?? null;
                        
                        $insertStmt = $pdo->prepare("INSERT INTO user_playlists (id, user_id, name, podcast_ids, cover_art, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
                        $insertStmt->execute([$newId, $user_uid, $name, $pg_ids, $cover_art]);
                    }
                    $successCount++;
                } catch (\Exception $e) {
                    $results['errors'][] = 'Playlist merge error: ' . $e->getMessage();
                }
            }
            $results['playlists_merged'] = $successCount;
        }

        // 3. Merge Favorite Predefined Playlists
        if (!empty($favorite_playlist_ids) && is_array($favorite_playlist_ids)) {
            try {
                // Get existing from favorite_playlists table
                $stmt = $pdo->prepare("SELECT podcast_ids FROM favorite_playlists WHERE user_id = ?");
                $stmt->execute([$user_uid]);
                $favRec = $stmt->fetch();
                
                $existing_fav_ids = [];
                if ($favRec && !empty($favRec['podcast_ids'])) {
                    // It's a PG array string like {id1,id2}
                    $existing_fav_ids = parsePgArray($favRec['podcast_ids']);
                }
                
                $merged_ids = array_values(array_unique(array_merge($existing_fav_ids, $favorite_playlist_ids)));
                $pg_ids = "{" . implode(',', $merged_ids) . "}";
                
                $sql = "
                    INSERT INTO favorite_playlists (user_id, podcast_ids, updated_at)
                    VALUES (?, ?, NOW())
                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        podcast_ids = EXCLUDED.podcast_ids,
                        updated_at = NOW()
                ";
                $updateFavStmt = $pdo->prepare($sql);
                $updateFavStmt->execute([$user_uid, $pg_ids]);
                $results['favorites_merged'] = count($merged_ids) - count($existing_fav_ids);
            } catch (\Exception $e) {
                $results['errors'][] = 'Favorites merge error: ' . $e->getMessage();
            }
        }

        sendResponse(['message' => 'Data merged successfully', 'results' => $results]);
        break;

    // নতুন যোগ করা হলো: ইউজারের প্লেলিস্ট সেভ করার জন্য

    case 'save_user_playlist':
        error_log("=== save_user_playlist endpoint reached ===");
        
        $user_uid = $data['user_uid'] ?? null;
        $id = $data['id'] ?? null;
        $name = $data['name'] ?? null;
        $podcast_ids = $data['podcast_ids'] ?? null;
        $cover_art = $data['cover'] ?? $data['cover_art'] ?? null;

        error_log("save_user_playlist: Input data - id=$id, user_uid=$user_uid, name=$name, podcast_ids=" . json_encode($podcast_ids) . ", cover=$cover_art");

        if (!$user_uid) {
            error_log("save_user_playlist: Missing user_uid");
            sendResponse(['error' => 'Missing user_uid'], 400);
        }

        try {
            // 🔐 Security Validation - Verify user role from request
            error_log("save_user_playlist: Verifying user role...");
            verifyUserRole($data, ['super user', 'subscriber', 'contributor']);
            error_log("save_user_playlist: Role verification passed");

            // If ID is provided, this is an UPDATE operation (edit playlist)
            if ($id) {
                error_log("save_user_playlist: UPDATE operation for playlist id=$id");
                
                // Build dynamic update query based on provided fields
                $updateFields = [];
                $params = [];
                
                if ($name !== null) {
                    $updateFields[] = "name = ?";
                    $params[] = $name;
                }
                if ($podcast_ids !== null) {
                    $pg_ids = is_array($podcast_ids) ? "{" . implode(',', $podcast_ids) . "}" : $podcast_ids;
                    $updateFields[] = "podcast_ids = ?";
                    $params[] = $pg_ids;
                }
                if ($cover_art !== null) {
                    $updateFields[] = "cover_art = ?";
                    $params[] = $cover_art;
                }
                
                if (empty($updateFields)) {
                    error_log("save_user_playlist: No fields to update");
                    sendResponse(['message' => 'No changes to update', 'id' => $id]);
                }
                
                $params[] = $id; // WHERE clause parameter
                $sql = "UPDATE user_playlists SET " . implode(', ', $updateFields) . " WHERE id = ? AND user_id = ?";
                $params[] = $user_uid; // Security: ensure user owns this playlist
                
                error_log("save_user_playlist: Update SQL: $sql with params: " . json_encode($params));
                
                $stmt = $pdo->prepare($sql);
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . json_encode($pdo->errorInfo()));
                }
                
                $executed = $stmt->execute($params);
                if (!$executed) {
                    throw new Exception("Execute failed: " . json_encode($stmt->errorInfo()));
                }
                
                $affectedRows = $stmt->rowCount();
                if ($affectedRows === 0) {
                    error_log("save_user_playlist: No rows updated (playlist not found or unauthorized)");
                    sendResponse(['error' => 'Playlist not found or unauthorized'], 404);
                }
                
                error_log("save_user_playlist: Playlist updated successfully, id=$id, rows_affected=$affectedRows");
                sendResponse(['message' => 'Playlist updated', 'id' => $id]);
                
            } else {
                // No ID provided - this is a CREATE or MERGE operation
                error_log("save_user_playlist: CREATE/MERGE operation");
                
                if (!$name) {
                    error_log("save_user_playlist: Missing name for create operation");
                    sendResponse(['error' => 'Missing name for create operation'], 400);
                }
                
                $podcast_ids_array = $podcast_ids ?? [];

                // 🔄 Merge Logic Check - Prevent duplicate playlists
                $stmt = $pdo->prepare("SELECT id, podcast_ids FROM user_playlists WHERE user_id = ? AND name = ?");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . json_encode($pdo->errorInfo()));
                }
                
                $executed = $stmt->execute([$user_uid, $name]);
                if (!$executed) {
                    throw new Exception("Execute failed: " . json_encode($stmt->errorInfo()));
                }
                
                $existing = $stmt->fetch();
                error_log("save_user_playlist: Existing playlist check: " . json_encode($existing));

                if ($existing) {
                    // ✅ MERGE: Combine podcast_ids (no duplicates)
                    $existing_ids = parsePgArray($existing['podcast_ids']);
                    $new_ids = array_unique(array_merge($existing_ids, $podcast_ids_array));
                    $pg_ids = "{" . implode(',', $new_ids) . "}";
                    error_log("save_user_playlist: Merging playlists. Existing: " . json_encode($existing_ids) . ", New: " . json_encode($new_ids));

                    $updateStmt = $pdo->prepare("
                        UPDATE user_playlists
                        SET podcast_ids = ?
                        WHERE id = ?
                    ");
                    if (!$updateStmt) {
                        throw new Exception("Update prepare failed: " . json_encode($pdo->errorInfo()));
                    }
                    
                    $updateExecuted = $updateStmt->execute([$pg_ids, $existing['id']]);
                    if (!$updateExecuted) {
                        throw new Exception("Update execute failed: " . json_encode($updateStmt->errorInfo()));
                    }
                    
                    error_log("save_user_playlist: Playlist merged successfully, id=" . $existing['id']);
                    sendResponse(['message' => 'Playlist merged', 'id' => $existing['id']]);
                } else {
                    // Insert new playlist
                    $newId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
                    $pg_ids = "{" . implode(',', $podcast_ids_array) . "}";
                    error_log("save_user_playlist: Inserting new playlist, id=$newId");

                    $insertStmt = $pdo->prepare("
                        INSERT INTO user_playlists (id, user_id, name, podcast_ids, created_at)
                        VALUES (?, ?, ?, ?, NOW())
                    ");
                    if (!$insertStmt) {
                        throw new Exception("Insert prepare failed: " . json_encode($pdo->errorInfo()));
                    }
                    
                    $insertExecuted = $insertStmt->execute([$newId, $user_uid, $name, $pg_ids]);
                    if (!$insertExecuted) {
                        throw new Exception("Insert execute failed: " . json_encode($insertStmt->errorInfo()));
                    }
                    
                    error_log("save_user_playlist: Playlist inserted successfully, id=$newId");
                    sendResponse(['message' => 'User playlist saved', 'id' => $newId]);
                }
            }
        } catch (\PDOException $e) {
            error_log("PDO Error in save_user_playlist: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendResponse([
                'error' => 'Database error',
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'sqlstate' => $e->errorInfo[0] ?? null,
                'debug' => [
                    'user_uid' => $user_uid,
                    'id' => $id,
                    'name' => $name,
                    'podcast_ids' => $podcast_ids
                ]
            ], 500);
        } catch (\Exception $e) {
            error_log("Fatal error in save_user_playlist: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendResponse([
                'error' => 'Server error',
                'message' => $e->getMessage()
            ], 500);
        }
        break;

    // Save user's favorite playlists (replaces old save_user that used users table)
    case 'save_user':
        $uid = $data['uid'] ?? null;
        $playlists_ids = $data['playlists_ids'] ?? null;
        
        if (!$uid || $playlists_ids === null) {
            sendResponse(['error' => 'Missing uid or playlists_ids'], 400);
        }
        
        try {
            // Save to favorite_playlists table (upsert)
            $pg_ids = '{' . implode(',', $playlists_ids) . '}';
            
            $sql = "
                INSERT INTO favorite_playlists (user_id, podcast_ids, updated_at)
                VALUES (?, ?, NOW())
                ON CONFLICT (user_id)
                DO UPDATE SET
                    podcast_ids = EXCLUDED.podcast_ids,
                    updated_at = NOW()
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$uid, $pg_ids]);
            sendResponse(['message' => 'Favorite playlists updated']);
        } catch (\PDOException $e) {
            // Fallback if ON CONFLICT fails (no unique constraint on user_id)
            if (strpos($e->getMessage(), '42P10') !== false || strpos($e->getMessage(), 'unique') !== false) {
                error_log("ON CONFLICT failed for favorite_playlists, using manual upsert: " . $e->getMessage());
                
                // Check if record exists
                $checkSql = "SELECT user_id FROM favorite_playlists WHERE user_id = ?";
                $checkStmt = $pdo->prepare($checkSql);
                $checkStmt->execute([$uid]);
                $existing = $checkStmt->fetch();
                
                $pg_ids = '{' . implode(',', $playlists_ids) . '}';
                
                if ($existing) {
                    $updateSql = "UPDATE favorite_playlists SET podcast_ids = ?, updated_at = NOW() WHERE user_id = ?";
                    $updateStmt = $pdo->prepare($updateSql);
                    $updateStmt->execute([$pg_ids, $uid]);
                } else {
                    $insertSql = "INSERT INTO favorite_playlists (user_id, podcast_ids, updated_at) VALUES (?, ?, NOW())";
                    $insertStmt = $pdo->prepare($insertSql);
                    $insertStmt->execute([$uid, $pg_ids]);
                }
                sendResponse(['message' => 'Favorite playlists updated (manual upsert)']);
            } else {
                error_log("Error in save_user (favorite_playlists): " . $e->getMessage());
                sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
            }
        }
        break;

    // Get user's favorite playlist IDs
    case 'get_user_favorites':
        // Simple test to verify endpoint is reachable
        error_log("=== get_user_favorites endpoint reached ===");
        
        $uid = $_GET['uid'] ?? null;
        if (!$uid) {
            error_log("get_user_favorites: Missing uid parameter");
            sendResponse(['error' => 'Missing uid', 'debug' => 'uid parameter not provided'], 400);
        }
        
        error_log("get_user_favorites: Loading favorites for user $uid");
        
        try {
            // Verify database connection
            if (!$pdo) {
                throw new Exception("Database connection is null");
            }
            
            // Simple test query to verify DB works
            $testStmt = $pdo->query("SELECT 1 as test");
            if (!$testStmt) {
                throw new Exception("Database connection test failed");
            }
            error_log("get_user_favorites: Database connection OK");
            
            // Main query
            $sql = "SELECT podcast_ids FROM favorite_playlists WHERE user_id = ? LIMIT 1";
            error_log("get_user_favorites: Preparing query");
            
            $stmt = $pdo->prepare($sql);
            if (!$stmt) {
                $errorInfo = $pdo->errorInfo();
                throw new Exception("Prepare failed: " . json_encode($errorInfo));
            }
            
            error_log("get_user_favorites: Executing with uid=$uid");
            $executed = $stmt->execute([$uid]);
            if (!$executed) {
                $errorInfo = $stmt->errorInfo();
                throw new Exception("Execute failed: " . json_encode($errorInfo));
            }
            
            $row = $stmt->fetch();
            error_log("get_user_favorites: Fetched row: " . json_encode($row));
            
            if ($row && isset($row['podcast_ids']) && $row['podcast_ids']) {
                $pgArray = $row['podcast_ids'];
                error_log("get_user_favorites: Raw data type=" . gettype($pgArray) . " value=" . json_encode($pgArray));
                
                if (is_string($pgArray)) {
                    $trimmed = trim($pgArray, '{}');
                    if (empty($trimmed) || $trimmed === '') {
                        error_log("get_user_favorites: Empty array, returning []");
                        sendResponse(['playlist_ids' => [], 'debug' => 'empty array in database']);
                    } else {
                        $ids = explode(',', $trimmed);
                        $ids = array_filter($ids, function($id) { 
                            return !empty(trim($id)); 
                        });
                        $ids = array_values($ids);
                        error_log("get_user_favorites: Parsed " . count($ids) . " IDs");
                        sendResponse(['playlist_ids' => $ids]);
                    }
                } else {
                    error_log("get_user_favorites: Data is not a string, type=" . gettype($pgArray));
                    sendResponse(['playlist_ids' => [], 'debug' => 'unexpected data type']);
                }
            } else {
                error_log("get_user_favorites: No record found or empty result");
                sendResponse(['playlist_ids' => [], 'debug' => 'no favorites found']);
            }
        } catch (\PDOException $e) {
            error_log("PDO Error in get_user_favorites: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendResponse([
                'playlist_ids' => [], 
                'error' => 'Database error',
                'message' => $e->getMessage(),
                'code' => $e->getCode()
            ]);
        } catch (\Exception $e) {
            error_log("Fatal error in get_user_favorites: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendResponse([
                'playlist_ids' => [], 
                'error' => 'Server error',
                'message' => $e->getMessage()
            ]);
        }
        break;

    // ... (বাকি আগের case 'save_podcast', 'delete_record' ঠিক আগের মতোই থাকবে)
    case 'delete_record':
        $table = $data['table'] ?? null;
        $id = $data['id'] ?? null;
        if (!$table || !$id) sendResponse(['error' => 'Table and ID required'], 400);
        $allowedTables = ['podcasts', 'playlists', 'user_playlists'];
        if (!in_array($table, $allowedTables)) sendResponse(['error' => 'Invalid table'], 403);
        $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['message' => 'Record deleted']);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}

// Helper function to parse PostgreSQL array format
function parsePgArray($pgArray) {
    if (is_array($pgArray)) return $pgArray;
    if (!$pgArray || $pgArray === '{}') return [];
    return explode(',', trim($pgArray, '{}'));
}
?>
