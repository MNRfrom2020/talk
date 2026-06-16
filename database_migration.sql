-- =====================================================
-- MNR Talk Database Migration Script
-- Purpose: Add user_uid column to user_playlists table
--          and set up proper relationships
-- =====================================================

-- 1. Add user_uid column to user_playlists if it doesn't exist
-- This links playlists to users in the database
ALTER TABLE user_playlists 
ADD COLUMN IF NOT EXISTS user_uid UUID REFERENCES users(uid) ON DELETE CASCADE;

-- 2. Add index for faster lookups by user_uid
-- This improves performance when fetching user's playlists
CREATE INDEX IF NOT EXISTS idx_user_playlists_user_uid 
ON user_playlists(user_uid);

-- 3. Add index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_user_playlists_name 
ON user_playlists(name);

-- 4. Add index for created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_user_playlists_created_at 
ON user_playlists(created_at DESC);

-- 5. Ensure podcast_ids is properly typed as UUID array
-- This fixes any type mismatch issues
ALTER TABLE user_playlists 
ALTER COLUMN podcast_ids TYPE UUID[] 
USING CASE 
    WHEN podcast_ids IS NULL THEN '{}'::uuid[]
    WHEN podcast_ids = '{}' THEN '{}'::uuid[]
    ELSE string_to_array(trim(podcast_ids::text, '{}'), ',')::uuid[]
END;

-- 6. Add comment to document the table purpose
COMMENT ON COLUMN user_playlists.user_uid IS 'References the user who owns this playlist';
COMMENT ON COLUMN user_playlists.podcast_ids IS 'Array of podcast UUIDs in this playlist';

-- =====================================================
-- Verification Queries (Run these to check if migration succeeded)
-- =====================================================

-- Check if user_uid column exists
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_playlists' AND column_name = 'user_uid';

-- Check if indexes exist
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'user_playlists';

-- =====================================================
-- Rollback (If you need to undo this migration)
-- =====================================================
-- DROP INDEX IF EXISTS idx_user_playlists_user_uid;
-- DROP INDEX IF EXISTS idx_user_playlists_name;
-- DROP INDEX IF EXISTS idx_user_playlists_created_at;
-- ALTER TABLE user_playlists DROP COLUMN IF EXISTS user_uid;
