import { useEffect, useState } from "react";
import { previewVoice } from "../audio/player";
import { deviceSpeechFollowsSlider } from "../audio/platform";
import { subscribeVoices, type VoiceOption } from "../audio/voices";
import { savePin } from "../data/grownupPin";
import { EXTRA_CHUNKS, LESSON_MINUTES, type Settings, type SpeechSpeed } from "../settings";

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
      <fieldset className="setting-group" data-setting="explore">
        <legend>Show Explore</legend>
        <div className="segment">
          <button
            type="button"
            className={settings.showExplore ? "is-selected" : ""}
            aria-pressed={settings.showExplore}
            onClick={() => onChange({ showExplore: true })}
          >
            On
          </button>
          <button
            type="button"
            className={!settings.showExplore ? "is-selected" : ""}
            aria-pressed={!settings.showExplore}
            onClick={() => onChange({ showExplore: false })}
          >
            Off
          </button>
        </div>
        <p className="adult-copy">On shows the other courses on this device. Off keeps this device on reading only.</p>
      </fieldset>
      <fieldset className="setting-group" data-setting="shared">
        <legend>Shared class iPad</legend>
        <div className="segment">
          <button
            type="button"
            className={settings.sharedDevice ? "is-selected" : ""}
            aria-pressed={settings.sharedDevice}
            onClick={() => onChange({ sharedDevice: true })}
          >
            On
          </button>
          <button
            type="button"
            className={!settings.sharedDevice ? "is-selected" : ""}
            aria-pressed={!settings.sharedDevice}
            onClick={() => onChange({ sharedDevice: false })}
          >
            Off
          </button>
        </div>
        <p className="adult-copy">
          On: switching child asks the grown-up check, so one child cannot open a classmate's profile. Off: a child
          holds their animal for a moment to switch.
        </p>
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
        <p className="adult-copy">Shows the program your child builds in Coding as Python, starting with print("Hello, world!"). It stays off until you turn it on. Children cannot edit it.</p>
      </fieldset>
      <fieldset className="setting-group" data-setting="reading-goal">
        <legend>Lesson length</legend>
        <div className="segment segment-3">
          {LESSON_MINUTES.map((minutes) => (
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
        <p className="adult-copy">
          Minutes of active play before a friendly wrap-up. One star when it is reached. Your child never sees a clock.
        </p>
      </fieldset>
      <fieldset className="setting-group" data-setting="extra-chunks">
        <legend>“One more?” offers</legend>
        <div className="segment segment-4">
          {EXTRA_CHUNKS.map((count) => (
            <button
              key={count}
              type="button"
              className={settings.extraChunks === count ? "is-selected" : ""}
              aria-pressed={settings.extraChunks === count}
              onClick={() => onChange({ extraChunks: count })}
            >
              {count === 0 ? "None" : count}
            </button>
          ))}
        </div>
        <p className="adult-copy">After the lesson or the time is done, how many extra short chunks a day your child may say yes to.</p>
      </fieldset>
      <fieldset className="setting-group">
        <legend>Speech speed</legend>
        <SpeedButtons speed={settings.speed} onChange={(speed) => onChange({ speed })} />
      </fieldset>
      <OnOff
        id="calm"
        legend="Calm mode"
        on={settings.calm}
        onChange={(calm) => onChange({ calm })}
        note="Less motion, softer colors, no confetti, and no loud sounds. Tracing lanes are wider too. Follows the device's reduce-motion setting on its own."
      />
      <OnOff
        id="easier-tracing"
        legend="Easier tracing"
        on={settings.easierTracing}
        onChange={(easierTracing) => onChange({ easierTracing })}
        note="A wider lane for a finger to follow when tracing letters, shapes, and words."
      />
      <OnOff
        id="readable-font"
        legend="Easier-to-read font"
        on={settings.readableFont}
        onChange={(readableFont) => onChange({ readableFont })}
        note="A plainer typeface with open, distinct letters across the whole app."
      />
      <OnOff
        id="letter-spacing"
        legend="Extra letter spacing"
        on={settings.letterSpacing}
        onChange={(letterSpacing) => onChange({ letterSpacing })}
        note="More room between letters and words."
      />
      <OnOff
        id="high-contrast"
        legend="High contrast"
        on={settings.highContrast}
        onChange={(highContrast) => onChange({ highContrast })}
        note="Darker text on plainer backgrounds."
      />
      <PinSetter />
    </>
  );
}

function OnOff({
  id,
  legend,
  on,
  onChange,
  note,
}: {
  id: string;
  legend: string;
  on: boolean;
  onChange: (on: boolean) => void;
  note: string;
}) {
  return (
    <fieldset className="setting-group" data-setting={id}>
      <legend>{legend}</legend>
      <div className="segment">
        <button type="button" className={on ? "is-selected" : ""} aria-pressed={on} onClick={() => onChange(true)}>
          On
        </button>
        <button type="button" className={!on ? "is-selected" : ""} aria-pressed={!on} onClick={() => onChange(false)}>
          Off
        </button>
      </div>
      <p className="adult-copy">{note}</p>
    </fieldset>
  );
}

function PinSetter() {
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <fieldset className="setting-group" data-setting="pin">
      <legend>Grown-up PIN</legend>
      <p className="adult-copy">Four digits. The next grown-up check asks for this PIN. Five wrong tries wait before trying again.</p>
      <input
        className="name-input"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={pin}
        aria-label="New PIN"
        onChange={(event) => {
          setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
          setSaved(false);
        }}
      />
      <button
        type="button"
        className="save-child"
        onClick={() => {
          if (savePin(pin)) setSaved(true);
        }}
      >
        Save PIN
      </button>
      {saved ? <p className="adult-copy">Saved on this device. The digits are not stored.</p> : null}
    </fieldset>
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
