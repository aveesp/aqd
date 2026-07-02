// Hardcoded for now — there's no Angular environment-file setup yet (see
// docs/04-ROADMAP.md). Must match wherever the backend is actually running;
// on this dev machine port 3000/3001 are often already taken by other local
// projects, so the backend gets started with an explicit PORT override.
export const API_BASE_URL = 'http://localhost:3005/api/v1';

// The Socket.IO gateway is mounted on the bare server, not under /api/v1.
export const WS_BASE_URL = 'http://localhost:3005';
