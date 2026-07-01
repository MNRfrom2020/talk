<?php
// api/actions.php
require_once 'db.php';

$pdo = getDbConnection();

$action = $_GET['action'] ?? null;
if (!$action) sendResponse(['error' => 'Action missing'], 400);

$json = $_SERVER['REQUEST_METHOD'] === 'POST' ? file_get_contents('php://input') : '';
$data = $json ? json_decode($json, true) : [];

function verifyUserRole($request_data, $allowed_roles) {
    $user_role = $request_data['role'] ?? null;
    
    if (!$user_role) {
        error_log("verifyUserRole: No role provided. Request data: " . json_encode($request_data));
        sendResponse(['error' => 'Role not provided'], 400);
    }

    error_log("verifyUserRole: Original role = " . json_encode($user_role));
    error_log("verifyUserRole: Allowed roles = " . json_encode($allowed_roles));

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

// Helper: Insert podcast items into playlist_items for a user playlist
function insertPlaylistItems($pdo, $playlistId, $podcastIds) {
    if (empty($podcastIds)) return;
    
    $itemSql = "INSERT INTO playlist_items (playlist_id, podcast_id, sort_order) VALUES (?, ?, ?)";
    $itemStmt = $pdo->prepare($itemSql);
    
    foreach ($podcastIds as $index => $podcastId) {
        $itemStmt->execute([$playlistId, $podcastId, $index + 1]);
    }
}

// Helper: Get podcast_ids from playlist_items for a user playlist
function getUserPlaylistPodcastIds($pdo, $playlistId) {
    $stmt = $pdo->prepare("SELECT podcast_id FROM playlist_items WHERE playlist_id = ? ORDER BY sort_order ASC");
    $stmt->execute([$playlistId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

switch ($action) {
    case 'upsert_listening_history':
        if (!isset($data['user_uid'], $data['podcast_id'])) {
            sendResponse(['error' => 'Missing required fields'], 400);
        }

        try {
            verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

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
                if (strpos($e->getMessage(), '42P10') !== false || strpos($e->getMessage(), 'unique') !== false) {
                    error_log("ON CONFLICT failed, using manual upsert: " . $e->getMessage());
                    
                    $checkSql = "SELECT id FROM listening_history WHERE user_id = ? AND podcast_id = ?";
                    $checkStmt = $pdo->prepare($checkSql);
                    $checkStmt->execute([$data['user_uid'], $data['podcast_id']]);
                    $existing = $checkStmt->fetch();
                    
                    if ($existing) {
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
                    throw $e;
                }
            }
            sendResponse(['message' => 'Listening history updated']);
        } catch (Exception $e) {
            error_log("Error in upsert_listening_history: " . $e->getMessage());
            sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    case 'upsert_listening_history_batch':
        if (!isset($data['user_uid'], $data['history']) || !is_array($data['history'])) {
            sendResponse(['error' => 'Missing required fields'], 400);
        }

        verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

        $user_uid = $data['user_uid'];
        $history = $data['history'];

        if (empty($history)) {
            sendResponse(['message' => 'No history to sync']);
        }

        $values = [];
        $params = [];

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
            if (strpos($e->getMessage(), '42P10') !== false || strpos($e->getMessage(), 'unique') !== false) {
                error_log("Batch ON CONFLICT failed, using individual upserts: " . $e->getMessage());
                $successCount = 0;
                foreach ($history as $item) {
                    try {
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Server-Side Merging API
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'merge_initial_data':
        if (!isset($data['user_uid'])) {
            sendResponse(['error' => 'Missing user_uid'], 400);
        }

        verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

        $user_uid = $data['user_uid'];
        $history = $data['history'] ?? [];
        $playlists = $data['playlists'] ?? [];
        $favorite_playlist_ids = $data['favorite_playlist_ids'] ?? [];

        $results = ['history_merged' => 0, 'playlists_merged' => 0, 'favorites_merged' => 0, 'errors' => []];

        // 1. Merge History
        if (!empty($history) && is_array($history)) {
            $successCount = 0;
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

        // 2. Merge Playlists (using junction table)
        if (!empty($playlists) && is_array($playlists)) {
            $successCount = 0;
            foreach ($playlists as $pl) {
                try {
                    $name = $pl['name'] ?? null;
                    if (!$name) continue;

                    $raw_pids = $pl['podcast_ids'] ?? [];

                    $stmt = $pdo->prepare("SELECT id FROM user_playlists WHERE user_id = ? AND name = ?");
                    $stmt->execute([$user_uid, $name]);
                    $existing = $stmt->fetch();

                    if ($existing) {
                        $existing_ids = getUserPlaylistPodcastIds($pdo, $existing['id']);
                        $new_ids = array_values(array_unique(array_merge($existing_ids, $raw_pids)));
                        
                        // Delete existing items and re-insert with updated order
                        $pdo->prepare("DELETE FROM playlist_items WHERE playlist_id = ?")->execute([$existing['id']]);
                        insertPlaylistItems($pdo, $existing['id'], $new_ids);
                    } else {
                        $newId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
                        $cover_art = $pl['coverArt'] ?? $pl['cover'] ?? null;
                        
                        $insertStmt = $pdo->prepare("INSERT INTO user_playlists (id, user_id, name, cover_art, created_at) VALUES (?, ?, ?, ?, NOW())");
                        $insertStmt->execute([$newId, $user_uid, $name, $cover_art]);
                        
                        insertPlaylistItems($pdo, $newId, $raw_pids);
                    }
                    $successCount++;
                } catch (\Exception $e) {
                    $results['errors'][] = 'Playlist merge error: ' . $e->getMessage();
                }
            }
            $results['playlists_merged'] = $successCount;
        }

        // 3. Merge Favorite Predefined Playlists (favorite_playlists table — not migrated)
        if (!empty($favorite_playlist_ids) && is_array($favorite_playlist_ids)) {
            try {
                $stmt = $pdo->prepare("SELECT podcast_ids FROM favorite_playlists WHERE user_id = ?");
                $stmt->execute([$user_uid]);
                $favRec = $stmt->fetch();
                
                $existing_fav_ids = [];
                if ($favRec && !empty($favRec['podcast_ids'])) {
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Save / Create User Playlist (using junction table)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
            error_log("save_user_playlist: Verifying user role...");
            verifyUserRole($data, ['super user', 'subscriber', 'contributor']);
            error_log("save_user_playlist: Role verification passed");

            if ($id) {
                // UPDATE operation (edit playlist metadata)
                error_log("save_user_playlist: UPDATE operation for playlist id=$id");
                
                $updateFields = [];
                $params = [];
                
                if ($name !== null) {
                    $updateFields[] = "name = ?";
                    $params[] = $name;
                }
                if ($cover_art !== null) {
                    $updateFields[] = "cover_art = ?";
                    $params[] = $cover_art;
                }
                
                if (!empty($updateFields)) {
                    $params[] = $id;
                    $sql = "UPDATE user_playlists SET " . implode(', ', $updateFields) . " WHERE id = ? AND user_id = ?";
                    $params[] = $user_uid;
                    
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
                }

                // If podcast_ids provided, replace all items in the junction table
                if ($podcast_ids !== null && is_array($podcast_ids)) {
                    $pdo->prepare("DELETE FROM playlist_items WHERE playlist_id = ?")->execute([$id]);
                    insertPlaylistItems($pdo, $id, $podcast_ids);
                }
                
                error_log("save_user_playlist: Playlist updated successfully, id=$id");
                sendResponse(['message' => 'Playlist updated', 'id' => $id]);
                
            } else {
                // CREATE or MERGE operation
                error_log("save_user_playlist: CREATE/MERGE operation");
                
                if (!$name) {
                    error_log("save_user_playlist: Missing name for create operation");
                    sendResponse(['error' => 'Missing name for create operation'], 400);
                }
                
                $podcast_ids_array = $podcast_ids ?? [];

                $stmt = $pdo->prepare("SELECT id FROM user_playlists WHERE user_id = ? AND name = ?");
                $stmt->execute([$user_uid, $name]);
                $existing = $stmt->fetch();
                error_log("save_user_playlist: Existing playlist check: " . json_encode($existing));

                if ($existing) {
                    // MERGE: Combine podcast_ids (no duplicates) via junction table
                    $existing_ids = getUserPlaylistPodcastIds($pdo, $existing['id']);
                    $new_ids = array_values(array_unique(array_merge($existing_ids, $podcast_ids_array)));
                    
                    $pdo->prepare("DELETE FROM playlist_items WHERE playlist_id = ?")->execute([$existing['id']]);
                    insertPlaylistItems($pdo, $existing['id'], $new_ids);
                    
                    error_log("save_user_playlist: Playlist merged successfully, id=" . $existing['id']);
                    sendResponse(['message' => 'Playlist merged', 'id' => $existing['id']]);
                } else {
                    // Insert new playlist
                    $newId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
                    error_log("save_user_playlist: Inserting new playlist, id=$newId");

                    $insertStmt = $pdo->prepare("
                        INSERT INTO user_playlists (id, user_id, name, created_at)
                        VALUES (?, ?, ?, NOW())
                    ");
                    $insertStmt->execute([$newId, $user_uid, $name]);
                    
                    insertPlaylistItems($pdo, $newId, $podcast_ids_array);
                    
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Add a single podcast to a user playlist (junction table)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'add_to_user_playlist':
        $user_uid = $data['user_uid'] ?? null;
        $playlist_id = $data['playlist_id'] ?? null;
        $podcast_id = $data['podcast_id'] ?? null;

        if (!$user_uid || !$playlist_id || !$podcast_id) {
            sendResponse(['error' => 'Missing user_uid, playlist_id, or podcast_id'], 400);
        }

        try {
            verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

            // Verify ownership
            $check = $pdo->prepare("SELECT id FROM user_playlists WHERE id = ? AND user_id = ?");
            $check->execute([$playlist_id, $user_uid]);
            if (!$check->fetch()) {
                sendResponse(['error' => 'Playlist not found or unauthorized'], 404);
            }

            // Check if already exists
            $existsStmt = $pdo->prepare("SELECT id FROM playlist_items WHERE playlist_id = ? AND podcast_id = ?");
            $existsStmt->execute([$playlist_id, $podcast_id]);
            if ($existsStmt->fetch()) {
                sendResponse(['message' => 'Podcast already in playlist', 'action' => 'already_exists']);
            }

            // Get max sort_order and append
            $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM playlist_items WHERE playlist_id = ?");
            $maxStmt->execute([$playlist_id]);
            $nextOrder = $maxStmt->fetchColumn();

            $insertStmt = $pdo->prepare("INSERT INTO playlist_items (playlist_id, podcast_id, sort_order) VALUES (?, ?, ?)");
            $insertStmt->execute([$playlist_id, $podcast_id, $nextOrder]);

            sendResponse(['message' => 'Podcast added to playlist', 'action' => 'added', 'sort_order' => $nextOrder]);
        } catch (\PDOException $e) {
            error_log("Error in add_to_user_playlist: " . $e->getMessage());
            sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Remove a single podcast from a user playlist (junction table)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'remove_from_user_playlist':
        $user_uid = $data['user_uid'] ?? null;
        $playlist_id = $data['playlist_id'] ?? null;
        $podcast_id = $data['podcast_id'] ?? null;

        if (!$user_uid || !$playlist_id || !$podcast_id) {
            sendResponse(['error' => 'Missing user_uid, playlist_id, or podcast_id'], 400);
        }

        try {
            verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

            // Verify ownership
            $check = $pdo->prepare("SELECT id FROM user_playlists WHERE id = ? AND user_id = ?");
            $check->execute([$playlist_id, $user_uid]);
            if (!$check->fetch()) {
                sendResponse(['error' => 'Playlist not found or unauthorized'], 404);
            }

            $deleteStmt = $pdo->prepare("DELETE FROM playlist_items WHERE playlist_id = ? AND podcast_id = ?");
            $deleteStmt->execute([$playlist_id, $podcast_id]);

            sendResponse(['message' => 'Podcast removed from playlist', 'action' => 'removed']);
        } catch (\PDOException $e) {
            error_log("Error in remove_from_user_playlist: " . $e->getMessage());
            sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Reorder a user playlist (transaction: delete all + bulk insert)
    // Expects: { user_uid, playlist_id, podcast_ids: [ordered ids...] }
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'reorder_user_playlist':
        $user_uid = $data['user_uid'] ?? null;
        $playlist_id = $data['playlist_id'] ?? null;
        $podcast_ids = $data['podcast_ids'] ?? [];

        if (!$user_uid || !$playlist_id) {
            sendResponse(['error' => 'Missing user_uid or playlist_id'], 400);
        }

        try {
            verifyUserRole($data, ['super user', 'subscriber', 'contributor']);

            // Verify ownership
            $check = $pdo->prepare("SELECT id FROM user_playlists WHERE id = ? AND user_id = ?");
            $check->execute([$playlist_id, $user_uid]);
            if (!$check->fetch()) {
                sendResponse(['error' => 'Playlist not found or unauthorized'], 404);
            }

            $pdo->beginTransaction();

            // Delete all existing items
            $pdo->prepare("DELETE FROM playlist_items WHERE playlist_id = ?")->execute([$playlist_id]);

            // Insert with new sort_order
            insertPlaylistItems($pdo, $playlist_id, $podcast_ids);

            $pdo->commit();
            sendResponse(['message' => 'Playlist reordered successfully', 'count' => count($podcast_ids)]);
        } catch (\Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log("Error in reorder_user_playlist: " . $e->getMessage());
            sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Toggle a single playlist ID inside favorite_playlists (NOT migrated, stays as uuid[])
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'toggle_favorite_playlist':
        $uid         = $data['uid']         ?? null;
        $playlist_id = $data['playlist_id'] ?? null;

        if (!$uid || !$playlist_id) {
            sendResponse(['error' => 'Missing uid or playlist_id'], 400);
        }

        try {
            $fetchSql  = "SELECT podcast_ids FROM favorite_playlists WHERE user_id = ?";
            $fetchStmt = $pdo->prepare($fetchSql);
            $fetchStmt->execute([$uid]);
            $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            if ($row === false) {
                $insertSql  = "INSERT INTO favorite_playlists (user_id, podcast_ids, updated_at)
                               VALUES (?, ?::uuid[], NOW())";
                $insertStmt = $pdo->prepare($insertSql);
                $insertStmt->execute([$uid, '{' . $playlist_id . '}']);
                sendResponse(['message' => 'Favorited', 'action' => 'added']);

            } else {
                $currentIds = parsePgArray($row['podcast_ids'] ?? '{}');
                $alreadyIn  = in_array($playlist_id, $currentIds, true);

                if ($alreadyIn) {
                    $updateSql  = "UPDATE favorite_playlists
                                   SET    podcast_ids = array_remove(podcast_ids, ?::uuid),
                                          updated_at  = NOW()
                                   WHERE  user_id = ?";
                    $updateStmt = $pdo->prepare($updateSql);
                    $updateStmt->execute([$playlist_id, $uid]);
                    sendResponse(['message' => 'Unfavorited', 'action' => 'removed']);

                } else {
                    $updateSql  = "UPDATE favorite_playlists
                                   SET    podcast_ids = array_append(podcast_ids, ?::uuid),
                                          updated_at  = NOW()
                                   WHERE  user_id = ?";
                    $updateStmt = $pdo->prepare($updateSql);
                    $updateStmt->execute([$playlist_id, $uid]);
                    sendResponse(['message' => 'Favorited', 'action' => 'added']);
                }
            }
        } catch (\PDOException $e) {
            error_log("Error in toggle_favorite_playlist: " . $e->getMessage());
            sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Toggle a single podcast in the 'Favorites' user_playlist (uses playlist_items)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'toggle_favorite_podcast':
        $uid        = $data['uid']        ?? null;
        $podcast_id = $data['podcast_id'] ?? null;

        if (!$uid || !$podcast_id) {
            sendResponse(['error' => 'Missing uid or podcast_id'], 400);
        }

        try {
            // Step 1: Find or create "Favorites" playlist
            $fetchSql  = "SELECT id FROM user_playlists WHERE user_id = ? AND name = 'Favorites' LIMIT 1";
            $fetchStmt = $pdo->prepare($fetchSql);
            $fetchStmt->execute([$uid]);
            $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            if ($row === false) {
                // No Favorites playlist yet — create it with this podcast
                $newId = sprintf(
                    '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                    mt_rand(0, 0xffff),
                    mt_rand(0, 0x0fff) | 0x4000,
                    mt_rand(0, 0x3fff) | 0x8000,
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
                );
                $insertPlaylist = $pdo->prepare("INSERT INTO user_playlists (id, user_id, name, created_at) VALUES (?, ?, 'Favorites', NOW())");
                $insertPlaylist->execute([$newId, $uid]);
                
                $insertItem = $pdo->prepare("INSERT INTO playlist_items (playlist_id, podcast_id, sort_order) VALUES (?, ?, 1)");
                $insertItem->execute([$newId, $podcast_id]);
                
                sendResponse(['message' => 'Favorited (created Favorites playlist)', 'action' => 'added']);

            } else {
                $rowId = $row['id'];
                
                // Check if podcast is already in playlist_items
                $checkItem = $pdo->prepare("SELECT id FROM playlist_items WHERE playlist_id = ? AND podcast_id = ?");
                $checkItem->execute([$rowId, $podcast_id]);
                $alreadyIn = $checkItem->fetch() !== false;

                if ($alreadyIn) {
                    // Toggle OFF: remove
                    $deleteStmt = $pdo->prepare("DELETE FROM playlist_items WHERE playlist_id = ? AND podcast_id = ?");
                    $deleteStmt->execute([$rowId, $podcast_id]);
                    sendResponse(['message' => 'Unfavorited', 'action' => 'removed']);
                } else {
                    // Toggle ON: append
                    $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM playlist_items WHERE playlist_id = ?");
                    $maxStmt->execute([$rowId]);
                    $nextOrder = $maxStmt->fetchColumn();
                    
                    $insertItem = $pdo->prepare("INSERT INTO playlist_items (playlist_id, podcast_id, sort_order) VALUES (?, ?, ?)");
                    $insertItem->execute([$rowId, $podcast_id, $nextOrder]);
                    sendResponse(['message' => 'Favorited', 'action' => 'added']);
                }
            }
        } catch (\PDOException $e) {
            error_log("Error in toggle_favorite_podcast: " . $e->getMessage());
            sendResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Save favorite playlists (favorite_playlists table — NOT migrated, stays as uuid[])
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'save_user':
        $uid = $data['uid'] ?? null;
        $playlists_ids = $data['playlists_ids'] ?? null;
        
        if (!$uid || $playlists_ids === null) {
            sendResponse(['error' => 'Missing uid or playlists_ids'], 400);
        }
        
        try {
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
            if (strpos($e->getMessage(), '42P10') !== false || strpos($e->getMessage(), 'unique') !== false) {
                error_log("ON CONFLICT failed for favorite_playlists, using manual upsert: " . $e->getMessage());
                
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Get user's favorite playlist IDs (favorite_playlists — NOT migrated)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    case 'get_user_favorites':
        error_log("=== get_user_favorites endpoint reached ===");
        
        $uid = $_GET['uid'] ?? null;
        if (!$uid) {
            error_log("get_user_favorites: Missing uid parameter");
            sendResponse(['error' => 'Missing uid', 'debug' => 'uid parameter not provided'], 400);
        }
        
        error_log("get_user_favorites: Loading favorites for user $uid");
        
        try {
            if (!$pdo) {
                throw new Exception("Database connection is null");
            }
            
            $testStmt = $pdo->query("SELECT 1 as test");
            if (!$testStmt) {
                throw new Exception("Database connection test failed");
            }
            error_log("get_user_favorites: Database connection OK");
            
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

    case 'delete_record':
        $table = $data['table'] ?? null;
        $id = $data['id'] ?? null;
        if (!$table || !$id) sendResponse(['error' => 'Table and ID required'], 400);
        $allowedTables = ['podcasts', 'playlists', 'user_playlists'];
        if (!in_array($table, $allowedTables)) sendResponse(['error' => 'Invalid table'], 403);
        
        // If deleting a playlist, junction items cascade via ON DELETE CASCADE
        $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['message' => 'Record deleted']);
        break;

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}

function parsePgArray($pgArray) {
    if (is_array($pgArray)) return $pgArray;
    if (!$pgArray || $pgArray === '{}') return [];
    return explode(',', trim($pgArray, '{}'));
}
?>
