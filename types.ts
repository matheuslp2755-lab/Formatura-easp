export enum AppMode {
  VIEWER = 'VIEWER',
  ADMIN = 'ADMIN',
  LOGIN = 'LOGIN'
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

export interface BroadcastMessage {
  type: 'VIDEO_FRAME' | 'AUDIO_CHUNK' | 'STATUS_UPDATE' | 'COMMENT';
  payload: string | boolean | ChatMessage; // Base64 data, status, or chat object
  timestamp: number;
}

export interface StreamStatus {
  isLive: boolean;
  viewerCount: number;
  aiEnabled: boolean;
}