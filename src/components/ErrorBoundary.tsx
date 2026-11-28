import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Gabinete da Clarice render error:", error, info);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="app-shell"
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div className="modal-card" role="alert">
            <p className="modal-kicker">ESTÚDIO-GABINETE 222 · ANEXO IV</p>
            <h3>O Ring Light Piscou!</h3>
            <p className="modal-desc">
              Ocorreu um erro inesperado na tela do Gabinete da Clarice. Clique
              abaixo para recarregar o estúdio.
            </p>
            <button
              type="button"
              className="btn-voice"
              onClick={() => window.location.reload()}
            >
              Recarregar Gabinete
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
