import { describe, expect, it } from "vitest";
import { SOUND_UNITS, isUnit, soundMet, soundsNeeded, splitSounds, unitLabel, unitLetters } from "./units";

const pieces = (word: string) => splitSounds(word).map((piece) => `${piece.text}${piece.silent ? "()" : `:${piece.sound}`}`);

describe("sound units", () => {
  it("keeps digraphs and teams together and leaves letters alone", () => {
    expect(pieces("ship")).toEqual(["sh:sh", "i:i", "p:p"]);
    expect(pieces("fish")).toEqual(["f:f", "i:i", "sh:sh"]);
    expect(pieces("duck")).toEqual(["d:d", "u:u", "ck:ck"]);
    expect(pieces("light")).toEqual(["l:l", "igh:igh", "t:t"]);
    expect(pieces("rain")).toEqual(["r:r", "ai:ai", "n:n"]);
    expect(pieces("bee")).toEqual(["b:b", "ee:ee"]);
    expect(pieces("cat")).toEqual(["c:c", "a:a", "t:t"]);
    expect(pieces("bell")).toEqual(["b:b", "e:e", "l:l", "l:l"]);
  });

  it("marks the magic e as silent and the vowel as the long sound", () => {
    expect(pieces("cake")).toEqual(["c:c", "a:a_e", "k:k", "e()"]);
    expect(pieces("kite")).toEqual(["k:k", "i:i_e", "t:t", "e()"]);
    expect(pieces("bone")).toEqual(["b:b", "o:o_e", "n:n", "e()"]);
    expect(pieces("cube")).toEqual(["c:c", "u:u_e", "b:b", "e()"]);
    expect(pieces("shake")).toEqual(["sh:sh", "a:a_e", "k:k", "e()"]);
    expect(pieces("house")).toEqual(["h:h", "ou:ou", "s:s", "e()"]);
    expect(pieces("cakes")).toEqual(["c:c", "a:a_e", "k:k", "e()", "s:s"]);
    expect(pieces("likes")).toEqual(["l:l", "i:i_e", "k:k", "e()", "s:s"]);
    expect(pieces("houses")).toEqual(["h:h", "ou:ou", "s:s", "e()", "s:s"]);
    expect(soundsNeeded("cake")).toEqual(["c", "a_e", "k"]);
  });

  it("reads spellings it does not teach whole, and hears a final y as a vowel", () => {
    expect(splitSounds("cow").some((piece) => piece.untaught)).toBe(true);
    expect(splitSounds("saw").some((piece) => piece.untaught)).toBe(true);
    expect(splitSounds("turn").some((piece) => piece.untaught)).toBe(true);
    expect(splitSounds("nice").some((piece) => piece.untaught)).toBe(true);
    expect(splitSounds("cage").some((piece) => piece.untaught)).toBe(true);
    expect(splitSounds("city").some((piece) => piece.untaught)).toBe(true);
    expect(splitSounds("cat").some((piece) => piece.untaught)).toBe(false);
    expect(pieces("boy")).toEqual(["b:b", "oy:oi"]);
    expect(pieces("happy")).toEqual(["h:h", "a:a", "p:p", "p:p", "y:ee"]);
    expect(pieces("fly")).toEqual(["f:f", "l:l", "y:igh"]);
    expect(pieces("yes")).toEqual(["y:y", "e:e", "s:s"]);
    expect(pieces("day")).toEqual(["d:d", "ay:ay"]);
    expect(pieces("squeak")).toEqual(["s:s", "q:q", "u:u", "ea:ea", "k:k"]);
    expect(pieces("queen")).toEqual(["q:q", "u:u", "ee:ee", "n:n"]);
    expect(soundMet("ck", new Set(["k"]))).toBe(true);
    expect(soundMet("sh", new Set(["s", "h"]))).toBe(false);
  });

  it("knows its units and the letters inside them", () => {
    expect(isUnit("sh")).toBe(true);
    expect(isUnit("s")).toBe(false);
    expect(unitLabel("a_e")).toBe("a-e");
    expect(unitLabel("m")).toBe("m");
    expect(unitLetters("a_e")).toEqual(["a", "e"]);
    expect(unitLetters("igh")).toEqual(["i", "g", "h"]);
    expect(new Set(SOUND_UNITS.map((unit) => unit.id)).size).toBe(SOUND_UNITS.length);
  });
});
