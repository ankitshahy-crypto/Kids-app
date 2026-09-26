import { useEffect, useState } from "react";
import {
  awardStar,
  createChild,
  dayProgress,
  editChild,
  lessonSteps,
  loadStore,
  saveStore,
  type AgeRange,
  type ChildProfile,
  type LessonStep,
} from "../data/profiles";
import type { AnimalId } from "../data/animals";

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

  const giveStar = (id: string, step: LessonStep) => {
    let awarded = false;
    let lessonComplete = false;
    setStore((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => {
        if (profile.id !== id) return profile;
        const next = awardStar(profile, step);
        awarded = next.stars !== profile.stars;
        const day = dayProgress(next);
        lessonComplete = lessonSteps.every((item) => day[item]);
        return next;
      }),
    }));
    return { awarded, lessonComplete };
  };

  return {
    profiles: store.profiles,
    active,
    select,
    addChild,
    updateChild,
    removeChild,
    giveStar,
  };
}

export type { ChildProfile };
