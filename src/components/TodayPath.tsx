import { MODULE_BUILD, MODULE_CODE, MODULE_COLORS, MODULE_NUMBERS, MODULE_SCIENCE, MODULE_TIME } from "../brand";
import { ColorBoard } from "./ColorPlay";
import { MathBoard } from "./MathPlay";
import { TimeBoard } from "./TimeGames";
import { COLORS, type ColorLesson, type ColorStep } from "../data/colors";
import { MATH, type MathLesson, type MathStep } from "../data/math";
import { TIME, type MoneyGame, type TimeLesson, type TimeStep } from "../data/timeMoney";
import { BUILD, type BuildActivity } from "../data/engineer";
import { SCIENCE, type ScienceActivity } from "../data/science";
import { READING } from "../data/subject";
import type { PlacementSource } from "../data/placement";
import { isReviewDay } from "../data/schedule";
import type { ExploreArea } from "../purchase/access";
import { isUnit, unitLabel } from "../data/units";
import { dayProgress, todayKey, type ChildProfile, type LessonStep } from "../data/profiles";
import { practiceTotal } from "../data/reading";
import { sectionVisible } from "../explore/flags";
import { GoalRing } from "./GoalRing";
import { Hero } from "./Hero";
import { Chevron, StarIcon } from "./icons";
import { EngineerBoard } from "./NestBuild";
import { ScienceBoard } from "./ScienceGames";
import { LockBadge } from "./LockBadge";
import { ModuleMark } from "./ModuleMark";
import { BookMark, EggNest, Hills, PaintMark, PencilMark, ToyBox } from "./sceneArt";
import { HoldButton } from "./HoldButton";

const stops: { id: LessonStep; label: string; left: string; top: string }[] = [
  { id: "letter", label: "Letters", left: "50%", top: "18%" },
  { id: "draw", label: "Draw", left: "76%", top: "40%" },
  { id: "story", label: "Story", left: "32%", top: "58%" },
  { id: "moment", label: "Colors", left: "64%", top: "80%" },
];

/** The name at the top of each Explore section's page: the same word its tile shows. */
const SECTION_TITLE: Record<"math" | "colors" | "time" | "build" | "science", string> = {
  math: "Numbers",
  colors: "Colors",
  time: "Time & Money",
  build: "Build",
  science: "Science",
};

