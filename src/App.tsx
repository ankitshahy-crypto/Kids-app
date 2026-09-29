import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { applyAudioSettings, playEffect, setMusicArea, unlockAudio } from "./audio/manager";
import { clearLastCue, primeSpeech, replayLastCue, resumeSpeech } from "./audio/player";
import { BreakScreen } from "./components/BreakScreen";
import { HearAgainButton, BreakButton } from "./components/ComfortButtons";
import { WrapUpSheet } from "./components/WrapUpSheet";
import { extraAllowed, noteExtra } from "./data/extras";
import { themeForDay } from "./data/themes";
import { storyChoices, storyForDay } from "./data/stories";
import { animalById } from "./data/animals";
import { installReadableFont } from "./readableFont";
import { Background } from "./components/Background";
import { Closet } from "./components/Closet";
import { GrownupTip } from "./components/GrownupTip";
import { GoalCheer } from "./components/GoalCheer";
import { GoalRing } from "./components/GoalRing";
import { GrownupsButton } from "./components/GrownupsButton";
import { GrownupsMenu, type GrownupsPage } from "./components/GrownupsMenu";
import { Chevron, StarIcon } from "./components/icons";
import { KidCorner } from "./components/KidCorner";
import { MilestoneCheer } from "./components/MilestoneCheer";
import { NestView } from "./components/NestView";
import { ParentView } from "./components/ParentPanel";
import { LetterTrace } from "./components/LetterTrace";
import { NameTrace, WordTrace } from "./components/PathTrace";
import { StartCheck } from "./components/StartCheck";
import { SoundCheckIn, checkInRounds } from "./components/SoundCheckIn";
import { checkInSounds } from "./data/progress";
import { StoryReader } from "./components/StoryReader";
import { SoundItOut } from "./components/SoundItOut";
import { SilentHint } from "./components/SilentHint";
import { StarFlight } from "./components/StarFlight";
import { StartScreen } from "./components/StartScreen";
import { StickerBook } from "./components/StickerBook";
import { SurpriseView } from "./components/SurpriseView";
import { TeacherView } from "./components/TeacherView";
import type { GameId } from "./components/Games";
import { TodayPath } from "./components/TodayPath";
import { colorTip, engineerTip, gameTip, mathTip, readTip, scienceTip, timeTip, type ReadTip } from "./content/tips";
import type { DeckWord } from "./data/deck";
import { ExploreFrame } from "./explore/frame";
import {
  AddActivity,
  CardsActivity,
  ChooseActivity,
  ClockActivity,
  CoinsActivity,
  CountActivity,
  DayActivity,
  EngineerActivity,
  Games,
  JarsActivity,
  KnowActivity,
  LemonadeActivity,
  MixActivity,
  MoneyBoard,
  MoreActivity,
  NameActivity,
  NeedsActivity,
  PaintActivity,
  RoutineActivity,
  ScienceActivity,
  ShapeActivity,
  ShopActivity,
  TraceActivity,
} from "./explore/lazy";
import { sectionForScreen } from "./explore/sections";
import { COLORS, colorFill, colorLessonForChild, type ColorStep } from "./data/colors";
import { MATH, lessonForChild, type MathStep } from "./data/math";
import { TIME, lessonForChild as timeLessonForChild, type MoneyGame, type TimeStep } from "./data/timeMoney";
import { BUILD, type BuildActivity } from "./data/engineer";
import { SCIENCE, type ScienceActivity as ScienceId } from "./data/science";
import { lessonName, todayKey, type ChildInput, type LessonStep, type StickerInput } from "./data/profiles";
import { practiceTotal, type ReadingCredit } from "./data/reading";
import { atReadingWeek, resolvePlacement } from "./data/placement";
import { activityOpen, playableWeek, type ExploreArea } from "./purchase/access";
import { useUnlock } from "./purchase/useUnlock";
import { LockSheet } from "./components/LockSheet";
import { ParentGate } from "./components/ParentGate";
import { PinPromptSheet } from "./components/PinPromptSheet";
import { hasGrownupPin } from "./data/grownupPin";
import { PIN_OFFERED_KEY } from "./storage";
import { READING } from "./data/subject";
import { lettersOnly, traceLetters } from "./data/units";
import { blendList, phonicsOpen, wordsToTrace, type LadderStep } from "./data/ladder";
import { lettersIntroduced } from "./data/schedule";
import { nameToTrace } from "./data/tracePractice";
import { usePlacement } from "./hooks/usePlacement";
import { useDayKey } from "./hooks/useDayKey";
import { useProfiles } from "./hooks/useProfiles";
import { sharedChosen } from "./hooks/useSettings";
import { useReadingTime } from "./hooks/useReadingTime";
import { useSettings } from "./hooks/useSettings";
import { bindPressFeedback } from "./input/press";

type Mode = "start" | "kid" | "parent" | "teacher" | "grownups";
type Course = "reading" | "math" | "colors" | "time" | "build" | "science";
type Screen = "today" | "library" | "nest" | "closet" | "stickers" | "games" | "money-play" | "break" | "surprise" | "check" | LessonStep | MathStep | ColorStep | TimeStep | MoneyGame | BuildActivity | ScienceId | "word" | "my-name" | "sound-check";

const lessonScreens: LessonStep[] = ["letter", "draw", "story", "moment"];

