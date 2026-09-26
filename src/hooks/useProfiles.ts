import { useEffect, useState } from "react";
import type { AnimalId } from "../data/animals";
import {
  createChild,
  editChild,
  loadStore,
  saveStore,
  type AgeRange,
  type ChildProfile,
  type LessonStep,
  type Sticker,
} from "../data/profiles";
import { applyReadingCredit, type ReadingCredit } from "../data/reading";
import { applyEffort, wearItem, type EffortResult } from "../data/rewards";

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

  const giveStar = (id: string, step: LessonStep, learned: Sticker[] = []): EffortResult => {
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
    const result = applyEffort(profile, step, learned);
    if (result.awarded) {
      setStore((current) => ({
        ...current,
        profiles: current.profiles.map((item) =>
          item.id === id ? applyEffort(item, step, learned).profile : item,
        ),
      }));
    }
    return result;
  };

  const recordReading = (id: string, totals: Record<string, number>, goalMinutes: number): ReadingCredit => {
    const profile = store.profiles.find((item) => item.id === id);
    if (!profile) {
      return {
        profile: createChild({ name: "A", ageRange: "4", animal: "fox" }),
        awardedNow: false,
        milestones: [],
      };
    }
    const result = applyReadingCredit(profile, totals, goalMinutes);
    if (result.profile !== profile) {
      setStore((current) => ({
        ...current,
        profiles: current.profiles.map((item) =>
          item.id === id ? applyReadingCredit(item, totals, goalMinutes).profile : item,
        ),
      }));
    }
    return result;
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
    wear,
  };
}

export type { ChildProfile };
