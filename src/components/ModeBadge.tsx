import { useEffect, useState } from "react";
import type { DisplayViewport, OverlayMode } from "../types/overlay";

type Props = { mode: OverlayMode; viewport?: DisplayViewport };
export const BADGE_TIMEOUT_MS = 2000;
export const badgeCopy = (mode: OverlayMode) => mode === "VisibleClickThrough" ? "Xuyên qua" : mode === "VisibleInteractive" ? "Đang vẽ" : null;

export function ModeBadge({ mode, viewport }: Props) {
  const [visible, setVisible] = useState(mode !== "Hidden");

  useEffect(() => {
    setVisible(mode !== "Hidden");
    if (mode === "Hidden") return;
    const timer = window.setTimeout(() => setVisible(false), BADGE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [mode]);

  if (!visible || mode === "Hidden") return null;
  const clickThrough = mode === "VisibleClickThrough";
  return (
    <div
      role="status"
      aria-label={clickThrough ? "Xuyên qua" : "Đang vẽ"}
      className={`mode-badge ${clickThrough ? "mode-badge--pass-through" : "mode-badge--drawing"}`}
      data-scene-excluded="true"
      data-display-id={viewport?.id}
    >
      {badgeCopy(mode)}
    </div>
  );
}
