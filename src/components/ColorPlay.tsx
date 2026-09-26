import { useEffect, useRef, useState, type PointerEvent } from "react";
import { playColor, playPrompt } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { animalById } from "../data/animals";
import {
  colorFill,
  colorPattern,
  colorPatternLabel,
  colorTitle,
  mixBlobs,
  mixPaints,
  type ColorId,
  type ColorLesson,
  type ColorStep,
} from "../data/colors";
import type { Outfit } from "../data/wardrobe";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

function useSpeaker(settingsRef: { current: Settings }) {
  const playRef = useRef<AbortController | null>(null);
  useEffect(() => () => playRef.current?.abort(), []);
  return {
    stop() {
      playRef.current?.abort();
    },
    color(name: string) {
      playRef.current?.abort();
      const controller = new AbortController();
      playRef.current = controller;
      void playColor(name, settingsRef.current, controller.signal).catch(() => undefined);
    },
    prompt(id: string) {
      playRef.current?.abort();
      const controller = new AbortController();
      playRef.current = controller;
      void playPrompt(id, settingsRef.current, controller.signal).catch(() => undefined);
    },
  };
}

export function ColorSwatch({ name }: { name: string }) {
  const fill = colorFill(name) ?? "var(--paper)";
  const pattern = colorPattern(name);
  return (
    <span className={`color-swatch pattern-${pattern}`} data-color={name} data-pattern={pattern} style={{ backgroundColor: fill }}>
      <span className="color-word">{colorTitle(name)}</span>
      <span className="color-pattern">{colorPatternLabel(name)}</span>
    </span>
  );
}

const board: { id: ColorStep; label: string; name: string }[] = [
  { id: "name", label: "Names", name: "Hear a color" },
  { id: "mix", label: "Mix", name: "Mix paints" },
  { id: "paint", label: "Paint", name: "Paint your animal" },
];

export function ColorBoard({
  lesson,
  done,
  onOpen,
}: {
  lesson: ColorLesson;
  done: Record<string, boolean>;
  onOpen: (step: ColorStep) => void;
}) {
  return (
    <div className="color-board" data-stage={lesson.stageId} data-week={lesson.weekIndex}>
      {board.map((stop) => (
        <button
          key={stop.id}
          type="button"
          className={`color-activity${done[stop.id] ? " is-done" : ""}`}
          data-activity={stop.id}
          aria-label={stop.name}
          onClick={() => onOpen(stop.id)}
        >
          <span className="color-activity-art" aria-hidden="true">
            {stop.id === "name" ? <ColorSwatch name={lesson.hear} /> : null}
            {stop.id === "mix" ? <ColorSwatch name="orange" /> : null}
            {stop.id === "paint" ? <ColorSwatch name="blue" /> : null}
          </span>
          <span>{stop.label}</span>
        </button>
      ))}
    </div>
  );
}

export function NameActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: ColorLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState("");
  const finished = useRef(false);

  const choose = (name: ColorId) => {
    if (finished.current) return;
    speak.color(name);
    if (name !== lesson.hear) {
      setTries((count) => count + 1);
      setFeedback(`That one is ${name}.`);
      return;
    }
    finished.current = true;
    setFeedback(`Yes, ${name}.`);
    onDone(name);
  };

  return (
    <div className="color-play" data-screen="name" data-hear={lesson.hear} data-tries={tries}>
      <h1>Colors</h1>
      <p className="color-prompt">Hear the color, then tap that object.</p>
      <button type="button" className="color-hear" onClick={() => speak.color(lesson.hear)}>
        Hear it
      </button>
      <div className="color-choices" role="group" aria-label="Color objects">
        {lesson.choices.map((name) => (
          <button key={name} type="button" className="color-choice" data-color={name} data-pattern={colorPattern(name)} onClick={() => choose(name)}>
            <span
              className={`color-object pattern-${colorPattern(name)}`}
              style={{ backgroundColor: colorFill(name) }}
              aria-hidden="true"
            />
            <span className="color-word">{colorTitle(name)}</span>
            <span className="color-pattern">{colorPatternLabel(name)}</span>
          </button>
        ))}
      </div>
      <p className="color-feedback" role="status" data-feedback={feedback}>
        {feedback}
      </p>
    </div>
  );
}

