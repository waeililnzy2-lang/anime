# Anime Discord Bot V1

## Features
- `/anime بحث:<name>` searches your MongoDB anime catalog.
- `/anime-admin` opens the admin panel for junior/senior admins.
- Senior Admin:
  - Add/edit/delete anime.
  - Add/edit/delete episodes.
- Junior Admin:
  - Add episodes only.
- Users:
  - View anime information.
  - Choose an episode.
  - Previous/next navigation.
  - Jump directly to an episode number.
  - Watch button.
- MongoDB Atlas storage.
- Optional admin action logs.

## Setup
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Fill:
   - DISCORD_TOKEN
   - CLIENT_ID
   - GUILD_ID
   - MONGODB_URI
   - JUNIOR_ADMIN_ROLE_ID
   - SENIOR_ADMIN_ROLE_ID
   - LOG_CHANNEL_ID (optional)
4. Run:
   npm install
   npm start

## Important
The bot stores image fields as URLs in V1. Discord modals do not provide a file-upload field, so use a direct image URL. A later version can add a dedicated image upload command or attachment workflow.

The Watch button opens the URL entered for that episode.
