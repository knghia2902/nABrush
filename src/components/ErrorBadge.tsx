import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type RecoveryAction = "Retry" | "OpenSystemSettings";
export type ErrorPayload = { code: string; message: string; actions: RecoveryAction[] };
export const errorHasAction = (error: ErrorPayload, action: RecoveryAction) => error.actions.includes(action);

type Props = { initialError?: ErrorPayload | null };

export function ErrorBadge({ initialError = null }: Props) {
  const [error, setError] = useState<ErrorPayload | null>(initialError);

  useEffect(() => {
    void invoke<ErrorPayload | null>("get_error_state").then(setError);
    let dispose: (() => void) | undefined;
    void listen<ErrorPayload | null>("error-state-changed", (event) => setError(event.payload)).then((unlisten) => { dispose = unlisten; });
    return () => dispose?.();
  }, []);

  if (!error) return null;
  return (
    <aside className="error-badge" role="status" data-scene-excluded="true" aria-label="Recoverable error">
      <span>{error.message}</span>
      {errorHasAction(error, "Retry") ? <button onClick={() => void invoke<boolean>("retry_overlay").then((ok) => ok && setError(null))}>Retry</button> : null}
      {errorHasAction(error, "OpenSystemSettings") ? <button onClick={() => void invoke("open_system_settings")}>Open System Settings</button> : null}
    </aside>
  );
}
