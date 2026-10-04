import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, isAbortError, playStoryLine, playWordId, type ReadAlong } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { estimateTimes, fitsLine, lineWords, speechMs, wordAtChar, wordAtTime, wordOffsets, type LineTimes } from "../data/readAlong";
import { childSaysSounds, type SoundingMode } from "../data/sounding";
import { isShared, storyChildLineId, storyLineId, storyText, storyTitleId, storyTokens, type Story, type StoryHero, type StoryToken } from "../data/stories";
import type { Outfit } from "../data/wardrobe";
import type { Settings } from "../settings";
import { useSpeaker } from "../hooks/useSpeaker";
import { Burst } from "./Burst";
import { Hero } from "./Hero";
import { Chevron, FeatherIcon, SpeakerIcon } from "./icons";
import { WordSlider } from "./WordSlider";
import { StoryScene } from "./StoryScene";

/** Quiet this long on a shared page after the grown-up line, and the child line gives a little nudge. */
const IDLE_HINT_MS = 8000;
/** After a word is slid, the next word's slider opens this much later, once the whole word has been said. */
const NEXT_WORD_MS = 1400;

/** A line cut into its words (numbered as the narrator counts them) and what lies between, marks and all. */
function grownPieces(text: string): { text: string; word: number | null }[] {
  const words = lineWords(text);
  const offsets = wordOffsets(text);
  const out: { text: string; word: number | null }[] = [];
  let at = 0;
  words.forEach((word, index) => {
    const start = offsets[index] ?? at;
    if (start > at) out.push({ text: text.slice(at, start), word: null });
    out.push({ text: word, word: index });
    at = start + word.length;
  });
  if (at < text.length) out.push({ text: text.slice(at), word: null });
  return out;
}

/** Word times for the recorded pages, loaded once, after the reader first opens. */
let storyTimes: Record<string, number[]> | null = null;
let loadingTimes: Promise<void> | null = null;
function loadStoryTimes(): Promise<void> {
  if (storyTimes || loadingTimes) return loadingTimes ?? Promise.resolve();
  loadingTimes = import("../data/storyTimings.json")
    .then((module) => {
      storyTimes = (module.default as { lines?: Record<string, number[]> }).lines ?? {};
    })
    .catch(() => {
      // Without the times the reader estimates them from each clip's length.
    })
    .finally(() => {
      loadingTimes = null;
    });
  return loadingTimes;
}

/**
 * A shared page (weeks 1 to 4): the narrator reads the grown-up line, and the
 * child line waits for the child. Its words are slid on a small slider (the
 * week's sounds), read whole (Nest words, with a feather) or tapped (the
 * child's animal). A speaker by the line says it, to check. Once the line is
 * read, the page's surprise plays.
 *
 * A decodable reader. The narrator reads each page and each word lights up
 * as it is read, so a child's eyes follow the words; every word can be
 * tapped. A word the child can sound out plays its letter sounds, then the
 * word. Other words are read whole. There is no timer and no wrong tap.
 */
