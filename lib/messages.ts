export type OverlayItem = {
  tabId: number;
  title: string;
  favIconUrl?: string;
};

export type BgToContent =
  | {
      type: "overlay/show";
      items: OverlayItem[];
      selectedIndex: number;
      heartbeatMs: number;
    }
  | { type: "overlay/update"; selectedIndex: number; heartbeatMs: number }
  | { type: "overlay/hide" };

export type ContentToBg = { type: "cycle/cancel" };
