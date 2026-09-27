import { Component, type ReactNode } from "react";
import type { ExploreSection } from "./sections";

type Props = {
  section: ExploreSection;
  children: ReactNode;
};

type State = {
  failed: boolean;
};

/** A crash here stays in this section. Reading is a different screen. */
export class ExploreBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="explore-error" data-explore-error={this.props.section} role="alert">
          <p>This section stopped. Your reading lesson is still here.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
