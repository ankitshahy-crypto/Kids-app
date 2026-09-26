import { useEffect, useRef } from "react";
import type { Settings, SpeechSpeed } from "../settings";

export function SettingsSheet({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setSpeed = (speed: SpeechSpeed) => onChange({ speed });

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="settings-title">Settings</h2>
        <p className="settings-note">Saved on this device only.</p>

        <fieldset className="setting-group">
          <legend>Sound</legend>
          <div className="segment">
            <button
              type="button"
              className={settings.sound ? "is-selected" : ""}
              aria-pressed={settings.sound}
              onClick={() => onChange({ sound: true })}
            >
              On
            </button>
            <button
              type="button"
              className={!settings.sound ? "is-selected" : ""}
              aria-pressed={!settings.sound}
              onClick={() => onChange({ sound: false })}
            >
              Off
            </button>
          </div>
        </fieldset>

        <fieldset className="setting-group">
          <legend>Speech speed</legend>
          <div className="segment">
            <button
              type="button"
              className={settings.speed === "slow" ? "is-selected" : ""}
              aria-pressed={settings.speed === "slow"}
              onClick={() => setSpeed("slow")}
            >
              Slow
            </button>
            <button
              type="button"
              className={settings.speed === "slower" ? "is-selected" : ""}
              aria-pressed={settings.speed === "slower"}
              onClick={() => setSpeed("slower")}
            >
              Slower
            </button>
          </div>
        </fieldset>

        <button ref={closeRef} type="button" className="done-button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
