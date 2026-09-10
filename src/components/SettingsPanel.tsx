import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type BindingAction = "Visibility" | "ClickThrough" | "AlternateEmergency" | "Escape";
type Bindings = Record<BindingAction, string>;

const labels: Array<[BindingAction, string]> = [
  ["Visibility", "Visibility"],
  ["ClickThrough", "Click-through"],
  ["AlternateEmergency", "Alternate emergency"],
];

export function SettingsPanel() {
  const [bindings, setBindings] = useState<Bindings | null>(null);
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [nextBindings, nextLaunchAtLogin] = await Promise.all([
        invoke<Bindings>("get_shortcut_bindings"),
        invoke<boolean>("get_launch_at_login"),
      ]);
      setBindings(nextBindings);
      setLaunchAtLogin(nextLaunchAtLogin);
    } catch {
      setBindings(null);
      setLoadError("Settings could not be loaded. Retry to reconnect to nABrush.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const updateBinding = async (action: BindingAction, accelerator: string) => {
    setError("");
    try {
      const next = await invoke<Bindings>("set_shortcut_binding", { action, accelerator });
      setBindings(next);
    } catch (value) {
      const conflict = value as { message?: string; suggestion?: string };
      setError(`${conflict.message ?? "Shortcut could not be registered"}. ${conflict.suggestion ?? "Choose another key."}`);
    }
  };

  return (
    <section aria-label="Settings" className="settings-panel">
      <h1>nABrush Settings</h1>
      {loadError ? (
        <div role="alert" className="settings-load-error">
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadSettings()}>Retry</button>
        </div>
      ) : null}
      {labels.map(([action, label]) => (
        <label key={action}>
          {label}
          <input
            value={bindings?.[action] ?? ""}
            disabled={loading || !bindings}
            onChange={(event) => void updateBinding(action, event.currentTarget.value)}
          />
        </label>
      ))}
      <label>
        Emergency hide
        <input value="Escape (fixed)" disabled readOnly />
      </label>
      <label>
        <input
          type="checkbox"
          checked={launchAtLogin}
          disabled={loading || !bindings}
          onChange={(event) => {
            const enabled = event.currentTarget.checked;
            setLaunchAtLogin(enabled);
            void invoke("set_launch_at_login", { enabled });
          }}
        />
        Launch at login
      </label>
      {error ? <p role="alert" data-error-code="ShortcutConflict">{error}</p> : null}
    </section>
  );
}
