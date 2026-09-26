import { describe, expect, it } from "vitest";
import {
  assignWritingLevel,
  fadeOpacity,
  normalizeWriting,
  recordWritingAttempt,
  writingLevel,
  writingRoster,
  type WritingMap,
} from "./scaffold";

function succeed(map: WritingMap, id: string, times: number): WritingMap {
  let current = map;
  for (let index = 0; index < times; index += 1) current = recordWritingAttempt(current, id, true).writing;
  return current;
}

describe("scaffold levels", () => {
  it("starts at a full guide and advances after three successes", () => {
    const id = "letter:b:lower";
    expect(writingLevel(undefined, id)).toBe(1);
    const once = recordWritingAttempt(undefined, id, true);
    expect(once.advanced).toBe(false);
    expect(once.state).toEqual({ level: 1, successes: 1, struggles: 0 });
    const twice = recordWritingAttempt(once.writing, id, true);
    const third = recordWritingAttempt(twice.writing, id, true);
    expect(third.advanced).toBe(true);
    expect(third.state).toEqual({ level: 2, successes: 0, struggles: 0 });
    const top = succeed(third.writing, id, 12);
    expect(writingLevel(top, id)).toBe(5);
  });

  it("steps back one level after three struggles and stays at the full guide", () => {
    let map = assignWritingLevel(undefined, "shape:star", 3);
    const first = recordWritingAttempt(map, "shape:star", false);
    expect(first.steppedBack).toBe(false);
    expect(first.state.struggles).toBe(1);
    expect(first.state.successes).toBe(0);
    map = first.writing;
    map = recordWritingAttempt(map, "shape:star", false).writing;
    const third = recordWritingAttempt(map, "shape:star", false);
    expect(third.steppedBack).toBe(true);
    expect(third.state).toEqual({ level: 2, successes: 0, struggles: 0 });

    let floor = assignWritingLevel(undefined, "word:cat", 1);
    for (let index = 0; index < 4; index += 1) floor = recordWritingAttempt(floor, "word:cat", false).writing;
    expect(writingLevel(floor, "word:cat")).toBe(1);
  });

  it("lets a success clear struggles, and a teacher set the level", () => {
    const struggled = recordWritingAttempt(undefined, "name:Mia", false).writing;
    const recovered = recordWritingAttempt(struggled, "name:Mia", true);
    expect(recovered.state.struggles).toBe(0);
    expect(recovered.state.successes).toBe(1);
    const set = assignWritingLevel(recovered.writing, "name:Mia", 4);
    expect(set["name:Mia"]).toEqual({ level: 4, successes: 0, struggles: 0 });
    expect(fadeOpacity(0)).toBe(1);
    expect(fadeOpacity(1)).toBeLessThan(fadeOpacity(0));
    expect(fadeOpacity(2)).toBeLessThan(fadeOpacity(1));
  });

  it("lists the week's letters, shapes, and the child's name", () => {
    const rows = writingRoster({ name: "Mia", writing: { "letter:n:lower": { level: 3, successes: 1, struggles: 0 } } }, ["n"]);
    expect(rows.find((row) => row.id === "letter:n:lower")?.level).toBe(3);
    expect(rows.find((row) => row.id === "letter:n:upper")?.level).toBe(1);
    expect(rows.some((row) => row.id === "shape:heart")).toBe(true);
    expect(rows.find((row) => row.id === "name:Mia")?.label).toBe("Mia");
  });

  it("keeps a saved level and drops a broken one", () => {
    expect(
      normalizeWriting({
        "letter:b:lower": { level: 4, successes: 2, struggles: 1 },
        nope: { level: 9 },
      }),
    ).toEqual({ "letter:b:lower": { level: 4, successes: 2, struggles: 1 } });
  });
});
