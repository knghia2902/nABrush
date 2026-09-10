import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

type OverlayMode = "Hidden" | "VisibleInteractive";

export default function App() {
  const [mode, setMode] = useState<OverlayMode>("Hidden");

  useEffect(() => {
    let dispose: (() => void) | undefined;
    void listen<OverlayMode>("overlay-mode-changed", (event) => {
      setMode(event.payload);
    }).then((unlisten) => {
      dispose = unlisten;
    });
    return () => dispose?.();
  }, []);

  return (
    <main aria-label="nABrush overlay" data-mode={mode}>
      {mode === "VisibleInteractive" ? <span aria-label="Drawing mode" /> : null}
    </main>
  );
}
