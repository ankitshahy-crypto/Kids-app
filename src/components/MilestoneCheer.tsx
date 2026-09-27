export function MilestoneCheer({ stars, onDone }: { stars: number; onDone: () => void }) {
  return (
    <div className="cheer" role="dialog" aria-modal="true" aria-label={`${stars} stars`} data-milestone={stars}>
      <span className="confetti" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <p className="cheer-count">{stars} stars</p>
      <p className="cheer-line">for trying</p>
      <button type="button" className="cheer-done" onClick={onDone}>
        Yay
      </button>
    </div>
  );
}
