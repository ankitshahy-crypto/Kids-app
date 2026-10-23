import { lazy, Suspense } from "react";
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
import { EngineerBoard } from "./BuildGames";
import { LockBadge } from "./LockBadge";
import { artOf } from "../avatars";
import { BasketNest, WovenNest } from "./sceneArt";
import { BookLine, DropsLine, EggMark, ExploreMark, NestMark, PencilLine, SmileLine, StarMark } from "./TodayMarks";

import { HoldButton } from "./HoldButton";

/** Science games load on demand so they split into their own chunk. */
const ScienceBoard = lazy(() => import("./ScienceGames").then((mod) => ({ default: mod.ScienceBoard })));

const stops: { id: LessonStep; label: string }[] = [
  { id: "letter", label: "Letters" },
  { id: "draw", label: "Draw" },
  { id: "story", label: "Story" },
  { id: "moment", label: "Colors" },
];

/** The name at the top of each Explore section's page: the same word its tile shows. */
const SECTION_TITLE: Record<"math" | "colors" | "time" | "build" | "science", string> = {
  math: "Numbers",
  colors: "Colors",
  time: "Time & Money",
  build: "Build",
  science: "Science",
};

/** A finished stop's tick, on its shoulder. */
function Tick() {
  return (
    <span className="trail-done" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="m6.5 12.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function TodayPath({
  profile,
  letters,
  focus,
  placementSource,
  stageId,
  weekIndex,
  onOpen,
  onLeave,
  onNest,
  onStickers,
  onGames,
  onCode,
  dayKey,
  switchNeedsGrownup,
  onSoundGame,
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
  /** My Nest: the animal's home, where Dress up and the Surprise are too. */
  onNest: () => void;
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
  // How far the day has got: on the page for the tests and a screen reader, not as a line of text. The
  // "4 more!" strip under Start is gone, as the mockup has it; a finished stop still has its tick.
  const finishedCount = stops.filter((stop) => done[stop.id]).length;
  const left = stops.length - finishedCount;
  // The child's animal in the nest, with what it wears. An animal with a whole sitting figure
  // (animalArt.json `body`: the bunny, so far) sits in the mockup's woven basket, rising above its
  // rim; the figure is a still, so it is not given a mood (the idle loop and the mood faces exist
  // for the face only). The others keep the drawn nest and their face, alive with its idle loop.
  // A long press on it switches child; on a shared class iPad a tap does, through the grown-up check.
  const sits = Boolean(artOf(profile.animal)?.body);
  const hero = sits ? <Hero animal={profile.animal} outfit={profile.outfit} view="body" /> : <Hero animal={profile.animal} outfit={profile.outfit} mood="idle" />;
  const NestArt = sits ? BasketNest : WovenNest;

  return (
    <div
      className={`today${shown === "reading" ? " is-nest" : " is-section"}`}
      data-screen="today"
      data-subject={shown === "math" ? MATH : shown === "colors" ? COLORS : shown === "time" ? TIME : shown === "build" ? BUILD : shown === "science" ? SCIENCE : READING}
      data-review={review ? "true" : "false"}
      data-day={dayKey ?? todayKey(now)}
      data-source={placementSource}
      data-stage={shown === "math" ? mathLesson.stageId : shown === "colors" ? colorLesson.stageId : shown === "time" ? timeLesson.stageId : stageId}
      data-week={weekIndex}
      data-letters={letters.join("")}
      data-done={finishedCount}
      data-left={left}
      data-stars={profile.stars}
    >
      <div className="today-top">
        {/* An Explore section (Numbers, Science and the rest) opens as its own page, so it has the same Back
            button, in the same corner, as every lesson and game. Before, the only way back to the reading
            path was the small "READING" pill, which nobody on the first phone test read as a way out. */}
        {shown !== "reading" ? (
          <>
            <button type="button" className="back-button" aria-label="Back" data-course="reading" data-section-back onClick={() => onCourse("reading")}>
              <span className="gear-face">
                <Chevron direction="left" />
              </span>
            </button>
            <div className="today-tools">
              <GoalRing ms={practiceTotal(profile)[todayKey(now)] ?? 0} goalMinutes={goalMinutes} />
              <p className="star-count" data-stars={profile.stars}>
                <StarIcon />
                <span>{profile.stars}</span>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* The day's other stops, a short dashed row: the pencil, the book and the paints. Today's
                letter is the big circle below, beside the nest. */}
            <div className="trail-stops" role="group" aria-label="Today's path">
              {stops
                .filter((stop) => stop.id !== "letter")
                .map((stop) => {
                  const finished = done[stop.id];
                  return (
                    <button
                      key={stop.id}
                      type="button"
                      className={`trail-stop${stop.id === current.id ? " is-current" : ""}${finished ? " is-done" : ""}`}
                      data-step={stop.id}
                      data-current={stop.id === current.id ? "true" : "false"}
                      aria-label={finished ? `${stop.label}, done` : stop.label}
                      onClick={() => onOpen(stop.id)}
                    >
                      {finished ? <Tick /> : null}
                      <span className="mark" aria-hidden="true">
                        {stop.id === "draw" ? <PencilLine /> : stop.id === "story" ? <BookLine /> : <DropsLine />}
                      </span>
                    </button>
                  );
                })}
            </div>
            {/* No star count up here: the mockup's top row is the stops and the Grown-ups pill. The stars
                are on the page's root for the tests, and in the grown-ups' pages. */}
          </>
        )}
      </div>

      <div className="today-body">
        <section className="lesson">
          <div className="lesson-head">
            {/* The page says which section it is, as a name, not a button. Home's name was a pill that
                looked like a button and did nothing (it was once one of a row of sections to pick from);
                in the playtest of build 3 it was tapped, and nothing happened. */}
            <h1 className="section-title" data-section-title={shown}>
              {shown === "reading" ? "Reading" : SECTION_TITLE[shown]}
            </h1>
            {/* The week's letters, in words. The path showed only the first one (a lone M), and "Review" on a
                Friday said nothing about which letters; the first phone test asked for the two letters to be plain. */}
            {shown === "reading" && focus ? (
              <p className="today-review today-focus" data-week-focus>
                {focus}
              </p>
            ) : review && shown === "reading" ? (
              <p className="today-review">Review</p>
            ) : null}
            {shown === "reading" && held ? (
              <button type="button" className="held-note" data-held="true" aria-label="Ask a grown-up" onClick={onHeld}>
                <LockBadge />
              </button>
            ) : null}
            {shown === "reading" ? <GoalRing ms={practiceTotal(profile)[todayKey(now)] ?? 0} goalMinutes={goalMinutes} /> : null}
          </div>

          {shown === "reading" ? (
            <div className="trail">
              <div className="nest-seat" data-nest={sits ? "basket" : "drawn"}>
                <NestArt>
                  {switchNeedsGrownup ? (
                    <button type="button" className="nest-hero" aria-label="Switch child" onClick={onLeave}>
                      {hero}
                    </button>
                  ) : (
                    <HoldButton className="nest-hero" label="Switch child" onHold={onLeave}>
                      {hero}
                    </HoldButton>
                  )}
                </NestArt>
              </div>
              <div className="letter-card">
                <button
                  type="button"
                  className={`trail-stop letter-stop${current.id === "letter" ? " is-current" : ""}${done.letter ? " is-done" : ""}`}
                  data-step="letter"
                  data-current={current.id === "letter" ? "true" : "false"}
                  aria-label={done.letter ? "Letters, done" : "Letters"}
                  onClick={() => onOpen("letter")}
                >
                  {done.letter ? <Tick /> : null}
                  <span className={`trail-letter${letter.length > 1 ? " is-unit" : ""}`}>{letter}</span>
                </button>
                <p className="nest-caption">Today's letter</p>
                {/* Start opens the next stop still to do: the letter first, then the pencil, the book, the paints. */}
                <button type="button" className="start-button nest-start" data-start={current.id} onClick={() => onOpen(current.id)}>
                  Start
                </button>
              </div>
            </div>
          ) : null}

          {shown === "reading" ? (
            <div className="trace-practice">
              {/* Trace a word and Trace my name, side by side under the nest and the letter, each with its mark. */}
              {canTraceWord ? (
                <button type="button" data-practice="word" onClick={onTraceWord}>
                  <span className="practice-mark" aria-hidden="true">
                    <PencilLine />
                  </span>
                  <span>Trace a word</span>
                </button>
              ) : null}
              {canTraceName ? (
                <button type="button" data-practice="name" onClick={onTraceName}>
                  <span className="practice-mark" aria-hidden="true">
                    <SmileLine />
                  </span>
                  <span>Trace my name</span>
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
            <Suspense fallback={null}>
              <ScienceBoard ageRange={profile.ageRange} done={profile.days[todayKey(now)]?.[SCIENCE] ?? {}} onOpen={onScience} locked={(id) => lockedActivity?.("science", id) ?? false} />
            </Suspense>
          ) : null}
        </section>

        {/* A section's page holds that section only: its name, Back, and its activities. The Explore tiles and
            the dock belong to the home screen. Left on a section's page they pushed its activities off a
            sideways tablet, and gave a child six other things to tap on a page with no way back. */}
        {shown === "reading" && (showMath || showColors || showTime || showBuild || showScience || showGames) ? (
          <section className="explore-area" data-area="explore">
            <div className="explore-head">
              <h2>Explore</h2>
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
                    <ExploreMark name="numbers" />
                  </span>
                  <span className="course-name">
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
                    <ExploreMark name="colors" />
                  </span>
                  <span className="course-name">
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
                    <ExploreMark name="time" />
                  </span>
                  <span className="course-name">
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
                    <ExploreMark name="build" />
                  </span>
                  <span className="course-name">
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
                    <ExploreMark name="science" />
                  </span>
                  <span className="course-name">
                    <span>Science</span>
                  </span>
                </button>
              ) : null}
              {/* Coding has its own tile. Its games were only reachable from the bottom of the Games list, and
                  the first phone test did not find them ("I see build but don't see coding"). */}
              {showGames ? (
                <button type="button" className="course-button" data-course="code" aria-label={MODULE_CODE} onClick={onCode}>
                  <span className="course-art" aria-hidden="true">
                    <ExploreMark name="code" />
                  </span>
                  <span className="course-name">
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
        {/* The mockup's row, and only it: My Nest, Stickers, Games, with a line between. Dress up and the
            Surprise are in My Nest (NestView), the animal's own place; they were a second row here. */}
        <button type="button" className="dock-button" data-dock="nest" onClick={onNest}>
          <span className="dock-art dock-nest" aria-hidden="true">
            <NestMark />
          </span>
          <span>My Nest</span>
        </button>
        <button type="button" className="dock-button" data-dock="stickers" onClick={onStickers}>
          <span className="dock-art dock-stickers" aria-hidden="true">
            <StarMark />
          </span>
          <span>Stickers</span>
        </button>
{showGames ? <button type="button" className="dock-button" data-dock="games" onClick={onGames}>
          <span className="dock-art dock-games" aria-hidden="true">
            <EggMark />
          </span>
          <span>Games</span>
        </button> : null}
      </div>
      ) : null}
    </div>
  );
}
