# Shared Note Website (Notion-like simple version)

A tiny collaborative text editor website:
- asks password before entering,
- shows last committed text,
- anyone with password can edit,
- clicking **Commit changes** publishes new text to everyone (polling every 2 seconds).

## Run locally

```bash
npm start
```

Open: `http://localhost:3000`

## Password / security notes

- By default, the app accepts password `wnsdud5999@` (because you asked for that).
- Safer setup: set a hashed password in `.env` (`EDITOR_PASSWORD_HASH`) and custom salt.

Generate hash example:

```bash
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('change-this-salt:your-strong-password').digest('hex'))"
```

Then set:

- `PASSWORD_SALT=change-this-salt`
- `EDITOR_PASSWORD_HASH=<generated-hash>`

Other security notes:
- Session cookie is signed (HMAC SHA-256) so users cannot forge login by editing cookie.
- This is a lightweight app; for production use HTTPS and proper user accounts.

## Data storage

- Current document: `data/document.txt`
- Commit log: `data/commits.json`

The latest committed document is what new visitors see after logging in.