export function StoryReader({
  story,
  others = [],
  onPick,
  hero,
  animal,
  outfit,
  letters,
  nest = [],
  sounding = "app",
  slid,
  onSlid,
  showTips,
  settingsRef,
  onDone,
}: {
  story: Story;
  /** The week's other readers, offered on the cover. */
  others?: readonly Story[];
  onPick?: (id: string) => void;
  hero: StoryHero;
  animal: AnimalId;
  outfit: Outfit;
  letters: readonly string[];
  /** Nest words met so far: read whole, not slid. */
  nest?: readonly string[];
  /** Who says the sounds while sliding, as in the lesson. */
  sounding?: SoundingMode;
  slid?: Readonly<Record<string, number>>;
  onSlid?: (word: string) => void;
  showTips: boolean;
  settingsRef: { current: Settings };
  onDone: (afterLine: string) => void;
}) {
  // 0 is the cover, 1..n the pages, n + 1 the end.
  const [page, setPage] = useState(0);
  const [speaking, setSpeaking] = useState<number | null>(null);
  // The word the narrator is on, counting words only (not the spaces between).
  const [reading, setReading] = useState<number | null>(null);
  const playRef = useRef<AbortController | null>(null);
  const speak = useSpeaker(settingsRef);
  // The word on the small slider (its token index on the line), the words read on this page, and the page's
  // state: the narrator still reading, the child's turn, a nudge after a quiet spell, the line read.
  const [sliding, setSliding] = useState<number | null>(null);
  const [readWords, setReadWords] = useState<number[]>([]);
  const [turn, setTurnState] = useState<"narrating" | "child" | "done">("narrating");
  const turnRef = useRef<"narrating" | "child" | "done">("narrating");
  const setTurn = (next: "narrating" | "child" | "done") => {
    turnRef.current = next;
    setTurnState(next);
  };
  const readRef = useRef<number[]>([]);
  const [nudge, setNudge] = useState(false);
  const idleTimer = useRef<number | null>(null);
  const nextTimer = useRef<number | null>(null);
  const toldTurn = useRef(false);
  const hinted = useRef(false);

  useEffect(() => {
    void loadStoryTimes();
  }, []);
  const last = story.pages.length + 1;
  const current = page >= 1 && page <= story.pages.length ? story.pages[page - 1] : null;
  const title = storyText(story.title, hero);

  const begin = () => {
    playRef.current?.abort();
    cancelSpeech();
    setReading(null);
    const controller = new AbortController();
    playRef.current = controller;
    return controller;
  };

  /**
   * Read a page aloud and light each word as it is said. A recorded clip
   * follows the page's word times (or an estimate from the clip's length);
   * the device voice follows its own word events where it sends them.
   */
  const narrate = (index: number, onEnd?: () => void) => {
    const line = story.pages[index - 1];
    if (!line) return;
    const controller = begin();
    const signal = controller.signal;
    const text = storyText(line.text, hero);
    const id = storyLineId(story, index - 1, animal);
    const words = lineWords(text);
    const offsets = wordOffsets(text);
    let times: LineTimes | null = null;
    let startedAt = 0;
    let frame = 0;
    let voiceWords = false;
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    const tick = () => {
      frame = 0;
      if (signal.aborted || !times) return;
      const at = wordAtTime(times, performance.now() - startedAt);
      if (!voiceWords) setReading(at);
      if (at !== null) frame = requestAnimationFrame(tick);
    };
    const follow = (next: LineTimes) => {
      times = next;
      startedAt = performance.now();
      stop();
      tick();
    };
    const onEvent: ReadAlong = (event) => {
      if (signal.aborted) return;
      if (event.kind === "clip") {
        const timed = storyTimes?.[id];
        follow(fitsLine(timed, words.length) ? timed : estimateTimes(words, event.durationMs || speechMs(text, 1)));
      } else if (event.kind === "speech") {
        follow(estimateTimes(words, speechMs(text, event.rate)));
      } else {
        // The device voice says where it is; that beats any estimate.
        voiceWords = true;
        setReading(wordAtChar(offsets, event.charIndex));
      }
    };
    signal.addEventListener("abort", stop, { once: true });
    void playStoryLine(id, text, settingsRef.current, signal, onEvent)
      .catch(() => undefined)
      .finally(() => {
        if (signal.aborted) return;
        stop();
        setReading(null);
        onEnd?.();
      });
  };

  const clearTimers = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    if (nextTimer.current) window.clearTimeout(nextTimer.current);
    idleTimer.current = null;
    nextTimer.current = null;
  };
  useEffect(() => clearTimers, []);

  /** The child line's tokens on a shared page, or the page line's on any other. */
  const pageTokens = (index: number): StoryToken[] => {
    const line = story.pages[index - 1];
    if (!line) return [];
    return storyTokens(isShared(line) ? line.child : line.text, hero, letters, nest);
  };
  const firstUnread = (tokens: StoryToken[], read: readonly number[]) =>
    tokens.findIndex((token, at) => token.kind === "word" && token.role === "target" && !read.includes(at));

  /** Wait for the child; after a quiet spell, nudge once a page (and say how once a story). */
  const armIdle = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      idleTimer.current = null;
      setNudge(true);
      if (!hinted.current) {
        hinted.current = true;
        speak.prompt("read-hint", "Tap a word. Then slide your animal.");
      }
    }, IDLE_HINT_MS);
  };

  /** The grown-up line has been read: the child line's first word to slide opens, and it is the child's turn. */
  const childTurn = (index: number) => {
    setTurn("child");
    const first = firstUnread(pageTokens(index), []);
    if (first >= 0) setSliding(first);
    if (!toldTurn.current) {
      toldTurn.current = true;
      speak.prompt("read-your-turn", "Your turn! Tap a word, then slide.");
    }
    armIdle();
  };

  /** A word on the line has been read (slid, or read whole). Every word to slide read: the page's surprise. */
  const markRead = (at: number) => {
    if (readRef.current.includes(at)) return;
    const next = [...readRef.current, at];
    readRef.current = next;
    setReadWords(next);
    setNudge(false);
    if (turnRef.current === "done") return;
    const tokens = pageTokens(page);
    const targets = tokens.some((token) => token.kind === "word" && token.role === "target");
    const left = firstUnread(tokens, next);
    const allWords = tokens.every((token, index) => token.kind !== "word" || next.includes(index));
    if ((targets && left < 0) || (!targets && allWords)) {
      lineRead();
      return;
    }
    armIdle();
    if (left >= 0) {
      if (nextTimer.current) window.clearTimeout(nextTimer.current);
      nextTimer.current = window.setTimeout(() => setSliding(left), NEXT_WORD_MS);
    }
  };

  const lineRead = () => {
    if (turnRef.current === "done") return;
    clearTimers();
    setNudge(false);
    turnRef.current = "done";
    setTurn("done");
    playEffect("chime", settingsRef.current);
  };

  /** The speaker by the child line: hear it read, to check. It counts as read. */
  const hearChildLine = () => {
    const line = current;
    if (!line || !isShared(line)) return;
    speak.stop();
    const controller = begin();
    clearTimers();
    void playStoryLine(storyChildLineId(story, page - 1, animal), storyText(line.child, hero), settingsRef.current, controller.signal)
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) lineRead();
      });
  };

  useEffect(() => {
    clearTimers();
    setSliding(null);
    readRef.current = [];
    setReadWords([]);
    setNudge(false);
    const line = page >= 1 ? story.pages[page - 1] : undefined;
    setTurn(line && isShared(line) ? "narrating" : "child");
    if (line && isShared(line)) narrate(page, () => childTurn(page));
    else if (page >= 1 && page <= story.pages.length) narrate(page);
    else if (page === 0) {
      const controller = begin();
      void playStoryLine(storyTitleId(story, animal), title, settingsRef.current, controller.signal).catch(() => undefined);
    }
    return () => playRef.current?.abort();
    // Narration follows the page, not the props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, story.id]);

  const tapWord = (token: Extract<StoryToken, { kind: "word" }>, index: number) => {
    speak.stop();
    if (token.role === "target") {
      // Any word the child can sound out opens on the small slider, as in a lesson.
      begin();
      if (nextTimer.current) window.clearTimeout(nextTimer.current);
      setSliding(index);
      if (current && isShared(current)) armIdle();
      return;
    }
    void sayWord(token, index).then(() => {
      if (current && isShared(current)) markRead(index);
    });
  };

  /** A word read whole: a Nest word, a glue word, or the child's animal (its own name clip). */
  const sayWord = async (token: Extract<StoryToken, { kind: "word" }>, index: number) => {
    const controller = begin();
    const signal = controller.signal;
    setSpeaking(index);
    try {
      const id = token.role === "hero" ? animal : token.word;
      await playWordId(id, token.text, settingsRef.current, signal);
    } catch (error) {
      if (!isAbortError(error)) return;
    } finally {
      if (!signal.aborted) setSpeaking(null);
    }
  };

  const go = (next: number) => {
    speak.stop();
    setSpeaking(null);
    setReading(null);
    setPage(Math.max(0, Math.min(last, next)));
  };

  return (
    <div className="story" data-screen="story" data-story={story.id} data-page={page} data-pages={story.pages.length}>
      {page === 0 ? (
        <div className="story-cover">
          <StoryScene setting={story.pages[0].setting} props={story.pages[0].props} animal={animal} outfit={outfit} cover />
          <h1 className="story-title">{title}</h1>
          {showTips && story.before ? <p className="story-parent">{storyText(story.before, hero)}</p> : null}
          <button type="button" className="done-button story-start" onClick={() => go(1)}>
            Read
          </button>
          {others.length > 0 && onPick ? (
            <div className="story-shelf" role="group" aria-label="More stories">
              <p className="chunk-strip-word">More stories</p>
              <div className="story-shelf-row">
                {others.slice(0, 5).map((other) => (
                  <button key={other.id} type="button" className="story-shelf-book" data-story-pick={other.id} onClick={() => onPick(other.id)}>
                    <span className="story-shelf-cover" aria-hidden="true">
                      <StoryScene setting={other.pages[0].setting} props={other.pages[0].props} animal={animal} outfit={outfit} cover />
                    </span>
                    <span className="story-shelf-title">{storyText(other.title, hero)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {current ? (
        <div
          className={`story-page${isShared(current) ? " is-shared" : ""}${turn === "done" && current.payoff ? ` is-payoff payoff-${current.payoff}` : ""}`}
          data-turn={isShared(current) ? turn : undefined}
          data-payoff={current.payoff}
        >
          <StoryScene setting={current.setting} props={current.props} animal={animal} outfit={outfit} />
          {isShared(current) ? (
            <>
              {/* The grown-up's line: read by the narrator, not for tapping. */}
              <p className="story-line story-grown" data-page-text={storyText(current.text, hero)} data-reading={reading ?? ""}>
                {grownPieces(storyText(current.text, hero)).map((piece, at) =>
                  piece.word === null ? (
                    <span key={at}>{piece.text}</span>
                  ) : (
                    <span key={at} className={`story-grown-word${reading === piece.word ? " is-reading" : ""}`}>
                      {piece.text}
                    </span>
                  ),
                )}
              </p>
              <div className={`story-child${nudge ? " is-nudging" : ""}${turn === "done" ? " is-read" : ""}`} data-child-line={storyText(current.child, hero)}>
                <span className="story-child-who" aria-hidden="true">
                  <Hero animal={animal} outfit={outfit} />
                </span>
                <p className="story-child-line">
                  {pageTokens(page).map((token, index, tokens) => {
                    if (token.kind === "gap") {
                      return (
                        <span key={index} className={`story-gap${/^[.,!?]/.test(token.text) ? " is-mark" : ""}`}>
                          {token.text}
                        </span>
                      );
                    }
                    const wordIndex = tokens.slice(0, index).filter((item) => item.kind === "word").length;
                    const done = readWords.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`story-word is-child is-${token.role}${speaking === index ? " is-speaking" : ""}${sliding === index ? " is-sliding" : ""}${done ? " is-read" : ""}`}
                        data-word={token.word}
                        data-role={token.role}
                        data-word-index={wordIndex}
                        data-read={done ? "true" : "false"}
                        aria-label={token.role === "target" ? `Slide ${token.text}` : token.text}
                        onClick={() => tapWord(token, index)}
                      >
                        {token.role === "nest" ? <FeatherIcon /> : null}
                        {token.text}
                      </button>
                    );
                  })}
                </p>
                {turn === "done" ? <Burst key={`line-${page}`} seed={page} pieces={16} big /> : null}
                <button type="button" className="story-hear" aria-label="Hear it" data-hear-child onClick={hearChildLine}>
                  <SpeakerIcon />
                </button>
              </div>
            </>
          ) : (
            <p className="story-line" data-page-text={storyText(current.text, hero)} data-reading={reading ?? ""}>
              {pageTokens(page).map((token, index, tokens) => {
                if (token.kind === "gap") {
                  return (
                    <span key={index} className={`story-gap${/^[.,!?]/.test(token.text) ? " is-mark" : ""}`}>
                      {token.text}
                    </span>
                  );
                }
                // This word's place among the page's words, to match the narrator's.
                const wordIndex = tokens.slice(0, index).filter((item) => item.kind === "word").length;
                const read = reading === wordIndex && speaking === null;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`story-word is-${token.role}${speaking === index ? " is-speaking" : ""}${sliding === index ? " is-sliding" : ""}${read ? " is-reading" : ""}`}
                    data-word={token.word}
                    data-role={token.role}
                    data-word-index={wordIndex}
                    aria-label={token.role === "target" ? `Slide ${token.text}` : token.text}
                    onClick={() => tapWord(token, index)}
                  >
                    {token.text}
                  </button>
                );
              })}
            </p>
          )}
          {(() => {
            const token = sliding === null ? null : pageTokens(page)[sliding];
            if (!token || token.kind !== "word" || token.role !== "target") return null;
            const at = sliding as number;
            return (
              <WordSlider
                key={`${page}-${at}`}
                word={token.word}
                animal={animal}
                outfit={outfit}
                settingsRef={settingsRef}
                quiet={childSaysSounds(sounding, slid, token.word)}
                onDone={(voiced) => {
                  if (voiced && sounding === "auto") onSlid?.(token.word);
                  if (isShared(current)) markRead(at);
                }}
              />
            );
          })()}
          {showTips && current.parent ? <p className="story-parent">{storyText(current.parent, hero)}</p> : null}
          <p className="chunk-strip chunk-strip-word">
            Page {page} of {story.pages.length}
          </p>
          <div className="controls story-controls">
            <button type="button" className="nav-button" aria-label="Previous page" onClick={() => go(page - 1)}>
              <Chevron direction="left" />
            </button>
            <button type="button" className="play-button" onClick={() => narrate(page)}>
              <span className="play-icon" aria-hidden="true">
                <SpeakerIcon />
              </span>
              <span>Read it</span>
            </button>
            <button type="button" className="nav-button" aria-label="Next page" onClick={() => go(page + 1)}>
              <Chevron direction="right" />
            </button>
          </div>
        </div>
      ) : null}

      {page === last ? (
        <div className="story-end">
          <StoryScene setting={story.pages[story.pages.length - 1].setting} props={[]} animal={animal} outfit={outfit} cover />
          <h1 className="story-title">The end</h1>
          <p className="story-note">{title}</p>
          <button type="button" className="done-button story-finish" onClick={() => onDone(storyText(story.after, hero))}>
            All done
          </button>
          <button type="button" className="text-button" onClick={() => go(1)}>
            Read it again
          </button>
        </div>
      ) : null}
    </div>
  );
}
