// Electron API 타입 정의 (Next.js에서 사용)
interface ElectronAPI {
  showNotification: (options: {
    title: string;
    body: string;
    icon?: string;
    silent?: boolean;
  }) => void;
  hideWindow: () => void;
  showWindow: () => void;
  platform: string;
  getEnv: (key: string) => string | undefined;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __ELECTRON_API__?: ElectronAPI;
  }
}

export {};

