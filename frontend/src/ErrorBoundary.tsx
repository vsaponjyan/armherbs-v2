import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: "center", marginTop: 50, padding: 20 }}>
          <h2>{"\u053D\u0576\u0564\u0580\u0578\u0582\u0574 \u0565\u0576\u0584 \u0569\u0561\u0580\u0574\u0561\u0581\u0576\u0565\u056C \u0567\u057B\u0568\u0589"}</h2>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              fontSize: 16,
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            {"\u0539\u0561\u0580\u0574\u0561\u0581\u0576\u0565\u056C"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
