import { Suspense, useEffect, type ReactNode } from "react";
import { deviceStorage } from "../deviceStorage";
import { ExploreBoundary } from "./boundary";
import { writeSection } from "./sectionStore";
import type { ExploreSection } from "./sections";

function CrashProbe({ section }: { section: ExploreSection }) {
  if (import.meta.env.DEV && deviceStorage().getItem("littlenest-explore-crash") === section) {
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
  section: ExploreSection;
  childId: string;
  children: ReactNode;
}) {
  return (
    <ExploreBoundary key={section} section={section}>
      <Suspense fallback={<p className="adult-copy" data-explore-loading={section}>Loading</p>}>
        <Remember section={section} childId={childId} />
        <CrashProbe section={section} />
        {children}
      </Suspense>
    </ExploreBoundary>
  );
}