export function TodayPath({
  profile,
  letters,
  focus,
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
  onCode,
  dayKey,
  switchNeedsGrownup,
  onSoundGame,
  onSurprise,
  goalMinutes,
  course,
  onCourse,
  mathLesson,
  onMath,
  colorLesson,
  onColor,
  timeLesson,
  onTime,
  onMoney,
  onBuild,
  onScience,
  canTraceWord,
  canTraceName,
  onTraceWord,
  onTraceName,
  showExplore,
  lockedActivity,
  held = false,
  onHeld,
}: {
  profile: ChildProfile;
  letters: string[];
  /** "This week: M and A": what the reading lesson is about, in words for a grown-up. */
  focus?: string;
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
  /** Opens the coding games. */
  onCode: () => void;
  /** Today's local date. A new value re-renders the path on a new day. */
  dayKey?: string;
  /** A shared class iPad: the avatar opens the grown-up check on a tap instead of a long press. */
  switchNeedsGrownup?: boolean;
  /** Fridays: the sound game. Absent when there are too few sounds yet. */
  onSoundGame?: () => void;
  onSurprise: () => void;
  goalMinutes: number;
  course: "reading" | "math" | "colors" | "time" | "build" | "science";
  onCourse: (course: "reading" | "math" | "colors" | "time" | "build" | "science") => void;
  mathLesson: MathLesson;
  onMath: (step: MathStep) => void;
  colorLesson: ColorLesson;
  onColor: (step: ColorStep) => void;
  timeLesson: TimeLesson;
  onTime: (step: TimeStep) => void;
  onMoney: (game: MoneyGame) => void;
  onBuild: (activity: BuildActivity) => void;
  onScience: (activity: ScienceActivity) => void;
  canTraceWord: boolean;
  canTraceName: boolean;
  onTraceWord: () => void;
  onTraceName: () => void;
  showExplore: boolean;
  /** Explore activities that open with the full app. */
  lockedActivity?: (area: ExploreArea, id: string) => boolean;
  /** The child is past the free weeks, so the lesson replays the last free week. */
  held?: boolean;
  onHeld?: () => void;
}) {
  const showMath = sectionVisible("math", undefined, showExplore);
  const showColors = sectionVisible("colors", undefined, showExplore);
  const showTime = sectionVisible("time", undefined, showExplore);
  const showBuild = sectionVisible("build", undefined, showExplore);
  const showScience = sectionVisible("science", undefined, showExplore);
  const showGames = sectionVisible("games", undefined, showExplore);
  // The play library is not built yet. It stays out of the dock until it is.
  const showLibrary = false;
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
  // The Letters stop shows the week's first letter, or a sound unit as it is written: "sh", "a-e".
  const first = letters[0] ?? "a";
  const letter = isUnit(first) ? unitLabel(first) : first.toUpperCase();
  const finishedCount = stops.filter((stop) => done[stop.id]).length;
  const left = stops.length - finishedCount;
  const strip = left === 0 ? "All done today!" : finishedCount === 0 ? `${left} more!` : `${finishedCount} of ${stops.length} · ${left} more!`;

  return (
    <div
      className={`today${shown === "reading" ? "" : " is-section"}`}
      data-screen="today"
      data-subject={shown === "math" ? MATH : shown === "colors" ? COLORS : shown === "time" ? TIME : shown === "build" ? BUILD : shown === "science" ? SCIENCE : READING}
      data-review={review ? "true" : "false"}
      data-day={dayKey ?? todayKey(now)}
      data-source={placementSource}
      data-stage={shown === "math" ? mathLesson.stageId : shown === "colors" ? colorLesson.stageId : shown === "time" ? timeLesson.stageId : stageId}
      data-week={weekIndex}
      data-letters={letters.join("")}
    >
      <div className="today-top">
        {/* An Explore section (Numbers, Science and the rest) opens as its own page, so it has the same Back
            button, in the same corner, as every lesson and game. Before, the only way back to the reading
            path was the small "READING" pill, which nobody on the first phone test read as a way out. */}
        {shown !== "reading" ? (
          <button type="button" className="back-button" aria-label="Back" data-course="reading" data-section-back onClick={() => onCourse("reading")}>
            <span className="gear-face">
              <Chevron direction="left" />
            </span>
          </button>
        ) : switchNeedsGrownup ? (
          <button type="button" className="today-avatar" aria-label="Switch child" onClick={onLeave}>
            <Hero animal={profile.animal} outfit={profile.outfit} />
          </button>
        ) : (
          <HoldButton className="today-avatar" label="Switch child" onHold={onLeave}>
            <Hero animal={profile.animal} outfit={profile.outfit} />
          </HoldButton>
        )}
        <div className="today-tools">
          <GoalRing ms={practiceTotal(profile)[todayKey(now)] ?? 0} goalMinutes={goalMinutes} />
          <p className="star-count" data-stars={profile.stars}>
            <StarIcon />
            <span>{profile.stars}</span>
          </p>
        </div>
      </div>
      {/* The week's letters, in words. The path showed only the first one (a lone M), and "Review" on a
          Friday said nothing about which letters; the first phone test asked for the two letters to be plain. */}
      {shown === "reading" && focus ? (
        <p className="today-review today-focus" data-week-focus>
          {focus}
        </p>
      ) : review && shown === "reading" ? (
        <p className="today-review">Review</p>
      ) : null}

      <div className="today-body">
        <section className="lesson">
          <div className="lesson-head">
            {shown === "reading" ? (
              <button
                type="button"
                className="pilot-label is-selected"
                data-area="pilot"
                data-course="reading"
                aria-pressed="true"
                onClick={() => onCourse("reading")}
              >
                Reading
              </button>
            ) : (
              // The page says which section it is. The pill used to read "READING" on the Science page.
              <h1 className="section-title" data-section-title={shown}>
                {SECTION_TITLE[shown]}
              </h1>
            )}
            {shown === "reading" ? (
              <p className="chunk-strip" data-done={finishedCount} data-left={left} aria-live="polite">
                {strip}
              </p>
            ) : null}
            {shown === "reading" && held ? (
              <button type="button" className="held-note" data-held="true" aria-label="Ask a grown-up" onClick={onHeld}>
                <LockBadge />
              </button>
            ) : null}
          </div>

          {shown === "reading" ? (
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
              {stop.id === "letter" ? (
                <span className={`trail-letter${letter.length > 1 ? " is-unit" : ""}`}>{letter}</span>
              ) : null}
              {stop.id === "draw" ? <PencilMark /> : null}
              {stop.id === "story" ? <BookMark /> : null}
              {stop.id === "moment" ? <PaintMark /> : null}
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
          ) : null}

          {shown === "reading" ? (
            <div className="trace-practice">
              {canTraceWord ? (
                <button type="button" data-practice="word" onClick={onTraceWord}>
                  Trace a word
                </button>
              ) : null}
              {canTraceName ? (
                <button type="button" data-practice="name" onClick={onTraceName}>
                  Trace my name
                </button>
              ) : null}
              {review && onSoundGame ? (
                <button type="button" data-practice="sounds" onClick={onSoundGame}>
                  Sound game
                </button>
              ) : null}
            </div>
          ) : null}

          {shown === "math" ? <MathBoard lesson={mathLesson} done={mathDone} onOpen={onMath} locked={(id) => lockedActivity?.("math", id) ?? false} /> : null}
          {shown === "colors" ? <ColorBoard lesson={colorLesson} done={colorDone} onOpen={onColor} locked={(id) => lockedActivity?.("colors", id) ?? false} /> : null}
          {shown === "time" ? <TimeBoard
              lesson={timeLesson}
              done={timeDone}
              onOpen={onTime}
              onMoney={onMoney}
              locked={(id) => lockedActivity?.("time", id) ?? false}
              moneyLocked={(id) => lockedActivity?.("money", id) ?? false}
            /> : null}
          {shown === "build" ? (
            <EngineerBoard ageRange={profile.ageRange} done={profile.days[todayKey(now)]?.[BUILD] ?? {}} onOpen={onBuild} locked={(id) => lockedActivity?.("build", id) ?? false} />
          ) : null}
          {shown === "science" ? (
            <ScienceBoard ageRange={profile.ageRange} done={profile.days[todayKey(now)]?.[SCIENCE] ?? {}} onOpen={onScience} locked={(id) => lockedActivity?.("science", id) ?? false} />
          ) : null}
        </section>

        {/* A section's page holds that section only: its name, Back, and its activities. The Explore tiles and
            the dock belong to the home screen. Left on a section's page they pushed its activities off a
            sideways tablet, and gave a child six other things to tap on a page with no way back. */}
        {shown === "reading" && (showMath || showColors || showTime || showBuild || showScience || showGames) ? (
          <section className="explore-area" data-area="explore">
            <div className="explore-head">
              <h2>Explore</h2>
              <p className="explore-tag">New – try it!</p>
            </div>
            {/* Each tile opens its section's page. (They were toggles that swapped the board above them, with
                one shown as pressed; a tile is a plain door now.) */}
            <div className="course-pick" role="group" aria-label="Explore">
              {showMath ? (
                <button
                  type="button"
                  className="course-button"
                  data-course="math"
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
                </button>
              ) : null}
              {showColors ? (
                <button
                  type="button"
                  className="course-button"
                  data-course="colors"
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
                </button>
              ) : null}
              {showTime ? (
                <button
                  type="button"
                  className="course-button"
                  data-course="time"
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
                </button>
              ) : null}
              {showBuild ? (
                <button
                  type="button"
                  className="course-button"
                  data-course="build"
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
                </button>
              ) : null}
              {showScience ? (
                <button
                  type="button"
                  className="course-button"
                  data-course="science"
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
                </button>
              ) : null}
              {/* Coding has its own tile. Its games were only reachable from the bottom of the Games list, and
                  the first phone test did not find them ("I see build but don't see coding"). */}
              {showGames ? (
                <button type="button" className="course-button" data-course="code" aria-label={MODULE_CODE} onClick={onCode}>
                  <span className="course-art" aria-hidden="true">
                    <ModuleMark name="code" />
                  </span>
                  <span className="course-name">
                    <span className="course-brand">LittleNest</span>
                    <span>Coding</span>
                  </span>
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {shown === "reading" ? (
      <div className="today-dock">
        <button type="button" className="dock-button" data-dock="closet" onClick={onCloset}>
          <span className="dock-art dock-dress" aria-hidden="true" />
          <span>Dress up</span>
        </button>
        <button type="button" className="dock-button" data-dock="stickers" onClick={onStickers}>
          <span className="dock-art dock-stickers" aria-hidden="true" />
          <span>Stickers</span>
        </button>
        {showLibrary ? (
          <button type="button" className="dock-button" data-dock="library" onClick={onLibrary}>
            <span className="dock-art">
              <ToyBox />
            </span>
            <span>Play library</span>
          </button>
        ) : null}
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
        <button type="button" className="dock-button" data-dock="surprise" onClick={onSurprise}>
          <span className="dock-art dock-surprise" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="12" y="28" width="40" height="26" rx="6" fill="#F6C3CB" />
              <rect x="8" y="20" width="48" height="12" rx="5" fill="#F4A9B8" />
              <rect x="29" y="20" width="6" height="34" fill="#FFF6E4" />
              <path d="M32 20c-6-10-16-8-14-2 2 4 8 4 14 2Zm0 0c6-10 16-8 14-2-2 4-8 4-14 2Z" fill="#E07A8A" />
            </svg>
          </span>
          <span>Surprise</span>
        </button>
      </div>
      ) : null}
    </div>
  );
}
