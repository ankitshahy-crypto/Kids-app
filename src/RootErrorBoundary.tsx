import { Component, type ReactNode } from "react";

type State = { failed: boolean };

/** A render crash shows a calm message. It does not write over saved profiles. */
export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="root-error" role="alert">
          <h1>Something went wrong</h1>
          <p>LittleNest could not show this screen. Saved progress on this device was left as it was.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
