import { useEffect, useState } from "react";
import { previewVoice } from "../audio/player";
import { deviceSpeechFollowsSlider } from "../audio/platform";
import { subscribeVoices, type VoiceOption } from "../audio/voices";
import type { Settings, SpeechSpeed } from "../settings";

export function SettingsFields({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <>
      <MixRow
        label="Voice"
        on={settings.voice}
        volume={settings.voiceVolume}
        onToggle={(voice) => onChange({ voice })}
        onVolume={(voiceVolume) => onChange({ voiceVolume })}
        note={
          deviceSpeechFollowsSlider()
            ? undefined
            : "Recorded clips follow this slider. The phone's own voice uses the volume buttons."
        }
      />
      <VoiceField settings={settings} onChange={onChange} />
      <MixRow
        label="Effects"
        on={settings.effects}
        volume={settings.effectsVolume}
        onToggle={(effects) => onChange({ effects })}
        onVolume={(effectsVolume) => onChange({ effectsVolume })}
      />
      <MixRow
        label="Music"
        on={settings.music}
        volume={settings.musicVolume}
        onToggle={(music) => onChange({ music })}
        onVolume={(musicVolume) => onChange({ musicVolume })}
      />
      <p className="adult-copy">Music loops are not in the app yet. The switch is ready for them.</p>
      <fieldset className="setting-group" data-mix="taps">
        <legend>Tap sounds & buzz</legend>
        <div className="segment">
          <button
            type="button"
            className={settings.tapFeedback ? "is-selected" : ""}
            aria-pressed={settings.tapFeedback}
            onClick={() => onChange({ tapFeedback: true })}
          >
            On
          </button>
          <button
            type="button"
            className={!settings.tapFeedback ? "is-selected" : ""}
            aria-pressed={!settings.tapFeedback}
            onClick={() => onChange({ tapFeedback: false })}
          >
            Off
          </button>
        </div>
        <p className="adult-copy">A soft tap and a short buzz when a finger presses something. Dragging across a word stays quiet.</p>
      </fieldset>
      <fieldset className="setting-group" data-setting="tips">
        <legend>Show read-together tips</legend>
        <div className="segment">
          <button
            type="button"
            className={settings.showTips ? "is-selected" : ""}
            aria-pressed={settings.showTips}
            onClick={() => onChange({ showTips: true })}
          >
            On
          </button>
          <button
            type="button"
            className={!settings.showTips ? "is-selected" : ""}
            aria-pressed={!settings.showTips}
            onClick={() => onChange({ showTips: false })}
          >
            Off
          </button>
        </div>
        <p className="adult-copy">A short tip for you at a lesson. Your child can keep going without reading it.</p>
      </fieldset>
      <fieldset className="setting-group" data-setting="code">
        <legend>See the real code</legend>
        <div className="segment">
          <button
            type="button"
            className={settings.showCode ? "is-selected" : ""}
            aria-pressed={settings.showCode}
            onClick={() => onChange({ showCode: true })}
          >
            On
          </button>
          <button
            type="button"
            className={!settings.showCode ? "is-selected" : ""}
            aria-pressed={!settings.showCode}
            onClick={() => onChange({ showCode: false })}
          >
            Off
          </button>
        </div>
        <p className="adult-copy">Shows the same Build It program as Python. It stays off until you turn it on. Children cannot edit it.</p>
      </fieldset>
      <fieldset className="setting-group" data-setting="reading-goal">
        <legend>Daily reading goal</legend>
        <div className="segment segment-3">
          {([5, 10, 15] as const).map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={settings.readingGoal === minutes ? "is-selected" : ""}
              aria-pressed={settings.readingGoal === minutes}
              onClick={() => onChange({ readingGoal: minutes })}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <p className="adult-copy">One star when this time is reached. Extra time does not add more stars.</p>
      </fieldset>
      <fieldset className="setting-group">
        <legend>Speech speed</legend>
        <SpeedButtons speed={settings.speed} onChange={(speed) => onChange({ speed })} />
      </fieldset>
    </>
  );
}

function MixRow({
  label,
  on,
  volume,
  onToggle,
  onVolume,
  note,
}: {
  label: string;
  on: boolean;
  volume: number;
  onToggle: (on: boolean) => void;
  onVolume: (volume: number) => void;
  note?: string;
}) {
  const id = `volume-${label.toLowerCase()}`;
  return (
    <fieldset className="setting-group" data-mix={label.toLowerCase()}>
      <legend>{label}</legend>
      <div className="segment">
        <button type="button" className={on ? "is-selected" : ""} aria-pressed={on} onClick={() => onToggle(true)}>
          On
        </button>
        <button type="button" className={!on ? "is-selected" : ""} aria-pressed={!on} onClick={() => onToggle(false)}>
          Off
        </button>
      </div>
      <label className="volume-label" htmlFor={id}>
        Volume
        <input
          id={id}
          className="volume-input"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(event) => onVolume(Number(event.target.value) / 100)}
        />
      </label>
      {note ? <p className="adult-copy">{note}</p> : null}
    </fieldset>
  );
}

function VoiceField({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [options, setOptions] = useState<VoiceOption[]>([]);
  useEffect(() => subscribeVoices(setOptions), []);
  return (
    <fieldset className="setting-group" data-mix="speaking-voice">
      <legend>Speaking voice</legend>
      <div className="voice-row">
        <select
          id="speaking-voice"
          className="voice-select"
          aria-label="Speaking voice"
          value={settings.voiceURI ?? ""}
          onChange={(event) => onChange({ voiceURI: event.target.value || null })}
        >
          <option value="">Best available</option>
          {options.map((option) => (
            <option key={option.voiceURI} value={option.voiceURI}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="button" className="voice-preview" onClick={() => previewVoice(settings)}>
          Preview
        </button>
      </div>
      <p className="adult-copy">Preview uses this phone's voice. Lessons play a recording when one is saved.</p>
    </fieldset>
  );
}

function SpeedButtons({ speed, onChange }: { speed: SpeechSpeed; onChange: (speed: SpeechSpeed) => void }) {
  return (
    <div className="segment">
      <button
        type="button"
        className={speed === "slow" ? "is-selected" : ""}
        aria-pressed={speed === "slow"}
        onClick={() => onChange("slow")}
      >
        Slow
      </button>
      <button
        type="button"
        className={speed === "slower" ? "is-selected" : ""}
        aria-pressed={speed === "slower"}
        onClick={() => onChange("slower")}
      >
        Slower
      </button>
    </div>
  );
}
