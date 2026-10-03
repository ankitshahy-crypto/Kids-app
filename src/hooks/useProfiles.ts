import { useEffect, useRef, useState } from "react";
import {
  createChild,
  editChild,
  loadStore,
  saveStore,
  todayKey,
  storeSnapshot,
  type ChildInput,
  type ChildProfile,
  type StickerInput,
} from "../data/profiles";
import { applyReadingCredit, type ReadingCredit } from "../data/reading";
import { applyEffort, grantGift, wearItem, type EffortResult } from "../data/rewards";
import { assignHatchLevel, recordHatch, recordSpin, type HatchLevel } from "../data/games";
import { assignLadderStep, recordLadderSuccess, type LadderStep } from "../data/ladder";
import { assignWritingLevel, recordWritingAttempt, type ScaffoldLevel, type WritingOutcome } from "../data/scaffold";
import { READING, type SubjectId } from "../data/subject";
import { recordSoundCheck, type SoundCheckSource } from "../data/progress";
import type { HomeReport, TeacherLink } from "../data/profileExtras";
import { noteProfilesChanged } from "../offline/events";

export function useProfiles() {
  const [store, setStore] = useState(() => loadStore());
  const saved = useRef(storeSnapshot(store));
  const profilesRef = useRef(store.profiles);
  profilesRef.current = store.profiles;

  useEffect(() => {
    const next = storeSnapshot(store);
    if (next === saved.current) return;
    saveStore(store);
    saved.current = next;
    // The offline download follows the children on this device.
    noteProfilesChanged();
  }, [store]);

  const active = store.profiles.find((profile) => profile.id === store.activeId) ?? null;

  const select = (id: string) => {
    setStore((current) => ({ ...current, activeId: id }));
  };

  const addChild = (input: ChildInput) => {
    const profile = createChild(input);
    setStore((current) => ({
      activeId: current.activeId ?? profile.id,
      profiles: [...current.profiles, profile],
    }));
    return profile;
  };

  const updateChild = (id: string, input: ChildInput) => {
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
    // Saved for a new star, and also for a word read after today's star was already given.
    if (result.awarded || result.stickersAdded > 0) {
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

  // Fast repeats read the ref, and each updater writes that attempt's map onto the latest profile.
  const recordWriting = (id: string, itemId: string, success: boolean): WritingOutcome => {
    const profile = profilesRef.current.find((item) => item.id === id);
    const outcome = recordWritingAttempt(profile?.writing, itemId, success);
    if (!profile) return outcome;
    const writing = outcome.writing;
    profilesRef.current = profilesRef.current.map((item) => (item.id === id ? { ...item, writing } : item));
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) => (item.id === id ? { ...item, writing } : item)),
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

  /** One finished word try. The same word counts once per local day. */
  /** `cap`: the furthest step the letters taught so far can support (ladderCap). */
  const noteLadder = (id: string, phonics: boolean, word: string, cap?: LadderStep) => {
    const day = todayKey();
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === id ? { ...item, ladder: recordLadderSuccess(item.ladder, { phonicsOpen: phonics, word, day, cap }).ladder } : item,
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

  const patchChild = (id: string, change: (profile: ChildProfile) => ChildProfile) => {
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((item) => (item.id === id ? change(item) : item)),
    }));
  };

  /** A quiet check-in: was this sound picked on the first try? Grown-ups see it; the child does not. */
  const noteSoundCheck = (id: string, sound: string, firstTry: boolean, source: SoundCheckSource = "friday") =>
    patchChild(id, (item) => recordSoundCheck(item, sound, firstTry, new Date(), undefined, source));

  /** Class iPad: the preset note for this child's family. 0 clears it. */
  const setNoteForHome = (id: string, note: number) =>
    patchChild(id, (item) => ({ ...item, noteForHome: note > 0 ? note : undefined }));

  /** Family device: what the teacher's family code said. */
  const setFromTeacher = (id: string, link: TeacherLink | undefined) =>
    patchChild(id, (item) => ({ ...item, fromTeacher: link }));

  /** Class iPad: what the family's progress code said. */
  const setFromHome = (id: string, report: HomeReport | undefined) =>
    patchChild(id, (item) => ({ ...item, fromHome: report }));

  /** A grown-up's choice: the child says the letter sounds in Sound It Out, or the app does. */
  const setSaysSounds = (id: string, on: boolean) =>
    patchChild(id, (item) => ({ ...item, saysSounds: on ? true : undefined }));

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
    setSaysSounds,
    noteSpin,
    giveGift,
    wear,
    noteSoundCheck,
    setNoteForHome,
    setFromTeacher,
    setFromHome,
  };
}

export type { ChildProfile };
