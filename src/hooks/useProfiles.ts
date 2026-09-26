import { useEffect, useState } from "react";
import type { AnimalId } from "../data/animals";
import {
  createChild,
  editChild,
  loadStore,
  saveStore,
  type AgeRange,
  type ChildProfile,
  type StickerInput,
} from "../data/profiles";
import { applyReadingCredit, type ReadingCredit } from "../data/reading";
import { applyEffort, grantGift, wearItem, type EffortResult } from "../data/rewards";
import { assignHatchLevel, recordHatch, recordSpin, type HatchLevel } from "../data/games";
import { assignLadderStep, recordLadderSuccess, type LadderStep } from "../data/ladder";
import { assignWritingLevel, recordWritingAttempt, type ScaffoldLevel, type WritingOutcome } from "../data/scaffold";
import { READING, type SubjectId } from "../data/subject";

export function useProfiles() {
  const [store, setStore] = useState(() => loadStore());

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const active = store.profiles.find((profile) => profile.id === store.activeId) ?? null;

  const select = (id: string) => {
    setStore((current) => ({ ...current, activeId: id }));
  };

  const addChild = (input: { name: string; ageRange: AgeRange; animal: AnimalId }) => {
    const profile = createChild(input);
    setStore((current) => ({
      activeId: current.activeId ?? profile.id,
      profiles: [...current.profiles, profile],
    }));
    return profile;
  };

  const updateChild = (id: string, input: { name: string; ageRange: AgeRange; animal: AnimalId }) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => (profile.id === id ? editChild(profile, input) : profile)),
    }));
  };

  const removeChild = (id: string) => {
    setStore((current) => {
      const profiles = current.profiles.filter((profile) => profile.id !== id);
      const activeId = current.activeId === id ? (profiles[0]?.id ?? null) : current.activeId;
      return { activeId, profiles };
    });
  };

  const giveStar = (id: string, step: string, learned: StickerInput[] = [], subject: SubjectId = READING): EffortResult => {
    const profile = store.profiles.find((item) => item.id === id);
    if (!profile) {
      return {
        profile: createChild({ name: "A", ageRange: "4", animal: "fox" }),
        awarded: false,
        lessonComplete: false,
        milestones: [],
        stickersAdded: 0,
      };
    }
    // Read the award from this render. The updater repeats the same step, so a
    // second pass in development cannot add another star or hide the cheer.
    const result = applyEffort(profile, step, learned, new Date(), undefined, subject);
    if (result.awarded) {
      setStore((current) => ({
        ...current,
        profiles: current.profiles.map((item) =>
          item.id === id ? applyEffort(item, step, learned, new Date(), undefined, subject).profile : item,
        ),
      }));
    }
    return result;
  };

  const recordReading = (
    id: string,
    totals: Record<string, number>,
    goalMinutes: number,
    subject: SubjectId = READING,
  ): ReadingCredit => {
    const profile = store.profiles.find((item) => item.id === id);
    if (!profile) {
      return {
        profile: createChild({ name: "A", ageRange: "4", animal: "fox" }),
        awardedNow: false,
        milestones: [],
      };
    }
    const result = applyReadingCredit(profile, totals, goalMinutes, new Date(), undefined, subject);
    if (result.profile !== profile) {
      setStore((current) => ({
        ...current,
        profiles: current.profiles.map((item) =>
          item.id === id ? applyReadingCredit(item, totals, goalMinutes, new Date(), undefined, subject).profile : item,
        ),
      }));
    }
    return result;
  };

  const recordWriting = (id: string, itemId: string, success: boolean): WritingOutcome => {
    const profile = store.profiles.find((item) => item.id === id);
    const outcome = recordWritingAttempt(profile?.writing, itemId, success);
    if (!profile) return outcome;
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) => (item.id === id ? { ...item, writing: outcome.writing } : item)),
    }));
    return outcome;
  };

  const noteHatch = (id: string) => {
    const profile = store.profiles.find((item) => item.id === id);
    const outcome = recordHatch(profile?.games);
    if (!profile) return outcome;
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) => (item.id === id ? { ...item, games: outcome.games } : item)),
    }));
    return outcome;
  };

  const noteSpin = (id: string) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) => (item.id === id ? { ...item, games: recordSpin(item.games) } : item)),
    }));
  };

  const giveGift = (id: string, itemId: string) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) => (item.id === id ? grantGift(item, itemId) : item)),
    }));
  };

  const setHatchLevel = (id: string, level: HatchLevel) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === id ? { ...item, games: assignHatchLevel(item.games, level) } : item,
      ),
    }));
  };

  const noteLadder = (id: string, phonics: boolean) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === id ? { ...item, ladder: recordLadderSuccess(item.ladder, { phonicsOpen: phonics }).ladder } : item,
      ),
    }));
  };

  const setLadderStep = (id: string, step: LadderStep) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === id ? { ...item, ladder: assignLadderStep(item.ladder, step) } : item,
      ),
    }));
  };

  const setWritingLevel = (id: string, itemId: string, level: ScaffoldLevel) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === id ? { ...item, writing: assignWritingLevel(item.writing, itemId, level) } : item,
      ),
    }));
  };

  const wear = (id: string, itemId: string) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => (profile.id === id ? wearItem(profile, itemId) : profile)),
    }));
  };

  return {
    profiles: store.profiles,
    active,
    select,
    addChild,
    updateChild,
    removeChild,
    giveStar,
    recordReading,
    recordWriting,
    setWritingLevel,
    noteHatch,
    setHatchLevel,
    noteLadder,
    setLadderStep,
    noteSpin,
    giveGift,
    wear,
  };
}

export type { ChildProfile };
