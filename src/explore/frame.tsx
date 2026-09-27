import { useEffect, type ReactNode } from "react";
import { ExploreBoundary } from "./boundary";
import { writeSection } from "./sectionStore";
import type { ExploreSection } from "./sections";

function CrashProbe({ section }: { section: ExploreSection }) {
  if (import.meta.env.DEV && localStorage.getItem("littlenest-explore-crash") === section) {
    throw new Error(`Explore section ${section} crashed`);
  }
  return null;
}

function Remember({ section, childId }: { section: ExploreSection; childId: string }) {
  useEffect(() => {
    writeSection(section, "child", childId);
  }, [section, childId]);
  return null;
}

/** Explore may read the current child id and write only its own keys. */
export function ExploreFrame({
  section,
  childId,
  children,
}: {
  section: ExploreSection | null;
  childId: string;
  children: ReactNode;
}) {
  if (!section) return children;
  return (
    <ExploreBoundary section={section}>
      <Remember section={section} childId={childId} />
      <CrashProbe section={section} />
      {children}
    </ExploreBoundary>
  );
}
