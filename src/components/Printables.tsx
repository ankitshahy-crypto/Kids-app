import { useState } from "react";
import { PRODUCT_SHORT } from "../brand";
import { Avatar } from "../avatars";
import { Illustration } from "../illustrations";
import type { AnimalId } from "../data/animals";
import { resolvePlacement, type PlacementDocument } from "../data/placement";
import { lessonName, type ChildProfile } from "../data/profiles";
import { isReviewDay, planForWeek, practiceLetters } from "../data/schedule";
import { COLORS, colorIds, colorPattern, colorPatternLabel, colorTitle } from "../data/colors";
import { MATH, shapeIds, shapeTitles } from "../data/math";
import { READING } from "../data/subject";
import { TIME } from "../data/timeMoney";
import { shapeStrokes } from "../data/shapeStrokes";
import { blendingWords, pictureForLetter, scheduleLetters, sheetsFor } from "../data/sheets";
import { nameGlyphs, nameToTrace, wordGlyphs } from "../data/tracePractice";
import { Pictogram } from "./Pictogram";
import { StrokeFigure } from "./StrokeFigure";

function weekLettersFor(placement: PlacementDocument, child: ChildProfile | null): string[] {
  if (!child) return practiceLetters(planForWeek(0), isReviewDay());
  return resolvePlacement(placement, child.id, child.createdAt).letters;
}

