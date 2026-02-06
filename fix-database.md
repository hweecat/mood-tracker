# Database Fix Guide

## Issue: Entries not being persisted / RBAC migration needed

### Step 1: Check your current status
Open your browser and go to `http://localhost:3002`. If you see no data, the issue is likely one of:

1. RBAC is enabled but entries aren't linked to your user ID
2. Database path issues
3. Entry creation is failing

### Step 2: Check if entries are being created
1. Create a test mood entry
2. Check the browser console for any errors
3. Check the Network tab for the POST request to `/api/mood`

### Step 3: Migrate existing entries (if needed)

#### Option A: Using the migration API (recommended)
1. Log in to the app
2. Open browser console (F12)
3. Copy and paste this code:

```javascript
fetch('/api/migrate', { method: 'POST' })
  .then(r => r.json())
  .then(r => console.log(r))
```

This will migrate all existing entries to your user ID.

#### Option B: Temporarily disable RBAC
Edit your `.env.local` file:
```
ENABLE_RBAC=false
```

Then restart the server. This will let you see all entries. You can then enable RBAC again.

#### Option C: Manual migration
1. Log in
2. Open browser console
3. Run: `migrateEntries()` (copy from migrate-existing.js)

### Step 4: Verify the fix
1. Refresh the page
2. Your entries should now be visible
3. Test creating a new entry to ensure it persists

### Step 5: Common issues

- **Database file location**: Make sure the app is running from the same directory as mood-tracker.db
- **Permissions**: Ensure the app has write permissions to the database file
- **User ID**: After logging in, your user ID might be different from '1'

### Step 6: Clean up
After migrating, you should remove the migration API:
```bash
rm src/app/api/migrate/route.ts
```

### Debugging
To debug database issues:
1. Temporarily enable database testing endpoint
2. Visit `/api/test-db` to see database status
3. Check browser console for errors