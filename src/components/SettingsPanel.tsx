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
  const [error, setError] = useState("");

  useEffect(() => {
    void invoke<Bindings>("get_shortcut_bindings").then(setBindings);
    void invoke<boolean>("get_launch_at_login").then(setLaunchAtLogin);
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
      {labels.map(([action, label]) => (
        <label key={action}>
          {label}
          <input
            value={bindings?.[action] ?? ""}
            disabled={!bindings}
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
          onChange={(event) => {
            const enabled = event.currentTarget.checked;
            setLaunchAtLogin(enabled);
            void invoke("set_launch_at_login", { enabled });
          }}
        />
        Launch at login
      </label>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
