import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Menangkap kegagalan memuat chunk tool (mis. setelah deploy baru, chunk lama sudah hilang)
 * atau error render, lalu menawarkan muat ulang alih-alih layar kosong.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="route-error" role="alert">
        <h1>Halaman gagal dimuat</h1>
        <p>Mungkin koneksi terputus atau ada versi baru. Muat ulang untuk mencoba lagi.</p>
        <button className="btn btn--primary" type="button" onClick={() => location.reload()}>
          Muat ulang
        </button>
      </div>
    );
  }
}
