import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, isAbortError, playLetterSound, playStoryLine, playWordId, sleep } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { storyLineId, storyText, storyTitleId, storyTokens, type Story, type StoryHero, type StoryToken } from "../data/stories";
import { splitSounds } from "../data/units";
import type { Outfit } from "../data/wardrobe";
import { phonemeOf } from "../data/wordBuild";
import type { Settings } from "../settings";
import { Chevron, SpeakerIcon } from "./icons";
import { StoryScene } from "./StoryScene";

const BETWEEN_LETTERS_MS = 240;
const BEFORE_WORD_MS = 300;
const SILENT_E_MS = 320;

/**
 * The shown word cut into the pieces it is sounded out by: "Ship" is Sh-i-p,
 * "cake" is c-a-k-e with a silent e. Marks between letters stay with the
 * piece before them.
 */
function shownPieces(text: string, word: string): string[] {
  const pieces = splitSounds(word);
  const out: string[] = [];
  let at = 0;
  for (const piece of pieces) {
    let taken = "";
    let letters = 0;
    while (at < text.length && letters < piece.text.length) {
      const char = text[at];
      taken += char;
      if (/[A-Za-z]/.test(char)) letters += 1;
      at += 1;
    }
    out.push(taken);
  }
  if (at < text.length) out[out.length - 1] = `${out[out.length - 1] ?? ""}${text.slice(at)}`;
  return out;
}

/**
 * A decodable reader. The narrator reads each page; every word can be
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
  showTips: boolean;
  settingsRef: { current: Settings };
  onDone: (afterLine: string) => void;
}) {
  // 0 is the cover, 1..n the pages, n + 1 the end.
  const [page, setPage] = useState(0);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [activeLetter, setActiveLetter] = useState<number | null>(null);
  const playRef = useRef<AbortController | null>(null);
  const last = story.pages.length + 1;
  const current = page >= 1 && page <= story.pages.length ? story.pages[page - 1] : null;
  const title = storyText(story.title, hero);

  const begin = () => {
    playRef.current?.abort();
    cancelSpeech();
    const controller = new AbortController();
    playRef.current = controller;
    return controller;
  };

  const narrate = (index: number) => {
    const line = story.pages[index - 1];
    if (!line) return;
    const controller = begin();
    const text = storyText(line.text, hero);
    void playStoryLine(storyLineId(story, index - 1, animal), text, settingsRef.current, controller.signal).catch(() => undefined);
  };

  useEffect(() => {
    if (page >= 1 && page <= story.pages.length) narrate(page);
    else if (page === 0) {
      const controller = begin();
      void playStoryLine(storyTitleId(story, animal), title, settingsRef.current, controller.signal).catch(() => undefined);
    }
    return () => playRef.current?.abort();
    // Narration follows the page, not the props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, story.id]);

  const sayWord = async (token: Extract<StoryToken, { kind: "word" }>, index: number) => {
    const controller = begin();
    const signal = controller.signal;
    setSpeaking(index);
    setActiveLetter(null);
    try {
      if (token.role === "target") {
        // One sound at a time: a digraph or vowel team is one piece, the e of cake is silent.
        const pieces = splitSounds(token.word);
        for (let at = 0; at < pieces.length; at += 1) {
          if (signal.aborted) return;
          const piece = pieces[at];
          setActiveLetter(at);
          if (piece.silent) {
            await sleep(SILENT_E_MS, signal);
            continue;
          }
          playEffect("pop", settingsRef.current);
          await playLetterSound({ char: piece.text, phoneme: phonemeOf(piece.sound) }, settingsRef.current, signal);
          await sleep(BETWEEN_LETTERS_MS, signal);
        }
        setActiveLetter(null);
        await sleep(BEFORE_WORD_MS, signal);
      }
      const id = token.role === "hero" ? animal : token.word;
      await playWordId(id, token.text, settingsRef.current, signal);
    } catch (error) {
      if (!isAbortError(error)) return;
    } finally {
      if (!signal.aborted) {
        setSpeaking(null);
        setActiveLetter(null);
      }
    }
  };

  const go = (next: number) => {
    setSpeaking(null);
    setActiveLetter(null);
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
        <div className="story-page">
          <StoryScene setting={current.setting} props={current.props} animal={animal} outfit={outfit} />
          <p className="story-line" data-page-text={storyText(current.text, hero)}>
            {storyTokens(current.text, hero, letters).map((token, index) =>
              token.kind === "gap" ? (
                <span key={index} className={`story-gap${/^[.,!?]/.test(token.text) ? " is-mark" : ""}`}>
                  {token.text}
                </span>
              ) : (
                <button
                  key={index}
                  type="button"
                  className={`story-word is-${token.role}${speaking === index ? " is-speaking" : ""}`}
                  data-word={token.word}
                  data-role={token.role}
                  aria-label={token.role === "target" ? `Sound out ${token.text}` : token.text}
                  onClick={() => void sayWord(token, index)}
                >
                  {token.role === "target" && speaking === index
                    ? shownPieces(token.text, token.word).map((piece, at) => (
                        <span key={at} className={activeLetter === at ? "is-sounding" : ""}>
                          {piece}
                        </span>
                      ))
                    : token.text}
                </button>
              ),
            )}
          </p>
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
