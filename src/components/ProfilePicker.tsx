import { animalById } from "../data/animals";
import { lessonName, type ChildProfile } from "../data/profiles";
import { Avatar } from "../avatars";

export function ProfilePicker({
  profiles,
  onPick,
}: {
  profiles: ChildProfile[];
  onPick: (id: string) => void;
}) {
  if (profiles.length === 0) {
    return (
      <div className="picker" data-screen="picker">
        <h1>Hello</h1>
        <p className="grownup-hint">Ask a grown-up to hold the gear.</p>
      </div>
    );
  }

  return (
    <div className="picker" data-screen="picker">
      <h1>Who</h1>
      <div className="avatar-grid">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className="avatar-button"
            data-animal={profile.animal}
            onClick={() => onPick(profile.id)}
          >
            <Avatar animal={profile.animal} />
            <span>{lessonName(profile)}</span>
            {lessonName(profile) === animalById(profile.animal).name ? null : (
              <span className="avatar-animal">{animalById(profile.animal).name}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
