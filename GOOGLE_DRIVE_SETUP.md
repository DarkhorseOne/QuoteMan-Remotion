# Google Drive Sync Setup

To enable Google Drive sync, you need to set up OAuth credentials.

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the **Google Drive API**.
4. Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
   - Application type: **Desktop app**.
   - Name: "QuoteMan Sync".
5. Download the JSON file and save it as `credentials.json` in the root of this project (`/Users/nickma/Develop/darkhorseone/system/QuoteMan-Remotion`).

## Usage

When you run the sync for the first time (via Dashboard or script), it will prompt you to authorize the app in your browser and give you a code (or token).
The script expects a `token.json` for subsequent runs.
Since `scripts/05_sync_drive.ts` is running on a server/headless environment usually, the first run needs to happen interactively to generate `token.json`.

**Run this once manually to authorize:**

```bash
npx tsx scripts/05_sync_drive.ts
```

Follow the instructions in the terminal.

## Dashboard

Start the dashboard:

```bash
npm run dashboard
```

Go to [http://localhost:3000](http://localhost:3000).
