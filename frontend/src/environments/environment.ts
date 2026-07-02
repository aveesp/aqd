// Development defaults. On this dev machine ports 3000/3001 are often
// already taken by other local projects, so the backend gets started with
// an explicit PORT override — keep this in sync with however you actually
// run `npm run start:dev` in backend/.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3005/api/v1',
  // The Socket.IO gateway is mounted on the bare server, not under /api/v1.
  wsBaseUrl: 'http://localhost:3005',
};
