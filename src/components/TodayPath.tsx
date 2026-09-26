import { MODULE_BUILD, MODULE_COLORS, MODULE_NUMBERS, MODULE_SCIENCE, MODULE_TIME, MODULE_WORDS } from "../brand";
import { ColorBoard } from "./ColorPlay";
import { MathBoard } from "./MathPlay";
import { TimeBoard } from "./TimePlay";
import { COLORS, type ColorLesson, type ColorStep } from "../data/colors";
import { MATH, type MathLesson, type MathStep } from "../data/math";
import { TIME, type TimeLesson, type TimeStep } from "../data/timeMoney";
import { BUILD, type BuildActivity } from "../data/engineer";
import { SCIENCE, type ScienceActivity } from "../data/science";
import { READING } from "../data/subject";
import type { PlacementSource } from "../data/placement";
import { isReviewDay } from "../data/schedule";
import { dayProgress, todayKey, type ChildProfile, type LessonStep } from "../data/profiles";
import { practiceTotal } from "../data/reading";
import { sectionVisible } from "../explore/flags";
import { GoalRing } from "./GoalRing";
import { Hero } from "./Hero";
import { StarIcon } from "./icons";
import { EngineerBoard } from "./NestBuild";
import { ScienceBoard } from "./SciencePlay";
import { ModuleMark } from "./ModuleMark";
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
  onGames,
  goalMinutes,
  course,
  onCourse,
  mathLesson,
  onMath,
  colorLesson,
  onColor,
  timeLesson,
  onTime,
  onMoneyPlay,
  onBuild,
  onScience,
  canTraceWord,
  canTraceName,
  onTraceWord,
  onTraceName,
  showExplore,
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
  onGames: () => void;
  goalMinutes: number;
  course: "reading" | "math" | "colors" | "time" | "build" | "science";
  onCourse: (course: "reading" | "math" | "colors" | "time" | "build" | "science") => void;
  mathLesson: MathLesson;
  onMath: (step: MathStep) => void;
  colorLesson: ColorLesson;
  onColor: (step: ColorStep) => void;
  timeLesson: TimeLesson;
  onTime: (step: TimeStep) => void;
  onMoneyPlay: () => void;
  onBuild: (activity: BuildActivity) => void;
  onScience: (activity: ScienceActivity) => void;
  canTraceWord: boolean;
  canTraceName: boolean;
  onTraceWord: () => void;
  onTraceName: () => void;
  showExplore: boolean;
}) {
  const showMath = sectionVisible("math", undefined, showExplore);
  const showColors = sectionVisible("colors", undefined, showExplore);
  const showTime = sectionVisible("time", undefined, showExplore);
  const showBuild = sectionVisible("build", undefined, showExplore);
  const showScience = sectionVisible("science", undefined, showExplore);
  const showGames = sectionVisible("games", undefined, showExplore);
  const shown =
    course === "math" && showMath
      ? "math"
      : course === "colors" && showColors
        ? "colors"
        : course === "time" && showTime
          ? "time"
          : course === "build" && showBuild
            ? "build"
            : course === "science" && showScience
              ? "science"
              : "reading";
  const now = new Date();
  const review = isReviewDay(now);
  const done = dayProgress(profile, now);
  const mathDone = profile.days[todayKey(now)]?.[MATH] ?? {};
  const colorDone = profile.days[todayKey(now)]?.[COLORS] ?? {};
  const timeDone = profile.days[todayKey(now)]?.[TIME] ?? {};
  const current = stops.find((stop) => !done[stop.id]) ?? stops[stops.length - 1];
  const letter = (letters[0] ?? "a").toUpperCase();

  return (
    <div
      className="today"
      data-screen="today"
      data-subject={shown === "math" ? MATH : shown === "colors" ? COLORS : shown === "time" ? TIME : shown === "build" ? BUILD : shown === "science" ? SCIENCE : READING}
      data-review={review ? "true" : "false"}
      data-source={placementSource}
      data-stage={shown === "math" ? mathLesson.stageId : shown === "colors" ? colorLesson.stageId : shown === "time" ? timeLesson.stageId : stageId}
      data-week={weekIndex}
      data-letters={letters.join("")}
    >
      <div className="today-top">
        <button type="button" className="today-avatar" aria-label="Switch child" onClick={onLeave}>
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </button>
        <div className="today-tools">
          <GoalRing ms={practiceTotal(profile)[todayKey(now)] ?? 0} goalMinutes={goalMinutes} />
          <p className="star-count" data-stars={profile.stars}>
            <StarIcon />
            <span>{profile.stars}</span>
          </p>
        </div>
      </div>
      {review && shown === "reading" ? <p className="today-review">Review</p> : null}

      <div className="course-pick" role="group" aria-label="Today">
        <button
          type="button"
          className={`course-button${shown === "reading" ? " is-selected" : ""}`}
          data-course="reading"
          aria-pressed={shown === "reading"}
          aria-label={MODULE_WORDS}
          onClick={() => onCourse("reading")}
        >
          <span className="course-art" aria-hidden="true">
            <ModuleMark name="words" />
          </span>
          <span className="course-name">
            <span className="course-brand">LittleNest</span>
            <span>Words</span>
          </span>
        </button>
        {showMath ? <button
          type="button"
          className={`course-button${shown === "math" ? " is-selected" : ""}`}
          data-course="math"
          aria-pressed={shown === "math"}
          aria-label={MODULE_NUMBERS}
          onClick={() => onCourse("math")}
        >
          <span className="course-art" aria-hidden="true">
            <ModuleMark name="numbers" />
          </span>
          <span className="course-name">
            <span className="course-brand">LittleNest</span>
            <span>Numbers</span>
          </span>
        </button> : null}
        {showColors ? <button
          type="button"
          className={`course-button${shown === "colors" ? " is-selected" : ""}`}
          data-course="colors"
          aria-pressed={shown === "colors"}
          aria-label={MODULE_COLORS}
          onClick={() => onCourse("colors")}
        >
          <span className="course-art" aria-hidden="true">
            <ModuleMark name="colors" />
          </span>
          <span className="course-name">
            <span className="course-brand">LittleNest</span>
            <span>Colors</span>
          </span>
        </button> : null}
        {showTime ? <button
          type="button"
          className={`course-button${shown === "time" ? " is-selected" : ""}`}
          data-course="time"
          aria-pressed={shown === "time"}
          aria-label={MODULE_TIME}
          onClick={() => onCourse("time")}
        >
          <span className="course-art" aria-hidden="true">
            <ModuleMark name="time" />
          </span>
          <span className="course-name">
            <span className="course-brand">LittleNest</span>
            <span>Time & Money</span>
          </span>
        </button> : null}
        {showBuild ? <button
          type="button"
          className={`course-button${shown === "build" ? " is-selected" : ""}`}
          data-course="build"
          aria-pressed={shown === "build"}
          aria-label={MODULE_BUILD}
          onClick={() => onCourse("build")}
        >
          <span className="course-art" aria-hidden="true">
            <ModuleMark name="build" />
          </span>
          <span className="course-name">
            <span className="course-brand">LittleNest</span>
            <span>Build</span>
          </span>
        </button> : null}
        {showScience ? <button
          type="button"
          className={`course-button${shown === "science" ? " is-selected" : ""}`}
          data-course="science"
          aria-pressed={shown === "science"}
          aria-label={MODULE_SCIENCE}
          onClick={() => onCourse("science")}
        >
          <span className="course-art" aria-hidden="true">
            <ModuleMark name="science" />
          </span>
          <span className="course-name">
            <span className="course-brand">LittleNest</span>
            <span>Science</span>
          </span>
        </button> : null}
      </div>

      {shown === "math" ? <MathBoard lesson={mathLesson} done={mathDone} onOpen={onMath} /> : null}
      {shown === "colors" ? <ColorBoard lesson={colorLesson} done={colorDone} onOpen={onColor} /> : null}
      {shown === "time" ? <TimeBoard lesson={timeLesson} done={timeDone} onOpen={onTime} onMoneyPlay={onMoneyPlay} /> : null}
      {shown === "build" ? (
        <EngineerBoard ageRange={profile.ageRange} done={profile.days[todayKey(now)]?.[BUILD] ?? {}} onOpen={onBuild} />
      ) : null}
      {shown === "science" ? (
        <ScienceBoard ageRange={profile.ageRange} done={profile.days[todayKey(now)]?.[SCIENCE] ?? {}} onOpen={onScience} />
      ) : null}

      {shown === "reading" ? <div className="trail">
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
      </div> : null}

      {shown === "reading" ? (
        <div className="trace-practice">
          <button type="button" data-practice="word" disabled={!canTraceWord} onClick={onTraceWord}>
            Trace a word
          </button>
          <button type="button" data-practice="name" disabled={!canTraceName} onClick={onTraceName}>
            Trace my name
          </button>
        </div>
      ) : null}

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
{showGames ? <button type="button" className="dock-button" data-dock="games" onClick={onGames}>
          <span className="dock-art dock-games" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <ellipse cx="32" cy="36" rx="16" ry="20" fill="#FFF6E4" stroke="#E4C7A4" strokeWidth="3" />
            </svg>
          </span>
          <span>Games</span>
        </button> : null}
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
