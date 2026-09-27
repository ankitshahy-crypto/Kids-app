import { useEffect, useState } from "react";
import {
  loadPlacement,
  savePlacement,
  withChildPlace,
  withClassPlace,
  type LessonPlace,
  type PlacementDocument,
} from "../data/placement";
import { requestClassSync } from "../offline/queue";

export function usePlacement() {
  const [placement, setPlacement] = useState<PlacementDocument>(() => loadPlacement());

  useEffect(() => {
    savePlacement(placement);
  }, [placement]);

  return {
    placement,
    setClassPlace: (place: LessonPlace | null) =>
      setPlacement((doc) => {
        const next = withClassPlace(doc, place);
        requestClassSync(next);
        return next;
      }),
    setChildPlace: (childId: string, place: LessonPlace | null) =>
      setPlacement((doc) => {
        const next = withChildPlace(doc, childId, place);
        requestClassSync(next);
        return next;
      }),
  };
}
