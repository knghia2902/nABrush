import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { DisplayViewport, OverlayMode } from "../types/overlay";

export type RecoveryAction = "Retry" | "OpenSystemSettings";
export type ErrorCode = "ShortcutPermission" | "ShortcutConflict" | "OverlayInitialization" | "SettingsWindowUnavailable" | "NativeController" | "DisplayTopology" | "FullScreenBlocked" | "DisplayPermission";
export type ErrorPayload = {
  code: ErrorCode;
  message: string;
  platformDetail?: string | null;
  persistent?: boolean;
  actions: RecoveryAction[];
  displayId?: string;
  platform?: "macos" | "windows";
};
export const errorHasAction = (error: ErrorPayload, action: RecoveryAction) => error.actions.includes(action);

type Props = { initialError?: ErrorPayload | null; mode?: OverlayMode; viewport?: DisplayViewport };

export const errorCopy = (error: ErrorPayload): string => {
  switch (error.code) {
    case "DisplayTopology":
    case "OverlayInitialization":
      return "Không thể hiển thị lớp phủ trên màn hình này. Kiểm tra chế độ toàn màn hình hoặc quyền hiển thị, rồi chọn “Thử lại lớp phủ”.";
    case "FullScreenBlocked":
      return "Chế độ toàn màn hình này không cho phép lớp phủ. Hãy chuyển sang toàn màn hình không độc quyền hoặc cửa sổ không viền rồi thử lại.";
    case "DisplayPermission":
      if (error.platform === "windows") return "Kiểm tra quyền hiển thị cửa sổ phủ và chế độ toàn màn hình của ứng dụng, rồi thử lại.";
      return "Cho phép nABrush trong Cài đặt hệ thống > Quyền riêng tư & Bảo mật, rồi thử lại.";
    default:
      return error.message;
  }
};

export function ErrorBadge({ initialError = null, mode = "VisibleInteractive", viewport }: Props) {
  const [error, setError] = useState<ErrorPayload | null>(initialError);

  useEffect(() => {
    void invoke<ErrorPayload | null>("get_error_state").then(setError);
    let dispose: (() => void) | undefined;
    void listen<ErrorPayload | null>("error-state-changed", (event) => setError(event.payload)).then((unlisten) => { dispose = unlisten; });
    return () => dispose?.();
  }, []);

  if (!error || mode === "Hidden") return null;
  const displayId = error.displayId ?? viewport?.id;
  return (
    <aside className="error-badge" role="alert" data-scene-excluded="true" data-error-code={error.code} data-display-id={displayId} aria-label="Lỗi lớp phủ">
      <span className="error-badge__message">{errorCopy(error)}</span>
      {error.platformDetail ? <span className="error-badge__detail">{error.platformDetail}</span> : null}
      {errorHasAction(error, "Retry") ? <button type="button" onClick={() => void invoke<boolean>("retry_overlay").then((ok) => ok && setError(null))}>Thử lại lớp phủ</button> : null}
      {errorHasAction(error, "OpenSystemSettings") ? <button type="button" onClick={() => void invoke("open_system_settings")}>Mở Cài đặt hệ thống</button> : null}
    </aside>
  );
}
