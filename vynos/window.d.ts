export interface DevWindow extends Window {
  RPC_URL: string,
}

export interface VynosWindow extends Window {
  Vynos: typeof Vynos,
  Raven: any,
}

declare var window: DevWindow & VynosWindow;
