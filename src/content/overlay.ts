import overlayCss from "./overlay.css?inline";
import type { OverlayItem } from "../shared/messages";

const HOST_ID = "tab-cycler-overlay-host";

type OverlayHandle = {
  show(items: OverlayItem[], selectedIndex: number): void;
  update(selectedIndex: number): void;
  hide(): void;
};

let handle: OverlayHandle | null = null;

function buildOverlay(): OverlayHandle {
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "0";
  host.style.height = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483647";

  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = overlayCss;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "tc-root";
  root.style.display = "none";
  shadow.appendChild(root);

  const list = document.createElement("ul");
  list.className = "tc-list";
  root.appendChild(list);

  document.documentElement.appendChild(host);

  const render = (items: OverlayItem[], selectedIndex: number) => {
    list.replaceChildren();
    items.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "tc-item" + (idx === selectedIndex ? " tc-selected" : "");
      li.dataset.index = String(idx);

      if (item.favIconUrl) {
        const img = document.createElement("img");
        img.className = "tc-favicon";
        img.src = item.favIconUrl;
        img.alt = "";
        img.addEventListener("error", () => {
          const fb = document.createElement("span");
          fb.className = "tc-favicon-fallback";
          img.replaceWith(fb);
        });
        li.appendChild(img);
      } else {
        const fb = document.createElement("span");
        fb.className = "tc-favicon-fallback";
        li.appendChild(fb);
      }

      const title = document.createElement("span");
      title.className = "tc-title";
      title.textContent = item.title;
      li.appendChild(title);

      list.appendChild(li);
    });
    root.style.display = "block";
    scrollSelectedIntoView(selectedIndex);
  };

  const updateSelection = (selectedIndex: number) => {
    const children = list.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (!(el instanceof HTMLElement)) continue;
      el.classList.toggle("tc-selected", i === selectedIndex);
    }
    scrollSelectedIntoView(selectedIndex);
  };

  const scrollSelectedIntoView = (selectedIndex: number) => {
    const el = list.children[selectedIndex];
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: "nearest" });
    }
  };

  const hide = () => {
    root.style.display = "none";
    list.replaceChildren();
  };

  return {
    show: render,
    update: updateSelection,
    hide,
  };
}

export function getOverlay(): OverlayHandle {
  if (handle) return handle;
  handle = buildOverlay();
  return handle;
}
