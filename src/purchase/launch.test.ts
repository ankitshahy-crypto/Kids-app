import { describe, expect, it } from "vitest";
import { firstAnswers } from "./pilot";

describe("the first answers at launch", () => {
  const never = new Promise<never>(() => undefined);
  /** Has this promise settled by the end of the current turn of the event loop? */
  const settled = async (promise: Promise<unknown>) => {
    let done = false;
    void promise.then(
      () => (done = true),
      () => (done = true),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    return done;
  };

  it("a pilot build opens at its own answer, without waiting to hear what is owned", async () => {
    expect(await firstAnswers(Promise.resolve({ pilot: true, environment: "sandbox" }), never)).toEqual({ beta: true, unlocked: true, ready: true });
  });

  it("an App Store copy draws its locks only once it has heard what the family owns", async () => {
    let answer: (value: unknown) => void = () => undefined;
    const owned = new Promise((resolve) => (answer = resolve));
    const first = firstAnswers(Promise.resolve({ pilot: false, environment: "production" }), owned);
    expect(await settled(first)).toBe(false);
    answer({ owned: true });
    expect(await first).toEqual({ ready: true });
  });

  it("a check that fails, either one, still lets the app be ready", async () => {
    expect(await firstAnswers(Promise.reject(new Error("no StoreKit")), Promise.resolve())).toEqual({ ready: true });
    expect(await firstAnswers(Promise.resolve({ pilot: false }), Promise.reject(new Error("offline")))).toEqual({ ready: true });
    // And a pilot answer that fails waits for what is owned like any other copy.
    expect(await settled(firstAnswers(Promise.reject(new Error("no StoreKit")), never))).toBe(false);
  });
});
