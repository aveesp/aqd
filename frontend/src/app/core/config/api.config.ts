import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

// The Socket.IO gateway is mounted on the bare server, not under /api/v1.
export const WS_BASE_URL = environment.wsBaseUrl;
