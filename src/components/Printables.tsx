import { useState } from "react";
import { Avatar } from "../avatars";
import { Illustration } from "../illustrations";
import type { AnimalId } from "../data/animals";
import { resolvePlacement, type PlacementDocument } from "../data/placement";
import { lessonName, type ChildProfile } from "../data/profiles";
import { isReviewDay, planForWeek, practiceLetters } from "../data/schedule";
import { READING } from "../data/subject";
import { blendingWords, pictureForLetter, scheduleLetters, sheetsFor } from "../data/sheets";
import { Pictogram } from "./Pictogram";

function weekLettersFor(placement: PlacementDocument, child: ChildProfile | null): string[] {
  if (!child) return practiceLetters(planForWeek(0), isReviewDay());
  return resolvePlacement(placement, child.id, child.createdAt).letters;
}

function TraceGlyph({ char, casing }: { char: string; casing: "upper" | "lower" }) {
  const patternId = `trace-dots-${casing}-${char}`;
  return (
    <svg className="trace-glyph" viewBox="0 0 200 200" data-case={casing} role="img" aria-label={char}>
      <defs>
        <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.4" fill="#6e9a74" />
        </pattern>
      </defs>
      <text x="100" y="158" textAnchor="middle" fill={`url(#${patternId})`}>
        {char}
      </text>
    </svg>
  );
}

function StarOutline() {
  return (
    <svg className="color-star" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8 14.7 9l6.6.5-5 4.2 1.6 6.4L12 16.6 6.1 20.1 7.7 13.7 2.7 9.5 9.3 9 12 2.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LetterSheet({ letter, animal }: { letter: string; animal: AnimalId }) {
  const upper = letter.toUpperCase();
  const picture = pictureForLetter(letter);
  return (
    <article className="print-sheet" data-sheet="letter" data-letter={letter}>
      <header className="sheet-head">
        <div>
          <p className="sheet-kicker">WordNest</p>
          <h3>Letter {upper} {letter}</h3>
        </div>
        <div className="sheet-animal" data-animal={animal}>
          <Avatar animal={animal} />
        </div>
      </header>
      <div className="trace-row">
        <TraceGlyph char={upper} casing="upper" />
        <TraceGlyph char={letter} casing="lower" />
      </div>
      <div className="trace-guides" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="sheet-picture" data-picture={picture.word}>
        <div className="sheet-art">
          {picture.illustration ? <Illustration name={picture.illustration} /> : null}
          {picture.pictogram ? <Pictogram kind={picture.pictogram} /> : null}
        </div>
        <p className="sheet-word">{picture.word}</p>
      </div>
      <div className="color-stars" data-effort="stars">
        <p>Color the stars</p>
        <div className="color-stars-row">
          {Array.from({ length: 5 }, (_, index) => (
            <StarOutline key={index} />
          ))}
        </div>
      </div>
    </article>
  );
}

export function Printables({
  profiles,
  activeId,
  placement,
}: {
  profiles: ChildProfile[];
  activeId: string | null;
  placement: PlacementDocument;
}) {
  const initialId = activeId && profiles.some((profile) => profile.id === activeId) ? activeId : (profiles[0]?.id ?? "");
  const [childId, setChildId] = useState(initialId);
  const [paper, setPaper] = useState<"a4" | "letter">("letter");
  const child = profiles.find((profile) => profile.id === childId) ?? profiles[0] ?? null;
  const animal: AnimalId = child?.animal ?? "fox";
  const weekLetters = weekLettersFor(placement, child);
  const [picked, setPicked] = useState<string[]>(() => weekLettersFor(placement, child));
  const sheets = sheetsFor(READING);
  const showLetters = sheets.some((sheet) => sheet.id === "letter");
  const showBlending = sheets.some((sheet) => sheet.id === "blending");
  const letters = showLetters ? scheduleLetters().filter((letter) => picked.includes(letter)) : [];
  const blends = showBlending ? blendingWords(letters.length > 0 ? letters : picked) : [];

  const chooseChild = (id: string) => {
    setChildId(id);
    const next = profiles.find((profile) => profile.id === id) ?? null;
    setPicked(weekLettersFor(placement, next));
  };

  const toggle = (letter: string) => {
    setPicked((current) => (current.includes(letter) ? current.filter((item) => item !== letter) : [...current, letter]));
  };

  return (
    <div className="printables" data-subject={READING}>
      <div className="print-controls no-print">
        <p className="adult-copy">
          Pick letters, or use the letters from this week. The page fits A4 and US Letter. Printing stays in this
          browser.
        </p>
        {profiles.length > 1 ? (
          <div className="segment" role="group" aria-label="Child">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                aria-pressed={profile.id === child?.id}
                className={profile.id === child?.id ? "is-selected" : ""}
                onClick={() => chooseChild(profile.id)}
              >
                {lessonName(profile)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="segment print-paper" role="group" aria-label="Paper">
          <button
            type="button"
            aria-pressed={paper === "letter"}
            className={paper === "letter" ? "is-selected" : ""}
            onClick={() => setPaper("letter")}
          >
            US Letter
          </button>
          <button
            type="button"
            aria-pressed={paper === "a4"}
            className={paper === "a4" ? "is-selected" : ""}
            onClick={() => setPaper("a4")}
          >
            A4
          </button>
        </div>
        <div className="letter-picks" role="group" aria-label="Letters">
          {scheduleLetters().map((letter) => {
            const on = picked.includes(letter);
            return (
              <button key={letter} type="button" data-letter={letter} aria-pressed={on} onClick={() => toggle(letter)}>
                {letter.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="week-letters"
          data-week-letters={weekLetters.join(" ")}
          onClick={() => setPicked(weekLetters)}
        >
          Letters from this week
        </button>
        <button type="button" className="print-button" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div className="print-root" data-paper={paper}>
        {letters.length === 0 ? <p className="adult-copy no-print">Pick a letter to make a sheet.</p> : null}
        {letters.map((letter) => (
          <LetterSheet key={letter} letter={letter} animal={animal} />
        ))}
        {showBlending ? (
        <article className="print-sheet" data-sheet="blend">
          <header className="sheet-head">
            <div>
              <p className="sheet-kicker">WordNest</p>
              <h3>Blend the word</h3>
            </div>
            <div className="sheet-animal" data-animal={animal}>
              <Avatar animal={animal} />
            </div>
          </header>
          <ul className="blend-list">
            {blends.map((word) => (
              <li key={word.id} data-word={word.word}>
                <span className="blend-boxes">
                  {word.letters.map((letter, index) => (
                    <span key={`${word.id}-${index}`} className="blend-box">
                      {letter.char}
                    </span>
                  ))}
                </span>
                <span className="blend-word">{word.word}</span>
              </li>
            ))}
          </ul>
        </article>
        ) : null}
      </div>
    </div>
  );
}
