export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  // for LiveKit Cloud Sandbox
  sandboxId?: string;
  agentName?: string;
  // RAG configuration
  ragConfig?: {
    collectionName?: string;
    topK?: number;
    metadata?: Record<string, any>;
    // Data entries are stored separately and referenced by collectionName
  };
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'AraQ',
  pageTitle: 'AraQ Voice Agent',
  pageDescription: 'A voice agent built with AraQ',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/lk-logo.svg',
  accent: '#2563eb',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#60a5fa',
  startButtonText: 'Start call',

  // for LiveKit Cloud Sandbox
  sandboxId: undefined,
  agentName: undefined,
  // RAG configuration
  ragConfig: undefined,
};