/** A short chunk of learning: a lesson stop, a practice, a game, or an Explore activity. */
function isChunkScreen(screen: Screen): boolean {
  return (
    lessonScreens.includes(screen as LessonStep) ||
    mathScreens.includes(screen as MathStep) ||
    colorScreens.includes(screen as ColorStep) ||
    timeScreens.includes(screen as TimeStep) ||
    moneyScreens.includes(screen as MoneyGame) ||
    screen === "money-play" ||
    screen === "word" ||
    screen === "my-name" ||
    screen === "games" ||
    screen === "sound-check" ||
    buildScreens.includes(screen as BuildActivity) ||
    scienceScreens.includes(screen as ScienceId)
  );
}

function readFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the offer may show once more, which is fine.
  }
}

/** The device asks for less motion. Calm mode follows it even when the switch is off. */
function reducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}
const mathScreens: MathStep[] = ["count", "know", "trace", "shape", "more", "add"];
const colorScreens: ColorStep[] = ["name", "mix", "paint"];
const timeScreens: TimeStep[] = ["day", "routine", "clock", "coins", "shop"];
const buildScreens: BuildActivity[] = ["bridge", "tower", "ramp", "machines", "balance"];
const scienceScreens: ScienceId[] = ["life", "homes", "body", "change", "weather", "senses", "float", "predict", "chain", "water"];
const moneyScreens: MoneyGame[] = ["jars", "lemonade", "choose", "needs", "cards"];

