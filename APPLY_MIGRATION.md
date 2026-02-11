# How to Fix D1 Database Error

The error `no such column: is_free` is happening because the remote database is missing the `is_free` column in the `lessons` table.

## Steps to Fix

1.  **Open Terminal** in the `cloudflare_worker` directory.
2.  **Run the Migration Command:**
    ```powershell
    npx wrangler d1 execute courses_db --file=alter_lessons.sql --remote
    ```
3.  **If you get an Authentication Error:**
    - You may need to refresh your Cloudflare login.
    - Run: `npx wrangler login` and follow the browser prompts.
    - Then run the migration command again.

## Alternative: Cloudflare Dashboard
1.  Log in to the Cloudflare Dashboard.
2.  Go to **Workers & Pages** > **D1**.
3.  Select the `courses_db` database.
4.  Go to the **Console** tab.
5.  Paste and run this SQL command:
    ```sql
    ALTER TABLE lessons ADD COLUMN is_free BOOLEAN DEFAULT 0;
    ```