function TraceGlyph({ char, casing }: { char: string; casing: "upper" | "lower" }) {
  const patternId = `trace-dots-${casing}-${char}`;
  return (
    <svg className="trace-glyph digit-glyph" viewBox="0 0 200 200" data-case={casing} role="img" aria-label={char}>
      <defs>
        <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.4" fill="var(--sage)" />
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
          <p className="sheet-kicker">{PRODUCT_SHORT}</p>
          <h3>Letter {upper} {letter}</h3>
        </div>
        <div className="sheet-animal" data-animal={animal}>
          <Avatar animal={animal} />
        </div>
      </header>
      <div className="trace-row">
        <StrokeFigure letter={letter} casing="upper" />
        <StrokeFigure letter={letter} casing="lower" />
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

function PrintClock({ hour, minute = 0 }: { hour?: number; minute?: number }) {
  const hourAngle = hour === undefined ? 0 : (((hour % 12) + minute / 60) * 30);
  const minuteAngle = hour === undefined ? 0 : minute * 6;
  return (
    <svg className="print-clock" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#3d4a40" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, index) => {
        const number = index + 1;
        const angle = ((number % 12) * 30 - 90) * (Math.PI / 180);
        const x = 50 + Math.cos(angle) * 36;
        const y = 50 + Math.sin(angle) * 36;
        return (
          <text key={number} x={x} y={y + 2} textAnchor="middle" fontSize="7" fill="#3d4a40">
            {number}
          </text>
        );
      })}
      {hour === undefined ? null : (
        <>
          <line x1="50" y1="50" x2="50" y2="30" stroke="#3d4a40" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
          <line x1="50" y1="50" x2="50" y2="20" stroke="#3d4a40" strokeWidth="2" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
        </>
      )}
      <circle cx="50" cy="50" r="2" fill="#3d4a40" />
    </svg>
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
  const [sheetCourse, setSheetCourse] = useState<"reading" | "math" | "colors" | "time">("reading");
  const [digits, setDigits] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const child = profiles.find((profile) => profile.id === childId) ?? profiles[0] ?? null;
  const animal: AnimalId = child?.animal ?? "fox";
  const weekLetters = weekLettersFor(placement, child);
  const [picked, setPicked] = useState<string[]>(() => weekLettersFor(placement, child));
  const sheets = sheetsFor(READING);
  const showLetters = sheets.some((sheet) => sheet.id === "letter");
  const showBlending = sheets.some((sheet) => sheet.id === "blending");
  const showWords = sheets.some((sheet) => sheet.id === "word");
  const showName = sheets.some((sheet) => sheet.id === "name");
  const tracedName = nameToTrace(child?.name ?? "");
  const showShapes = sheetsFor(MATH).some((sheet) => sheet.id === "shape");
  const letters = showLetters ? scheduleLetters().filter((letter) => picked.includes(letter)) : [];
  const blends = showBlending ? blendingWords(letters.length > 0 ? letters : picked, child?.ladder.step ?? 1) : [];

  const chooseChild = (id: string) => {
    setChildId(id);
    const next = profiles.find((profile) => profile.id === id) ?? null;
    setPicked(weekLettersFor(placement, next));
  };

  const toggle = (letter: string) => {
    setPicked((current) => (current.includes(letter) ? current.filter((item) => item !== letter) : [...current, letter]));
  };

  const toggleDigit = (digit: number) => {
    setDigits((current) => (current.includes(digit) ? current.filter((item) => item !== digit) : [...current, digit].sort((a, b) => a - b)));
  };

  return (
    <div className="printables" data-subject={sheetCourse === "math" ? MATH : sheetCourse === "colors" ? COLORS : sheetCourse === "time" ? TIME : READING}>
      <div className="print-controls no-print">
        <div className="segment" role="group" aria-label="Sheets">
          <button
            type="button"
            aria-pressed={sheetCourse === "reading"}
            className={sheetCourse === "reading" ? "is-selected" : ""}
            onClick={() => setSheetCourse("reading")}
          >
            Letter sheets
          </button>
          <button
            type="button"
            aria-pressed={sheetCourse === "math"}
            className={sheetCourse === "math" ? "is-selected" : ""}
            onClick={() => setSheetCourse("math")}
          >
            Number sheets
          </button>
          <button
            type="button"
            aria-pressed={sheetCourse === "colors"}
            className={sheetCourse === "colors" ? "is-selected" : ""}
            onClick={() => setSheetCourse("colors")}
          >
            Coloring page
          </button>
          <button
            type="button"
            aria-pressed={sheetCourse === "time"}
            className={sheetCourse === "time" ? "is-selected" : ""}
            onClick={() => setSheetCourse("time")}
          >
            Time sheets
          </button>
        </div>
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
        {sheetCourse === "math" ? (
          <div className="letter-picks" role="group" aria-label="Numbers">
            {Array.from({ length: 10 }, (_, digit) => {
              const on = digits.includes(digit);
              return (
                <button key={digit} type="button" data-digit={digit} aria-pressed={on} onClick={() => toggleDigit(digit)}>
                  {digit}
                </button>
              );
            })}
          </div>
        ) : null}
        {sheetCourse === "reading" ? <div className="letter-picks" role="group" aria-label="Letters">
          {scheduleLetters().map((letter) => {
            const on = picked.includes(letter);
            return (
              <button key={letter} type="button" data-letter={letter} aria-pressed={on} onClick={() => toggle(letter)}>
                {letter.toUpperCase()}
              </button>
            );
          })}
        </div> : null}
        {sheetCourse === "reading" ? <button
          type="button"
          className="week-letters"
          data-week-letters={weekLetters.join(" ")}
          onClick={() => setPicked(weekLetters)}
        >
          Letters from this week
        </button> : null}
        <button type="button" className="print-button" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div className="print-root" data-paper={paper}>
        {sheetCourse === "math" ? (
          <>
            {digits.map((digit) => (
              <article key={digit} className="print-sheet" data-sheet="number" data-digit={digit}>
                <header className="sheet-head">
                  <div>
                    <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                    <h3>Number {digit}</h3>
                  </div>
                  <div className="sheet-animal" data-animal={animal}>
                    <Avatar animal={animal} />
                  </div>
                </header>
                <div className="trace-row">
                  <TraceGlyph char={String(digit)} casing="upper" />
                  <TraceGlyph char={String(digit)} casing="lower" />
                </div>
                <div className="trace-guides" aria-hidden="true">
                  <span />
                  <span />
                  <span />
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
            ))}
            <article className="print-sheet" data-sheet="counting">
              <header className="sheet-head">
                <div>
                  <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                  <h3>Count</h3>
                </div>
                <div className="sheet-animal" data-animal={animal}>
                  <Avatar animal={animal} />
                </div>
              </header>
              <ul className="count-sheet">
                {[1, 2, 3, 4, 5].map((count) => (
                  <li key={count} data-count={count}>
                    <span className="count-apples" aria-hidden="true">
                      {"●".repeat(count)}
                    </span>
                    <span className="count-line" />
                  </li>
                ))}
              </ul>
            </article>
            {showShapes
              ? shapeIds.map((id) => (
                  <article key={id} className="print-sheet" data-sheet="shape" data-shape={id}>
                    <header className="sheet-head">
                      <div>
                        <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                        <h3>Trace {shapeTitles[id]}</h3>
                      </div>
                    </header>
                    <div className="trace-row">
                      <StrokeFigure strokes={shapeStrokes(id)} label={shapeTitles[id]} ruled={false} />
                    </div>
                  </article>
                ))
              : null}
          </>
        ) : null}
        {sheetCourse === "time" ? (
          <>
            <article className="print-sheet" data-sheet="clock">
              <header className="sheet-head">
                <div>
                  <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                  <h3>Clock faces</h3>
                </div>
              </header>
              <div className="clock-sheet">
                {[
                  { hour: 3, minute: 0, label: "3:00" },
                  { hour: 6, minute: 0, label: "6:00" },
                  { hour: 9, minute: 0, label: "9:00" },
                ].map((face) => (
                  <figure key={face.label} data-clock={face.label}>
                    <PrintClock hour={face.hour} minute={face.minute} />
                    <figcaption>{face.label}</figcaption>
                  </figure>
                ))}
                {["empty-1", "empty-2", "empty-3"].map((id) => (
                  <figure key={id} data-clock="empty">
                    <PrintClock />
                    <figcaption>Draw the hands</figcaption>
                  </figure>
                ))}
              </div>
            </article>
            <article className="print-sheet" data-sheet="coins">
              <header className="sheet-head">
                <div>
                  <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                  <h3>Coin counting</h3>
                </div>
              </header>
              <ul className="count-sheet">
                <li data-count="2" data-cents="2">
                  <span>2 pennies</span>
                  <span className="count-line" />
                </li>
                <li data-count="1" data-cents="5">
                  <span>1 nickel</span>
                  <span className="count-line" />
                </li>
                <li data-count="3" data-cents="7">
                  <span>2 pennies and 1 nickel</span>
                  <span className="count-line" />
                </li>
                <li data-count="1" data-cents="25">
                  <span>1 quarter</span>
                  <span className="count-line" />
                </li>
              </ul>
            </article>
            <article className="print-sheet" data-sheet="jars">
              <header className="sheet-head">
                <div>
                  <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                  <h3>Three jars</h3>
                </div>
              </header>
              <p className="sheet-word">Color a circle when a coin goes in a jar.</p>
              <div className="jar-chart">
                {["Save", "Spend", "Share"].map((name) => (
                  <section key={name} data-jar={name.toLowerCase()}>
                    <h4>{name}</h4>
                    <div className="jar-dots">
                      {Array.from({ length: 5 }, (_, index) => (
                        <span key={index} className="jar-dot" />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="sheet-word">Save goal: a paper crown.</p>
            </article>
          </>
        ) : null}
        {sheetCourse === "colors" ? (
          <article className="print-sheet" data-sheet="coloring" data-animal={animal}>
            <header className="sheet-head">
              <div>
                <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                <h3>Color the animal</h3>
              </div>
              <div className="sheet-animal" data-animal={animal}>
                <Avatar animal={animal} />
              </div>
            </header>
            <svg className="coloring-outline" viewBox="0 0 160 180" aria-hidden="true">
              <circle cx="80" cy="58" r="36" fill="none" stroke="#3d4a40" strokeWidth="3" />
              <ellipse cx="48" cy="36" rx="12" ry="20" fill="none" stroke="#3d4a40" strokeWidth="3" />
              <ellipse cx="112" cy="36" rx="12" ry="20" fill="none" stroke="#3d4a40" strokeWidth="3" />
              <ellipse cx="80" cy="132" rx="40" ry="32" fill="none" stroke="#3d4a40" strokeWidth="3" />
              <circle cx="66" cy="54" r="4" fill="none" stroke="#3d4a40" strokeWidth="2" />
              <circle cx="94" cy="54" r="4" fill="none" stroke="#3d4a40" strokeWidth="2" />
              <path d="M74 70c4 6 8 6 12 0" fill="none" stroke="#3d4a40" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <ul className="coloring-key">
              {colorIds.map((id) => (
                <li key={id} data-color={id} data-pattern={colorPattern(id)}>
                  <span className={`print-swatch pattern-${colorPattern(id)}`} style={{ backgroundColor: "#fff" }} />
                  <span>{colorTitle(id)}</span>
                  <span>{colorPatternLabel(id)}</span>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
        {sheetCourse === "reading" && letters.length === 0 ? <p className="adult-copy no-print">Pick a letter to make a sheet.</p> : null}
        {sheetCourse === "reading"
          ? letters.map((letter) => <LetterSheet key={letter} letter={letter} animal={animal} />)
          : null}
        {sheetCourse === "reading" && showWords
          ? blends.map((word) => (
              <article key={word.id} className="print-sheet" data-sheet="word" data-word={word.word}>
                <header className="sheet-head">
                  <div>
                    <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                    <h3>Trace {word.word}</h3>
                  </div>
                </header>
                <div className="trace-row trace-word-row">
                  {wordGlyphs(word.word).map((glyph, index) => (
                    <StrokeFigure key={`${word.id}-${index}`} strokes={glyph.strokes} label={glyph.label} />
                  ))}
                </div>
              </article>
            ))
          : null}
        {sheetCourse === "reading" && showName && tracedName ? (
          <article className="print-sheet" data-sheet="name" data-name={tracedName}>
            <header className="sheet-head">
              <div>
                <p className="sheet-kicker">{PRODUCT_SHORT}</p>
                <h3>Trace {tracedName}</h3>
              </div>
            </header>
            <div className="trace-row trace-word-row">
              {nameGlyphs(tracedName).map((glyph, index) => (
                <StrokeFigure key={`${glyph.label}-${index}`} strokes={glyph.strokes} label={glyph.label} />
              ))}
            </div>
          </article>
        ) : null}
        {sheetCourse === "reading" && showBlending ? (
        <article className="print-sheet" data-sheet="blend">
          <header className="sheet-head">
            <div>
              <p className="sheet-kicker">{PRODUCT_SHORT}</p>
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
