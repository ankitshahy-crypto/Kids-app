import { Component, type ReactNode } from "react";
import type { ExploreSection } from "./sections";

type Props = {
  section: ExploreSection;
  children: ReactNode;
};

type State = {
  failed: boolean;
  section: ExploreSection;
};

/**
 * A crash stays in this section. The boundary is also keyed by section in the
 * frame, and a section change clears the error so one crash cannot disable the rest.
 */
export class ExploreBoundary extends Component<Props, State> {
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = { failed: false, section: props.section };
  }

  static getDerivedStateFromError(): { failed: true } {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (state.section !== props.section) return { failed: false, section: props.section };
    return null;
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="explore-error" data-explore-error={this.props.section} role="alert">
          <p>This section stopped. The other sections are still here.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
