import { useEffect, useState } from "react";
import {
  loadPlacement,
  savePlacement,
  withChildPlace,
  withClassPlace,
  type LessonPlace,
  type PlacementDocument,
} from "../data/placement";

export function usePlacement() {
  const [placement, setPlacement] = useState<PlacementDocument>(() => loadPlacement());

  useEffect(() => {
    savePlacement(placement);
  }, [placement]);

  return {
    placement,
    setClassPlace: (place: LessonPlace | null) => setPlacement((doc) => withClassPlace(doc, place)),
    setChildPlace: (childId: string, place: LessonPlace | null) =>
      setPlacement((doc) => withChildPlace(doc, childId, place)),
  };
}
