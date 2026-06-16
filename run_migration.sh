#!/bin/bash

# =====================================================
# MNR Talk Database Migration Runner
# Usage: ./run_migration.sh
# =====================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting MNR Talk Database Migration...${NC}\n"

# Database configuration
# You can set these via environment variables or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-talk}"
DB_USER="${DB_USER:-postgres}"

# Check if .env.local exists and load variables
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}📄 Loading configuration from .env.local...${NC}"
    export $(grep -E '^DB_' .env.local | xargs)
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-talk}"
    DB_USER="${DB_USER:-postgres}"
fi

echo -e "Database Configuration:"
echo -e "  Host: ${DB_HOST}"
echo -e "  Port: ${DB_PORT}"
echo -e "  Database: ${DB_NAME}"
echo -e "  User: ${DB_USER}\n"

# Check if migration file exists
MIGRATION_FILE="database_migration.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

# Run migration
echo -e "${YELLOW}📝 Running migration...${NC}\n"

# Execute the migration
PGPASSWORD="${DB_PASS:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Migration completed successfully!${NC}\n"
    
    # Run verification queries
    echo -e "${YELLOW}🔍 Verifying migration...${NC}\n"
    
    PGPASSWORD="${DB_PASS:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'user_playlists' 
        AND column_name = 'user_uid';
    "
    
    echo -e "\n${GREEN}Indexes on user_playlists:${NC}"
    PGPASSWORD="${DB_PASS:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'user_playlists';
    "
    
    echo -e "\n${GREEN}✅ All done! Your database is ready.${NC}"
else
    echo -e "\n${RED}❌ Migration failed! Please check the error messages above.${NC}"
    echo -e "${YELLOW}💡 Common issues:${NC}"
    echo -e "   - Database credentials are incorrect"
    echo -e "   - PostgreSQL server is not running"
    echo -e "   - Database doesn't exist"
    echo -e "   - User doesn't have permission to modify tables"
    exit 1
fi
