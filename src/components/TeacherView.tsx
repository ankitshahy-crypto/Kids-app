import { Avatar } from "../avatars";

export function TeacherView({ onClose }: { onClose: () => void }) {
  return (
    <div className="teacher-view" data-screen="teacher">
      <header className="adult-head">
        <button type="button" className="quiet-back" onClick={onClose}>
          Back
        </button>
        <div>
          <h1>Classroom</h1>
          <p className="adult-note">Placeholder dashboard. Filled in during step 6.</p>
        </div>
      </header>

      <section className="teacher-card" data-card="classes">
        <h2>Classes</h2>
        <p>A teacher profile can hold more than one class. None are linked yet.</p>
        <ul className="class-list">
          <li>Class 1 · no children linked</li>
          <li>Class 2 · no children linked</li>
        </ul>
      </section>

      <section className="teacher-card" data-card="roster">
        <h2>Roster</h2>
        <p>Children show by in-app name and avatar only. Real names stay on the teacher's own list.</p>
        <div className="roster-sample">
          <Avatar animal="fox" />
          <div>
            <p className="roster-name">Fox</p>
            <p className="roster-meta">Sample only. Not a real child.</p>
          </div>
        </div>
      </section>

      <section className="teacher-card" data-card="goals">
        <h2>Goals</h2>
        <p>A weekly or monthly effort goal is set here in step 6.</p>
      </section>

      <section className="teacher-card" data-card="jar">
        <h2>Class star jar</h2>
        <p>The class can share one star-jar goal. Filled in during step 6.</p>
      </section>

      <section className="teacher-card" data-card="certificates">
        <h2>Certificates</h2>
        <p>A certificate is made on this device and can be printed. It is not stored on a server. Step 6.</p>
      </section>
    </div>
  );
}
