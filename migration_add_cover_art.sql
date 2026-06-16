-- =====================================================
-- Migration: Add cover_art column to user_playlists
-- Purpose: Allow user playlists to have custom cover images
-- =====================================================

-- Add cover_art column if it doesn't exist
ALTER TABLE user_playlists
ADD COLUMN IF NOT EXISTS cover_art TEXT;

-- Add index for cover_art (optional, for faster queries)
CREATE INDEX IF NOT EXISTS idx_user_playlists_cover_art
ON user_playlists(cover_art)
WHERE cover_art IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN user_playlists.cover_art IS 'Custom cover image URL for the playlist';

-- =====================================================
-- Verification Query
-- =====================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'user_playlists' AND column_name = 'cover_art';
--
-- Expected result: cover_art | text | YES