export function MixActivity({
  settingsRef,
  onDone,
}: {
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bucketRef = useRef<HTMLDivElement | null>(null);
  const grab = useRef<{ dx: number; dy: number; stageLeft: number; stageTop: number } | null>(null);
  const bucketed = useRef<string[]>([]);
  const travel = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const revealed = useRef(false);
  const [drag, setDrag] = useState<{ color: string; left: number; top: number } | null>(null);
  const [inBucket, setInBucket] = useState<string[]>([]);
  const [result, setResult] = useState("");

  bucketed.current = inBucket;

  const insideBucket = (clientX: number, clientY: number) => {
    const rect = bucketRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  };

  const pointerDown = (event: PointerEvent<HTMLButtonElement>, color: string) => {
    if (inBucket.includes(color) || result) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stage = stageRef.current?.getBoundingClientRect();
    const self = event.currentTarget.getBoundingClientRect();
    if (!stage) return;
    grab.current = {
      dx: event.clientX - self.left,
      dy: event.clientY - self.top,
      stageLeft: stage.left,
      stageTop: stage.top,
    };
    setDrag({ color, left: self.left - stage.left, top: self.top - stage.top });
  };

  const pointerMove = (event: PointerEvent<HTMLButtonElement>, color: string) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || !grab.current) return;
    setDrag({
      color,
      left: event.clientX - grab.current.stageLeft - grab.current.dx,
      top: event.clientY - grab.current.stageTop - grab.current.dy,
    });
  };

  const pointerUp = (event: PointerEvent<HTMLButtonElement>, color: string) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    grab.current = null;
    setDrag(null);
    if (result || !insideBucket(event.clientX, event.clientY)) return;
    setInBucket((current) => {
      if (current.includes(color) || current.length >= 2) return current;
      return [...current, color];
    });
  };

  const stirDown = (event: PointerEvent<HTMLDivElement>) => {
    if (bucketed.current.length < 2 || revealed.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    travel.current = 0;
    last.current = { x: event.clientX, y: event.clientY };
  };

  const stirMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || revealed.current || bucketed.current.length < 2) return;
    if (last.current) {
      travel.current += Math.hypot(event.clientX - last.current.x, event.clientY - last.current.y);
    }
    last.current = { x: event.clientX, y: event.clientY };
    if (travel.current < 80) return;
    const [first, second] = bucketed.current;
    const mixed = mixPaints(first, second);
    if (!mixed) return;
    revealed.current = true;
    setResult(mixed);
    speak.color(mixed);
  };

  return (
    <div className="color-play" data-screen="mix" data-bucket-count={inBucket.length} data-result={result}>
      <h1>Mix</h1>
      <p className="color-prompt">Drag two paints into the bucket, then stir.</p>
      <div className="mix-stage" ref={stageRef}>
        <div className="mix-blobs">
          {mixBlobs.map((color) => {
            if (inBucket.includes(color)) return null;
            const moving = drag?.color === color;
            return (
              <button
                key={color}
                type="button"
                className="paint-blob"
                data-blob={color}
                data-in-bucket="false"
                style={moving ? { position: "absolute", left: drag.left, top: drag.top, zIndex: 3 } : undefined}
                onPointerDown={(event) => pointerDown(event, color)}
                onPointerMove={(event) => pointerMove(event, color)}
                onPointerUp={(event) => pointerUp(event, color)}
                onPointerCancel={(event) => pointerUp(event, color)}
              >
                <ColorSwatch name={color} />
              </button>
            );
          })}
        </div>
        <div
          className="mix-bucket"
          data-bucket
          ref={bucketRef}
          onPointerDown={stirDown}
          onPointerMove={stirMove}
        >
          <span className="bucket-label">Bucket</span>
          <div className="bucket-paints">
            {inBucket.map((color) => (
              <span key={color} className="bucket-blob" data-blob={color} data-in-bucket="true">
                <ColorSwatch name={color} />
              </span>
            ))}
          </div>
          {result ? (
            <div className="mix-result" data-mix-result={result}>
              <ColorSwatch name={result} />
              <p className="mix-said">{colorTitle(result)}</p>
            </div>
          ) : (
            <p className="bucket-hint">{inBucket.length < 2 ? "Drop two colors" : "Stir with your finger"}</p>
          )}
        </div>
      </div>
      {result ? (
        <button type="button" className="done-button" onClick={() => onDone(result)}>
          Keep this color
        </button>
      ) : null}
    </div>
  );
}

export function PaintActivity({
  animal,
  outfit,
  made,
  onDone,
}: {
  animal: AnimalId;
  outfit: Outfit;
  made: string[];
  onDone: (label: string) => void;
}) {
  const [picked, setPicked] = useState("");
  const name = animalById(animal).name;

  return (
    <div className="color-play" data-screen="paint" data-made={made.length} data-tint={picked}>
      <h1>Paint</h1>
      <p className="color-prompt">Color {name} with a paint you mixed.</p>
      <div className="painted-hero" data-animal={animal}>
        <Hero animal={animal} outfit={outfit} />
        {picked ? <span className="paint-wash" style={{ background: colorFill(picked) }} aria-hidden="true" /> : null}
        {picked ? (
          <p className="paint-caption">
            {colorTitle(picked)} · {colorPatternLabel(picked)}
          </p>
        ) : null}
      </div>
      {made.length === 0 ? (
        <p className="color-feedback">Mix two colors first.</p>
      ) : (
        <div className="color-choices" role="group" aria-label="Colors you made">
          {made.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-choice${picked === color ? " is-selected" : ""}`}
              data-color={color}
              data-pattern={colorPattern(color)}
              aria-pressed={picked === color}
              onClick={() => setPicked(color)}
            >
              <ColorSwatch name={color} />
            </button>
          ))}
        </div>
      )}
      <p className="color-note">Saved on this device.</p>
      <button type="button" className="done-button" disabled={!picked} onClick={() => onDone(`${picked} ${name.toLowerCase()}`)}>
        Save to sticker book
      </button>
    </div>
  );
}
