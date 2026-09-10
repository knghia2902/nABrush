import { useEffect, useState } from "react";
import type { OverlayMode } from "../types/overlay";

type Props = { mode: OverlayMode };
export const BADGE_TIMEOUT_MS = 2000;
export const badgeCopy = (mode: OverlayMode) => mode === "VisibleClickThrough" ? "Click-through" : mode === "VisibleInteractive" ? "Drawing" : null;

export function ModeBadge({ mode }: Props) {
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
      aria-label={clickThrough ? "Click-through" : "Drawing"}
      className={`mode-badge ${clickThrough ? "mode-badge--pass-through" : "mode-badge--drawing"}`}
      data-scene-excluded="true"
    >
      {badgeCopy(mode)}
    </div>
  );
}
