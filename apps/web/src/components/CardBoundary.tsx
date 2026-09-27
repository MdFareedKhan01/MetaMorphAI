import { Component, type ReactNode } from 'react';

type Props = { label: string; children: ReactNode };
type State = { crashed: boolean };

/** AC-9: a crash in one card must never blank the rest of the page. */
export class CardBoundary extends Component<Props, State> {
  state: State = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }

  render() {
    if (this.state.crashed) {
      return (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {this.props.label} crashed while rendering. The other cards are unaffected.
        </div>
      );
    }
    return this.props.children;
  }
}
