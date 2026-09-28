import type { AnimalId } from "../data/animals";
import type { StorySetting } from "../data/stories";
import type { Outfit } from "../data/wardrobe";
import { Illustration, type IllustrationName } from "../illustrations";
import { Hero } from "./Hero";

/** A page picture: a simple backdrop for the setting, the hero, and up to two props. */
export function StoryScene({
  setting,
  props,
  animal,
  outfit,
  cover = false,
}: {
  setting: StorySetting;
  props: IllustrationName[];
  animal: AnimalId;
  outfit: Outfit;
  cover?: boolean;
}) {
  return (
    <div className={`story-scene${cover ? " is-cover" : ""}`} data-setting={setting} aria-hidden="true">
      <Backdrop setting={setting} />
      {/* The sun and moon sit outside the stretched backdrop so they stay round at any size. */}
      {setting === "night" ? <span className="story-sky story-moon" data-sky="moon" /> : null}
      {setting === "meadow" || setting === "hill" || setting === "farm" ? <span className="story-sky story-sun" data-sky="sun" /> : null}
      {setting === "beach" ? <span className="story-sky story-sun is-left" data-sky="sun" /> : null}
      {props[0] ? (
        <span className="story-prop story-prop-left">
          <Illustration name={props[0]} />
        </span>
      ) : null}
      <span className="story-hero">
        <Hero animal={animal} outfit={outfit} />
      </span>
      {props[1] ? (
        <span className="story-prop story-prop-right">
          <Illustration name={props[1]} />
        </span>
      ) : null}
    </div>
  );
}

function Backdrop({ setting }: { setting: StorySetting }) {
  return (
    <svg className="story-backdrop" viewBox="0 0 400 240" preserveAspectRatio="none">
      {setting === "night" || setting === "sky" ? (
        <>
          <rect width="400" height="240" fill={setting === "night" ? "#2C3A5F" : "#DDEFF6"} />
          {setting === "night" ? (
            <>
              <circle cx="60" cy="40" r="3" fill="#FFF1C4" />
              <circle cx="120" cy="70" r="2" fill="#FFF1C4" />
              <circle cx="230" cy="30" r="3" fill="#FFF1C4" />
              <circle cx="280" cy="90" r="2" fill="#FFF1C4" />
              <path d="M0 240V190c60-20 120-20 200-6 80 14 140 10 200 0v56Z" fill="#3E4F78" />
            </>
          ) : (
            <>
              <ellipse cx="90" cy="60" rx="50" ry="18" fill="#fff" />
              <ellipse cx="290" cy="40" rx="60" ry="20" fill="#fff" />
              <ellipse cx="200" cy="110" rx="40" ry="14" fill="#fff" opacity="0.8" />
              <path d="M0 240V214c80-16 160-16 200-8 60 12 120 12 200 0v34Z" fill="#9BD1A8" />
            </>
          )}
        </>
      ) : null}
      {setting === "meadow" || setting === "hill" || setting === "farm" ? (
        <>
          <rect width="400" height="240" fill="#E4EEF8" />
          <path d="M0 240V150c70-40 140-40 200-14 60 26 130 24 200-6v110Z" fill="#9BD1A8" />
          <path d="M0 240v-40c90-24 200-24 400 0v40Z" fill="#79B98C" />
          {setting === "farm" ? (
            <>
              <rect x="40" y="96" width="70" height="60" fill="#E07A8A" />
              <path d="M30 100l45-34 45 34Z" fill="#B95C6C" />
              <rect x="66" y="126" width="18" height="30" fill="#7A3B47" />
            </>
          ) : null}
        </>
      ) : null}
      {setting === "room" ? (
        <>
          <rect width="400" height="240" fill="#FBF1E4" />
          <rect x="250" y="40" width="90" height="70" rx="6" fill="#DDEFF6" />
          <path d="M295 40v70M250 75h90" stroke="#FFF" strokeWidth="4" />
          <rect y="170" width="400" height="70" fill="#E7C7A6" />
          <path d="M0 176h400" stroke="#D9B58E" strokeWidth="3" />
        </>
      ) : null}
      {setting === "beach" ? (
        <>
          <rect width="400" height="240" fill="#DDEFF6" />
          <path d="M0 120c60-14 120-14 200 0s140 14 200 0v40H0Z" fill="#8CC7E8" />
          <path d="M0 240v-90c100-20 300-20 400 0v90Z" fill="#F3DFB8" />
        </>
      ) : null}
      {setting === "road" ? (
        <>
          <rect width="400" height="240" fill="#E4EEF8" />
          <path d="M0 150c80-30 160-30 200-14 60 20 140 16 200-4v104H0Z" fill="#9BD1A8" />
          <path d="M0 240v-56h400v56Z" fill="#8FA9B8" />
          <path d="M20 212h50M110 212h50M200 212h50M290 212h50" stroke="#FFF6E4" strokeWidth="6" strokeLinecap="round" />
        </>
      ) : null}
      {setting === "pond" ? (
        <>
          <rect width="400" height="240" fill="#E4EEF8" />
          <path d="M0 240V140c90-30 200-30 400 0v100Z" fill="#79B98C" />
          <ellipse cx="200" cy="200" rx="170" ry="40" fill="#8CC7E8" />
          <ellipse cx="120" cy="196" rx="24" ry="8" fill="#9BD1A8" />
          <ellipse cx="290" cy="206" rx="20" ry="7" fill="#9BD1A8" />
        </>
      ) : null}
      {setting === "castle" ? (
        <>
          <rect width="400" height="240" fill="#E4EEF8" />
          <rect x="120" y="60" width="160" height="120" fill="#DDEFF6" />
          <rect x="100" y="40" width="40" height="140" fill="#C9D9E8" />
          <rect x="260" y="40" width="40" height="140" fill="#C9D9E8" />
          <path d="M100 40h10v-12h10v12h10v-12h10v12M260 40h10v-12h10v12h10v-12h10v12" fill="#C9D9E8" />
          <path d="M180 180v-50a20 20 0 0 1 40 0v50Z" fill="#A67B5B" />
          <path d="M0 240v-60h400v60Z" fill="#9BD1A8" />
        </>
      ) : null}
    </svg>
  );
}
