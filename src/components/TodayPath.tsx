import { READING } from "../data/subject";
import type { PlacementSource } from "../data/placement";
import { isReviewDay } from "../data/schedule";
import { dayProgress, todayKey, type ChildProfile, type LessonStep } from "../data/profiles";
import { GoalRing } from "./GoalRing";
import { Hero } from "./Hero";
import { StarIcon } from "./icons";
import { BookMark, EggNest, Hills, PencilMark, ShapesMark, ToyBox } from "./sceneArt";

const stops: { id: LessonStep; label: string; left: string; top: string }[] = [
  { id: "letter", label: "Letters", left: "50%", top: "18%" },
  { id: "draw", label: "Draw", left: "76%", top: "40%" },
  { id: "story", label: "Story", left: "32%", top: "58%" },
  { id: "moment", label: "Colors", left: "64%", top: "80%" },
];

export function TodayPath({
  profile,
  letters,
  placementSource,
  stageId,
  weekIndex,
  onOpen,
  onLeave,
  onLibrary,
  onNest,
  onCloset,
  onStickers,
  goalMinutes,
}: {
  profile: ChildProfile;
  letters: string[];
  placementSource: PlacementSource;
  stageId: string;
  weekIndex: number;
  onOpen: (step: LessonStep) => void;
  onLeave: () => void;
  onLibrary: () => void;
  onNest: () => void;
  onCloset: () => void;
  onStickers: () => void;
  goalMinutes: number;
}) {
  const now = new Date();
  const review = isReviewDay(now);
  const done = dayProgress(profile, now);
  const current = stops.find((stop) => !done[stop.id]) ?? stops[stops.length - 1];
  const letter = (letters[0] ?? "a").toUpperCase();

  return (
    <div
      className="today"
      data-screen="today"
      data-subject={READING}
      data-review={review ? "true" : "false"}
      data-source={placementSource}
      data-stage={stageId}
      data-week={weekIndex}
      data-letters={letters.join("")}
    >
      <div className="today-top">
        <button type="button" className="today-avatar" aria-label="Switch child" onClick={onLeave}>
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </button>
        <div className="today-tools">
          <GoalRing ms={profile.readingMs[todayKey(now)] ?? 0} goalMinutes={goalMinutes} />
          <p className="star-count" data-stars={profile.stars}>
            <StarIcon />
            <span>{profile.stars}</span>
          </p>
        </div>
      </div>
      {review ? <p className="today-review">Review</p> : null}

      <div className="trail">
        <Hills />
        <svg className="trail-dots" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M50 18 C66 26 82 32 76 40 C66 52 40 50 32 58 C24 68 52 72 64 80"
            fill="none"
            stroke="#E4C7A4"
            strokeWidth="2.4"
            strokeDasharray="1.4 2.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {stops.map((stop) => {
          const finished = done[stop.id];
          const active = stop.id === current.id;
          return (
            <button
              key={stop.id}
              type="button"
              className={`trail-stop${active ? " is-current" : ""}${finished ? " is-done" : ""}`}
              style={{ left: stop.left, top: stop.top }}
              data-step={stop.id}
              data-current={active ? "true" : "false"}
              aria-label={stop.label}
              onClick={() => onOpen(stop.id)}
            >
              {stop.id === "letter" ? <span className="trail-letter">{letter}</span> : null}
              {stop.id === "draw" ? <PencilMark /> : null}
              {stop.id === "story" ? <BookMark /> : null}
              {stop.id === "moment" ? <ShapesMark /> : null}
            </button>
          );
        })}
        <span
          className={`trail-animal${current.id === "story" ? " is-right" : ""}`}
          style={{ left: current.left, top: current.top }}
          aria-hidden="true"
        >
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </span>
      </div>

      <div className="today-dock">
        <button type="button" className="dock-button" data-dock="closet" onClick={onCloset}>
          <span className="dock-art dock-dress" aria-hidden="true" />
          <span>Dress up</span>
        </button>
        <button type="button" className="dock-button" data-dock="stickers" onClick={onStickers}>
          <span className="dock-art dock-stickers" aria-hidden="true" />
          <span>Stickers</span>
        </button>
        <button type="button" className="dock-button" data-dock="library" onClick={onLibrary}>
          <span className="dock-art">
            <ToyBox />
          </span>
          <span>Play library</span>
        </button>
        <button type="button" className="dock-button" data-dock="nest" onClick={onNest}>
          <span className="dock-art dock-nest">
            <EggNest />
          </span>
          <span>My Nest</span>
        </button>
      </div>
    </div>
  );
}
