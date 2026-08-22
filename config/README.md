# config/

This folder holds sensitive configuration files that are **not committed to git**.

## service-account.json

The Google Service Account key file for the Spreadsheet Routine Intake feature.

**How to obtain:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → your project
2. Navigate to **APIs & Services → Credentials → Service Accounts**
3. Open the service account → **Keys** tab → **Add Key → Create new key → JSON**
4. Download the file and save it here as `service-account.json`
5. Share your Google Spreadsheet with the service account email  
   (visible in the JSON as `"client_email"`) — grant **Viewer** access

**The file structure looks like:**
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "client_email": "classconnect-intake@....iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

> ⚠️ **Never commit `service-account.json` to git.** It is already in `.gitignore`.