export default function App() {
  const { settings, update, settingsRef } = useSettings();
  const { profiles, active, select, addChild, updateChild, removeChild, giveStar, wear, recordReading, recordWriting, setWritingLevel, noteHatch, setHatchLevel, noteLadder, setLadderStep, setSaysSounds, noteSpin, giveGift, noteSoundCheck, setNoteForHome, setFromTeacher, setFromHome } = useProfiles();
  const { placement, setClassPlace, setChildPlace } = usePlacement();
  const [mode, setMode] = useState<Mode>("start");
  const [screen, setScreen] = useState<Screen>("today");
  const [grownupsReturn, setGrownupsReturn] = useState<"start" | "kid">("start");
  const [flying, setFlying] = useState(false);
  const [cheer, setCheer] = useState<number | null>(null);
  const [goalMet, setGoalMet] = useState(false);
  const [tip, setTip] = useState<ReadTip | null>(null);
  const [course, setCourse] = useState<Course>("reading");
  // Set once the day's lesson is done or the lesson length is reached. From
  // then on, each chunk that ends is followed by "One more?" until the
  // parent's limit, then "All done".
  const [wrappingUp, setWrappingUp] = useState<"lesson" | "time" | null>(null);
  const [offer, setOffer] = useState(false);
  const [extrasTick, setExtrasTick] = useState(0);
  const previousScreen = useRef<Screen>("today");
  const calm = settings.calm || reducedMotion();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // Bubble phase, after the control's own click handler. Capture-phase
    // playback was swallowing the click in WebKit. touchend and click are the
    // gestures iOS accepts for resume().
    const unlock = () => {
      try {
        unlockAudio();
        resumeSpeech();
      } catch {
        // A locked audio device must not block the tap.
      }
    };
    window.addEventListener("touchend", unlock);
    window.addEventListener("click", unlock);
    return () => {
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  useEffect(() => {
    if (!active && mode === "kid") setMode("start");
  }, [active, mode]);

  useEffect(() => {
    applyAudioSettings(settings);
  }, [settings]);

  // A device whose Teacher screen is used is a class iPad: the first time,
  // switching children starts asking the grown-up check. A grown-up can turn
  // it off in Settings, and it then stays off.
  useEffect(() => {
    if (mode !== "teacher" || settings.sharedDevice || sharedChosen()) return;
    update({ sharedDevice: true });
    // Only when the Teacher screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (settings.readableFont) installReadableFont();
  }, [settings.readableFont]);

  // A new screen starts with nothing to replay until it speaks. The screen's
  // own first line is spoken in its effects, after this time, so it is kept.
  const screenChangedAt = useMemo(() => Date.now(), [screen, mode]);
  useEffect(() => {
    clearLastCue(screenChangedAt);
  }, [screenChangedAt]);

  useEffect(() => {
    // Each child starts the visit fresh. Today's "One more?" count is kept on the device.
    setWrappingUp(null);
    setOffer(false);
  }, [active?.id]);

  useEffect(() => {
    const before = previousScreen.current;
    previousScreen.current = screen;
    if (screen !== "today" || !wrappingUp) return;
    // Back from a chunk, not from the closet, the nest, or a break.
    if (isChunkScreen(before)) setOffer(true);
  }, [screen, wrappingUp]);

  useEffect(() => {
    if (wrappingUp && screen === "today") setOffer(true);
    // Only when the wrap-up first begins. Later returns are handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrappingUp]);

  useEffect(() => bindPressFeedback(() => settingsRef.current), [settingsRef]);

  useEffect(() => {
    if (mode !== "kid") {
      setMusicArea("none");
      return;
    }
    if (screen === "draw" || screen === "word" || screen === "my-name") setMusicArea("focus");
    else if (screen === "story") setMusicArea("story");
    else if (screen === "library" || screen === "games" || screen === "money-play" || moneyScreens.includes(screen as MoneyGame)) setMusicArea("play");
    else setMusicArea("today");
  }, [mode, screen]);

  const unlock = useUnlock();
  // The local date, live: memos below depend on it so the lesson rolls over at midnight.
  const dayKey = useDayKey();
  // Not ready = the iPhone app has not heard back yet: treat as open, so nothing flashes a lock.
  const unlocked = !unlock.paywall || unlock.unlocked || !unlock.ready;
  const placedLesson = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt, new Date(), undefined, READING, active.ageRange);
    // dayKey: a new day may mean a new week or Friday's review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, placement, dayKey]);
  // Before the one-time unlock, a child past the free weeks replays the last free week.
  const lessonPlace = useMemo(
    () => (placedLesson ? atReadingWeek(placedLesson, playableWeek(placedLesson.weekIndex, unlocked)) : null),
    [placedLesson, unlocked],
  );
  const lessonHeld = Boolean(placedLesson && lessonPlace && lessonPlace.weekIndex !== placedLesson.weekIndex);
  const [askingGrownup, setAskingGrownup] = useState(false);
  const [offerPin, setOfferPin] = useState(false);
  // A shared class iPad: switching child goes through the grown-up check.
  const [askingSwitch, setAskingSwitch] = useState(false);
  const askSwitch = () => {
    setTip(null);
    setAskingSwitch(true);
  };
  const [grownupsPage, setGrownupsPage] = useState<GrownupsPage>("menu");
  const askGrownup = () => {
    setTip(null);
    setAskingGrownup(true);
  };
  const lockedActivity = (area: ExploreArea, id: string) => !activityOpen(area, id, unlocked);

  const lessonLetters = lessonPlace?.letters ?? [];
  // A sound-unit week (sh, a-e) is traced letter by letter, and its letter games use single letters.
  const drawLetters = useMemo(() => traceLetters(lessonLetters), [lessonLetters]);

  const mathPlace = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt, new Date(), undefined, MATH, active.ageRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, placement, dayKey]);

  const mathLesson = useMemo(() => {
    return lessonForChild(active?.createdAt ?? new Date().toISOString(), new Date(), undefined, mathPlace?.weekIndex, active?.ageRange);
  }, [active, mathPlace, dayKey]);

  const colorPlace = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt, new Date(), undefined, COLORS, active.ageRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, placement, dayKey]);

  const colorLesson = useMemo(() => {
    return colorLessonForChild(active?.createdAt ?? new Date().toISOString(), new Date(), undefined, colorPlace?.weekIndex, active?.ageRange);
  }, [active, colorPlace, dayKey]);

  const timePlace = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt, new Date(), undefined, TIME, active.ageRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, placement, dayKey]);

  const timeLesson = useMemo(() => {
    return timeLessonForChild(active?.createdAt ?? new Date().toISOString(), new Date(), undefined, timePlace?.weekIndex, active?.ageRange);
  }, [active, timePlace, dayKey]);

  const introducedLetters = useMemo(() => lettersIntroduced(lessonPlace?.weekIndex ?? 0), [lessonPlace]);
  const introducedAlphabet = useMemo(() => lettersOnly(introducedLetters), [introducedLetters]);
  const checkIn = useMemo(
    () => checkInRounds(checkInSounds(lessonLetters, introducedLetters), introducedLetters, `${active?.id ?? ""}:${dayKey}`),
    [lessonLetters, introducedLetters, active?.id, dayKey],
  );
  const ladderStep = active?.ladder.step ?? 1;
  // The step the open lesson was built on. Moving up mid-lesson would swap the
  // card under the child, so the new step waits for the next visit.
  const [lessonLadderStep, setLessonLadderStep] = useState<LadderStep>(ladderStep);
  const themes = active?.themes ?? [];
  const themeToday = themeForDay(themes, dayKey);
  const todayStory = useMemo(() => storyForDay(lessonPlace?.weekIndex ?? 0, themes, dayKey), [lessonPlace, themes, dayKey]);
  const storyShelf = useMemo(() => storyChoices(lessonPlace?.weekIndex ?? 0, themes), [lessonPlace, themes]);
  // A reader picked from the cover's shelf, for this visit. Today's story is the default.
  const [pickedStoryId, setPickedStoryId] = useState<string | null>(null);
  const openStory = storyShelf.find((story) => story.id === pickedStoryId) ?? todayStory;
  const lessonWords = useMemo(
    () => blendList(lessonLadderStep, lessonLetters, themes, introducedLetters),
    [lessonLadderStep, lessonLetters, themes, introducedLetters],
  );
  const blendedWords = useMemo(() => wordsToTrace(active?.stickers ?? [], ladderStep), [active, ladderStep]);
  const phonicsReady = phonicsOpen(introducedLetters.length);
  const traceName = nameToTrace(active?.name ?? "");

  const showTip = (step: LessonStep, when: "start" | "end", letter?: string) => {
    if (!settingsRef.current.showTips) {
      setTip(null);
      return;
    }
    setTip(readTip(step, when, letter));
  };

  const openStep = (step: LessonStep) => {
    primeSpeech();
    if (step === "letter") setLessonLadderStep(ladderStep);
    setScreen(step);
    // The letter track stays clear, and the story carries its own grown-up lines.
    if (step === "letter" || step === "story") setTip(null);
    else showTip(step, "start");
  };

  useEffect(() => {
    if (!settings.showTips) setTip(null);
  }, [settings.showTips]);

  // The child on screen was removed (or the store was cleared): go back to the first screen, never a blank one.
  useEffect(() => {
    if (!active && (mode === "kid" || grownupsReturn === "kid")) {
      setScreen("today");
      setTip(null);
      setGrownupsReturn("start");
      if (mode === "kid") setMode("start");
    }
  }, [active, mode, grownupsReturn]);

  useEffect(() => {
    if (settings.showExplore) return;
    if (course !== "reading") setCourse("reading");
    if (sectionForScreen(screen)) setScreen("today");
  }, [settings.showExplore, course, screen]);

  const reward = (step: LessonStep, learned: StickerInput[] = []) => {
    if (!active) return;
    const result = giveStar(active.id, step, learned);
    if (!result.awarded) return;
    if (!calm) setFlying(true);
    if (result.milestones.length > 0) {
      setCheer(result.milestones[result.milestones.length - 1] ?? null);
      playEffect(calm ? "chime" : "cheer", settings);
    } else if (result.lessonComplete) playEffect(calm ? "chime" : "celebrate", settings);
    else playEffect("chime", settings);
    if (result.lessonComplete) setWrappingUp((current) => current ?? "lesson");
  };

  /** The story's own closing question stands in for the generic end tip. */
  const finishStory = (after: string) => {
    reward("story");
    setScreen("today");
    if (settingsRef.current.showTips && after) setTip({ id: "story-after", text: after });
    else setTip(null);
  };

  /** The color moment names a color; the sticker is a color, the star is a reading step. */
  const finishMoment = (label: string) => {
    reward("moment", label ? [{ subject: COLORS, kind: "color", label }] : []);
    setScreen("today");
    showTip("moment", "end");
  };

  const celebrateGoal = (result: ReadingCredit) => {
    const quiet = settingsRef.current.calm || reducedMotion();
    if (!quiet) setFlying(true);
    if (result.milestones.length > 0) {
      setCheer(result.milestones[result.milestones.length - 1] ?? null);
      playEffect(quiet ? "chime" : "cheer", settingsRef.current);
    } else {
      if (!quiet) setGoalMet(true);
      playEffect("chime", settingsRef.current);
    }
    setWrappingUp((current) => current ?? "time");
  };

  useReadingTime(
    mode === "kid" && active
      ? {
          id: active.id,
          subject: course,
          seed:
            course === "math"
              ? (active.practiceMs?.[MATH] ?? {})
              : course === "colors"
                ? (active.practiceMs?.[COLORS] ?? {})
                : course === "time"
                  ? (active.practiceMs?.[TIME] ?? {})
                  : course === "build"
                    ? (active.practiceMs?.[BUILD] ?? {})
                    : course === "science"
                      ? (active.practiceMs?.[SCIENCE] ?? {})
                      : active.readingMs,
        }
      : null,
    (id, totals, subject) => {
      const result = recordReading(id, totals, settingsRef.current.readingGoal, subject);
      if (result.awardedNow) celebrateGoal(result);
    },
  );

  const finishMath = (step: MathStep, label: string) => {
    if (!active) return;
    const kind = step === "shape" ? ("shape" as const) : ("number" as const);
    const learned: StickerInput[] = label ? [{ subject: MATH, kind, label }] : [];
    const result = giveStar(active.id, step, learned, MATH);
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else if (result.lessonComplete) playEffect(calm ? "chime" : "celebrate", settings);
      else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(mathTip(step, "end"));
    else setTip(null);
  };

  const openMath = (step: MathStep) => {
    if (lockedActivity("math", step)) {
      askGrownup();
      return;
    }
    primeSpeech();
    setScreen(step);
    if (settingsRef.current.showTips) setTip(mathTip(step, "start"));
    else setTip(null);
  };

  const finishColor = (step: ColorStep, label: string) => {
    if (!active) return;
    const learned: StickerInput[] = label ? [{ subject: COLORS, kind: "color", label }] : [];
    const result = giveStar(active.id, step, learned, COLORS);
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else if (result.lessonComplete) playEffect(calm ? "chime" : "celebrate", settings);
      else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(colorTip(step, "end"));
    else setTip(null);
  };

  const openColor = (step: ColorStep) => {
    if (lockedActivity("colors", step)) {
      askGrownup();
      return;
    }
    primeSpeech();
    setScreen(step);
    if (settingsRef.current.showTips) setTip(colorTip(step, "start"));
    else setTip(null);
  };

  const finishTime = (step: TimeStep, label: string) => {
    if (!active) return;
    const kind = step === "coins" || step === "shop" ? ("coin" as const) : ("time" as const);
    const learned: StickerInput[] = label ? [{ subject: TIME, kind, label }] : [];
    const result = giveStar(active.id, step, learned, TIME);
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else if (result.lessonComplete) playEffect(calm ? "chime" : "celebrate", settings);
      else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(timeTip(step, "end"));
    else setTip(null);
  };

  const openTime = (step: TimeStep) => {
    if (lockedActivity("time", step)) {
      askGrownup();
      return;
    }
    primeSpeech();
    setScreen(step);
    if (settingsRef.current.showTips) setTip(timeTip(step, "start"));
    else setTip(null);
  };

  const finishMoney = (step: MoneyGame, label: string, gift?: string) => {
    if (!active) return;
    if (gift) giveGift(active.id, gift);
    const learned: StickerInput[] = label ? [{ subject: TIME, kind: "coin", label }] : [];
    const result = giveStar(active.id, step, learned, TIME);
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(timeTip(step, "end"));
    else setTip(null);
  };

  const openMoneyPlay = () => {
    primeSpeech();
    setScreen("money-play");
    setTip(null);
  };

  const openMoney = (step: MoneyGame) => {
    if (lockedActivity("money", step)) {
      askGrownup();
      return;
    }
    primeSpeech();
    setScreen(step);
    if (settingsRef.current.showTips) setTip(timeTip(step, "start"));
    else setTip(null);
  };

  const finishBuild = (activity: BuildActivity) => {
    if (!active) return;
    const learned: StickerInput[] = [{ subject: BUILD, kind: "build", label: activity }];
    const result = giveStar(active.id, activity, learned, BUILD);
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(engineerTip(activity, "end"));
    else setTip(null);
  };

  const openBuild = (activity: BuildActivity) => {
    if (lockedActivity("build", activity)) {
      askGrownup();
      return;
    }
    primeSpeech();
    setScreen(activity);
    if (settingsRef.current.showTips) setTip(engineerTip(activity, "start"));
    else setTip(null);
  };

  const finishScience = (activity: ScienceId) => {
    if (!active) return;
    const learned: StickerInput[] = [{ subject: SCIENCE, kind: "science", label: activity }];
    const result = giveStar(active.id, activity, learned, SCIENCE);
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(scienceTip(activity, "end"));
    else setTip(null);
  };

  const openScience = (activity: ScienceId) => {
    if (lockedActivity("science", activity)) {
      askGrownup();
      return;
    }
    primeSpeech();
    setScreen(activity);
    if (settingsRef.current.showTips) setTip(scienceTip(activity, "start"));
    else setTip(null);
  };

  const finishLetter = (word: DeckWord) => {
    // A letter card earns the letter sticker; a blended word also earns its word sticker.
    const learned: StickerInput[] = [
      ...lessonLetters.map((label) => ({ kind: "letter" as const, label })),
      ...(word.letterCard ? [] : [{ kind: "word" as const, label: word.word }]),
    ];
    if (active) noteLadder(active.id, phonicsReady, word.letterCard ? `letter:${word.letters[0]?.char ?? word.word}` : word.word);
    reward("letter", learned);
    showTip("letter", "end", word.letters[0]?.char ?? word.word);
  };

  const inLesson = isChunkScreen(screen);
  const exploreSection = sectionForScreen(screen);

  const finishGame = (game: GameId, learned: StickerInput[], extra?: { step?: string; gift?: string; ladder?: boolean }) => {
    if (!active) return;
    if (game === "hatch") noteHatch(active.id);
    if (game === "spin") noteSpin(active.id);
    if (extra?.gift) giveGift(active.id, extra.gift);
    const result = giveStar(active.id, extra?.step ?? `game-${game}`, learned);
    const words = learned.filter((sticker) => sticker.kind === "word").map((sticker) => sticker.label);
    const countsLadder = game === "hatch" || game === "rhyme" || Boolean(extra?.ladder);
    if (result.awarded && countsLadder) {
      for (const word of words.length > 0 ? words : [`game:${game}`]) noteLadder(active.id, phonicsReady, word);
    }
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else playEffect("chime", settings);
    }
    if (settingsRef.current.showTips) setTip(gameTip(game, "end"));
    else setTip(null);
  };

  /** The Friday sound game: a star for playing, whatever the taps were. */
  const finishCheckIn = () => {
    if (!active) return;
    const result = giveStar(active.id, "check-in");
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else playEffect("chime", settings);
    }
    setScreen("today");
  };

  const practiceReward = (step: "word" | "name", learned: StickerInput[]) => {
    if (!active) return;
    if (step === "word") {
      const label = learned.find((sticker) => sticker.kind === "word")?.label;
      if (label) noteLadder(active.id, phonicsReady, `trace:${label}`);
    }
    const result = giveStar(active.id, step, learned);
    if (result.awarded) {
      if (!calm) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect(calm ? "chime" : "cheer", settings);
      } else playEffect("chime", settings);
    }
    setScreen("today");
  };
  const pastel = mode === "start" || mode === "kid";
  const openGrownups = (page: GrownupsPage = "menu") => {
    setGrownupsPage(page);
    setGrownupsReturn(mode === "kid" ? "kid" : "start");
    setMode("grownups");
  };

  /** The first child on a device goes straight to their Today screen. */
  const addFromParent = (input: ChildInput) => {
    const first = profiles.length === 0;
    addChild(input);
    if (first) {
      primeSpeech();
      setScreen("today");
      setMode("kid");
      // Once: offer a PIN, so a classroom is not relying on the typed sum alone.
      if (!hasGrownupPin() && readFlag(PIN_OFFERED_KEY) !== "1") setOfferPin(true);
    }
  };

  const takeBreak = () => {
    setTip(null);
    setOffer(false);
    setScreen("break");
  };

  const extrasLeft = active ? extraAllowed(localStorage, active.id, todayKey(), settingsRef.current.extraChunks) : false;

  return (
    <div
      className={`app mode-${mode}`}
      data-mode={mode}
      data-calm={calm ? "true" : "false"}
      data-font={settings.readableFont ? "readable" : "default"}
      data-spacing={settings.letterSpacing ? "wide" : "default"}
      data-contrast={settings.highContrast ? "high" : "default"}
      data-extras={extrasTick}
    >
      {pastel ? <Background /> : null}
      <SilentHint />
      <main className="stage">
        {mode === "start" || mode === "kid" ? <GrownupsButton onOpen={() => openGrownups()} /> : null}
        {mode === "start" ? (
          <StartScreen
            profiles={profiles}
            onPick={(id) => {
              primeSpeech();
              select(id);
              setScreen("today");
              setMode("kid");
            }}
            onParent={() => setMode("parent")}
            onTeacher={() => setMode("teacher")}
          />
        ) : null}

        {mode === "kid" && active ? (
          <>
            {inLesson ? (
              <div className="top-bar">
                <button
                  type="button"
                  className="back-button"
                  aria-label="Back"
                  onClick={() => {
                    if (moneyScreens.includes(screen as MoneyGame)) {
                      setTip(null);
                      setScreen("money-play");
                      return;
                    }
                    // Leaving a lesson early clears its tip. A finished step sets its own end tip.
                    setTip(null);
                    setScreen("today");
                  }}
                >
                  <span className="gear-face">
                    <Chevron direction="left" />
                  </span>
                </button>
                <div className="today-tools">
                  <HearAgainButton onHear={() => void replayLastCue(settingsRef.current)} />
                  <BreakButton onBreak={takeBreak} />
                  <GoalRing ms={practiceTotal(active)[todayKey()] ?? 0} goalMinutes={settings.readingGoal} />
                  <p className="star-count" data-stars={active.stars}>
                    <StarIcon />
                    <span>{active.stars}</span>
                  </p>
                </div>
              </div>
            ) : null}
            <div className={`screen-body${screen === "today" ? " is-fit" : ""}`}>
              {tip ? <GrownupTip tip={tip} onDismiss={() => setTip(null)} /> : null}
              {screen === "today" ? (
                <TodayPath
                  profile={active}
                  letters={lessonLetters}
                  placementSource={lessonPlace?.source ?? "calendar"}
                  stageId={lessonPlace?.stageId ?? "letters"}
                  weekIndex={lessonPlace?.weekIndex ?? 0}
                  onLeave={() => {
                    if (settings.sharedDevice) askSwitch();
                    else setMode("start");
                  }}
                  switchNeedsGrownup={settings.sharedDevice}
                  onOpen={openStep}
                  onLibrary={() => setScreen("library")}
                  onNest={() => setScreen("nest")}
                  onSurprise={() => {
                    primeSpeech();
                    setTip(null);
                    setScreen("surprise");
                  }}
                  onCloset={() => setScreen("closet")}
                  onStickers={() => setScreen("stickers")}
                  goalMinutes={settings.readingGoal}
                  course={course}
                  onCourse={(next) => {
                    setCourse(next);
                    setTip(null);
                  }}
                  mathLesson={mathLesson}
                  onMath={openMath}
                  colorLesson={colorLesson}
                  onColor={openColor}
                  timeLesson={timeLesson}
                  onTime={openTime}
                  onMoneyPlay={openMoneyPlay}
                  onBuild={openBuild}
                  onScience={openScience}
                  canTraceWord={blendedWords.length > 0}
                  canTraceName={Boolean(traceName)}
                  onTraceWord={() => {
                    primeSpeech();
                    setScreen("word");
                    setTip(null);
                  }}
                  onTraceName={() => {
                    primeSpeech();
                    setScreen("my-name");
                    setTip(null);
                  }}
                  onGames={() => {
                    primeSpeech();
                    setScreen("games");
                    setTip(null);
                  }}
                  onSoundGame={
                    checkIn.length >= 2
                      ? () => {
                          primeSpeech();
                          setScreen("sound-check");
                          setTip(null);
                        }
                      : undefined
                  }
                  showExplore={settings.showExplore}
                  dayKey={dayKey}
                  lockedActivity={lockedActivity}
                  held={lessonHeld}
                  onHeld={askGrownup}
                />
              ) : null}
              {screen === "today" && offer && wrappingUp ? (
                <WrapUpSheet
                  name={lessonName(active)}
                  reason={wrappingUp}
                  canTakeMore={extrasLeft}
                  onMore={() => {
                    noteExtra(localStorage, active.id, todayKey());
                    setExtrasTick((tick) => tick + 1);
                    setOffer(false);
                  }}
                  onDone={() => {
                    setOffer(false);
                    setTip(null);
                    setMode("start");
                  }}
                />
              ) : null}
              {screen === "check" ? (
                <StartCheck
                  key={active.id}
                  profile={active}
                  settingsRef={settingsRef}
                  onRecord={(sound, firstTry) => noteSoundCheck(active.id, sound, firstTry)}
                  onAccept={(result) => {
                    setChildPlace(active.id, result.place);
                    setLadderStep(active.id, result.ladderStep);
                    setScreen("today");
                    setMode("grownups");
                  }}
                  onSkip={() => {
                    setScreen("today");
                    setMode("grownups");
                  }}
                />
              ) : null}
              {screen === "sound-check" ? (
                <SoundCheckIn
                  key={`${active.id}:${dayKey}`}
                  profile={active}
                  rounds={checkIn}
                  settingsRef={settingsRef}
                  onRecord={(sound, firstTry) => noteSoundCheck(active.id, sound, firstTry)}
                  onDone={finishCheckIn}
                />
              ) : null}
              {screen === "break" ? (
                <BreakScreen
                  profile={active}
                  onReady={() => setScreen("today")}
                  onSwitch={() => {
                    setScreen("today");
                    setMode("start");
                  }}
                />
              ) : null}
              {screen === "library" ? <KidCorner kind="library" onBack={() => setScreen("today")} /> : null}
              {screen === "nest" ? <NestView profile={active} onBack={() => setScreen("today")} /> : null}
              {screen === "surprise" ? <SurpriseView profile={active} settingsRef={settingsRef} onBack={() => setScreen("today")} /> : null}
              {screen === "closet" ? (
                <Closet profile={active} onWear={(itemId) => wear(active.id, itemId)} onBack={() => setScreen("today")} />
              ) : null}
              {screen === "stickers" ? <StickerBook profile={active} onBack={() => setScreen("today")} /> : null}
              {screen === "letter" ? (
                <SoundItOut
                  settingsRef={settingsRef}
                  paused={false}
                  words={lessonWords}
                  animal={active.animal}
                  outfit={active.outfit}
                  ladderStep={lessonLadderStep}
                  saysSounds={active.saysSounds === true}
                  onFinished={finishLetter}
                />
              ) : null}
              {screen === "draw" ? (
                <LetterTrace
                  letters={drawLetters}
                  settingsRef={settingsRef}
                  writing={active.writing}
                  onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                  onDone={() => {
                    const learned = (drawLetters.length > 0 ? drawLetters : ["a"]).map((label) => ({
                      kind: "letter" as const,
                      label,
                    }));
                    reward("draw", learned);
                    setScreen("today");
                    showTip("draw", "end");
                  }}
                />
              ) : null}
              {screen === "word" ? (
                <WordTrace
                  words={blendedWords}
                  settingsRef={settingsRef}
                  writing={active.writing}
                  onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                  onDone={(word) => practiceReward("word", [{ kind: "word", label: word }])}
                />
              ) : null}
              {screen === "my-name" && traceName ? (
                <NameTrace
                  name={active.name}
                  settingsRef={settingsRef}
                  writing={active.writing}
                  onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                  onDone={() => practiceReward("name", [{ kind: "word", label: traceName }])}
                />
              ) : null}
              {screen === "story" ? (
                <StoryReader
                  key={openStory.id}
                  story={openStory}
                  others={storyShelf.filter((story) => story.id !== openStory.id)}
                  onPick={setPickedStoryId}
                  hero={{ name: animalById(active.animal).name, kind: active.animal }}
                  animal={active.animal}
                  outfit={active.outfit}
                  letters={introducedLetters}
                  showTips={settings.showTips}
                  settingsRef={settingsRef}
                  onDone={finishStory}
                />
              ) : null}
              {screen === "moment" ? (
                <Suspense fallback={<p className="adult-copy">Loading</p>}>
                  <div className="color-moment" data-screen="moment">
                    <NameActivity lesson={colorLesson} settingsRef={settingsRef} onDone={(label) => finishMoment(label)} />
                  </div>
                </Suspense>
              ) : null}
              {exploreSection ? (
                <ExploreFrame section={exploreSection} childId={active.id}>
                  {screen === "count" ? (
                    <CountActivity lesson={mathLesson} settingsRef={settingsRef} theme={themeToday ?? undefined} onDone={(label) => finishMath("count", label)} />
                  ) : null}
                  {screen === "know" ? (
                    <KnowActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("know", label)} />
                  ) : null}
                  {screen === "trace" ? (
                    <TraceActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("trace", label)} />
                  ) : null}
                  {screen === "shape" ? (
                    <ShapeActivity
                      lesson={mathLesson}
                      settingsRef={settingsRef}
                      writing={active.writing}
                      onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                      onDone={(label) => finishMath("shape", label)}
                    />
                  ) : null}
                  {screen === "more" ? (
                    <MoreActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("more", label)} />
                  ) : null}
                  {screen === "add" ? (
                    <AddActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("add", label)} />
                  ) : null}
                  {screen === "name" ? (
                    <NameActivity lesson={colorLesson} settingsRef={settingsRef} onDone={(label) => finishColor("name", label)} />
                  ) : null}
                  {screen === "mix" ? <MixActivity settingsRef={settingsRef} onDone={(label) => finishColor("mix", label)} /> : null}
                  {screen === "paint" ? (
                    <PaintActivity
                      animal={active.animal}
                      outfit={active.outfit}
                      settingsRef={settingsRef}
                      made={active.stickers
                        .filter((sticker) => sticker.subject === COLORS && sticker.kind === "color" && colorFill(sticker.label))
                        .map((sticker) => sticker.label)}
                      onDone={(label) => finishColor("paint", label)}
                    />
                  ) : null}
                  {screen === "day" ? (
                    <DayActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("day", label)} />
                  ) : null}
                  {screen === "routine" ? (
                    <RoutineActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("routine", label)} />
                  ) : null}
                  {screen === "clock" ? (
                    <ClockActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("clock", label)} />
                  ) : null}
                  {screen === "coins" ? (
                    <CoinsActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("coins", label)} />
                  ) : null}
                  {screen === "jars" ? (
                    <JarsActivity
                      lesson={timeLesson}
                      animal={active.animal}
                      settingsRef={settingsRef}
                      onDone={(label, goalMet) => finishMoney("jars", label, goalMet ? timeLesson.goalItem : undefined)}
                    />
                  ) : null}
                  {screen === "lemonade" ? (
                    <LemonadeActivity animal={active.animal} settingsRef={settingsRef} onDone={(label) => finishMoney("lemonade", label)} />
                  ) : null}
                  {screen === "choose" ? (
                    <ChooseActivity
                      lesson={timeLesson}
                      animal={active.animal}
                      settingsRef={settingsRef}
                      onDone={(label) => finishMoney("choose", label)}
                    />
                  ) : null}
                  {screen === "needs" ? (
                    <NeedsActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishMoney("needs", label)} />
                  ) : null}
                  {screen === "cards" ? (
                    <CardsActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishMoney("cards", label)} />
                  ) : null}
                  {screen === "shop" ? (
                    <ShopActivity
                      lesson={timeLesson}
                      animal={active.animal}
                      settingsRef={settingsRef}
                      onDone={(label) => finishTime("shop", label)}
                    />
                  ) : null}
                  {buildScreens.includes(screen as BuildActivity) ? (
                    <EngineerActivity
                      activity={screen as BuildActivity}
                      ageRange={active.ageRange}
                      animal={active.animal}
                      outfit={active.outfit}
                      settingsRef={settingsRef}
                      onDone={() => finishBuild(screen as BuildActivity)}
                    />
                  ) : null}
                  {scienceScreens.includes(screen as ScienceId) ? (
                    <ScienceActivity
                      activity={screen as ScienceId}
                      ageRange={active.ageRange}
                      animal={active.animal}
                      outfit={active.outfit}
                      settingsRef={settingsRef}
                      onDone={() => finishScience(screen as ScienceId)}
                    />
                  ) : null}
                  {screen === "money-play" ? (
                    <div className="math-play" data-screen="money-play">
                      <h1>Money play</h1>
                      <p className="math-prompt">Pretend coins only.</p>
                      <MoneyBoard done={active.days[todayKey()]?.[TIME] ?? {}} onOpen={openMoney} locked={(id) => lockedActivity("money", id)} />
                    </div>
                  ) : null}
                  {screen === "games" ? (
                    <Games
                      profile={active}
                      knownLetters={introducedAlphabet}
                      count={mathLesson.count}
                      color={colorLesson.hear}
                      colorOptions={colorLesson.choices}
                      settingsRef={settingsRef}
                      showCode={settings.showCode}
                      onEnter={(game) => {
                        if (settingsRef.current.showTips) setTip(gameTip(game, "start"));
                        else setTip(null);
                      }}
                      onDone={finishGame}
                      locked={(game) => lockedActivity("games", game)}
                      onLocked={askGrownup}
                    />
                  ) : null}
                </ExploreFrame>
              ) : null}
            </div>
          </>
        ) : null}

        {mode === "parent" ? (
          <div className="screen-body">
            <ParentView
              settings={settings}
              onChange={update}
              profiles={profiles}
              active={active}
              placement={placement}
              onSelect={select}
              onAdd={addFromParent}
              onUpdate={updateChild}
              onRemove={removeChild}
              onChildPlace={setChildPlace}
              onLadderStep={setLadderStep}
              onTeacherLink={setFromTeacher}
              onSaysSounds={setSaysSounds}
              onClose={() => setMode("start")}
            />
          </div>
        ) : null}

        {mode === "teacher" ? (
          <TeacherView
            profiles={profiles}
            goalMinutes={settings.readingGoal}
            placement={placement}
            activeId={active?.id ?? null}
            onClassPlace={setClassPlace}
            onChildPlace={setChildPlace}
            onWritingLevel={setWritingLevel}
            onHatchLevel={setHatchLevel}
            onLadderStep={setLadderStep}
            onSaysSounds={setSaysSounds}
            onNote={setNoteForHome}
            onHomeReport={setFromHome}
            sharedDevice={settings.sharedDevice}
            onClose={() => setMode("start")}
          />
        ) : null}
        {offerPin ? (
          <PinPromptSheet
            onDone={() => {
              writeFlag(PIN_OFFERED_KEY, "1");
              setOfferPin(false);
            }}
          />
        ) : null}
        {mode === "kid" && askingSwitch ? (
          <ParentGate
            onPass={() => {
              setAskingSwitch(false);
              setMode("start");
            }}
            onCancel={() => setAskingSwitch(false)}
          />
        ) : null}
        {mode === "kid" && askingGrownup ? (
          <LockSheet
            onGrownup={() => {
              setAskingGrownup(false);
              openGrownups("unlock");
            }}
            onClose={() => setAskingGrownup(false)}
          />
        ) : null}
        {mode === "kid" && flying ? <StarFlight onDone={() => setFlying(false)} /> : null}
        {mode === "kid" && cheer !== null ? <MilestoneCheer stars={cheer} onDone={() => setCheer(null)} /> : null}
        {mode === "kid" && goalMet ? <GoalCheer onDone={() => setGoalMet(false)} /> : null}

        {mode === "grownups" ? (
          <div className="screen-body">
            <GrownupsMenu
              key={grownupsPage}
              initialPage={grownupsPage}
              settings={settings}
              onChange={update}
              profiles={profiles}
              active={active}
              placement={placement}
              onSelect={select}
              onAdd={addChild}
              onCheck={(id) => {
                primeSpeech();
                select(id);
                setTip(null);
                setScreen("check");
                setMode("kid");
              }}
              onUpdate={updateChild}
              onRemove={removeChild}
              onChildPlace={setChildPlace}
              onLadderStep={setLadderStep}
              onTeacherLink={setFromTeacher}
              onSaysSounds={setSaysSounds}
              onClose={() => setMode(grownupsReturn)}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
