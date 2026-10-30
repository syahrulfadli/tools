import { Link } from "react-router";
import { AppFrame } from "../components/AppFrame";
import "./not-found.css";

export function NotFound() {
  return (
    <AppFrame>
      <title>Tidak ditemukan · Productivity Tools</title>
      <div className="not-found">
        <h1>Halaman ini tidak ada</h1>
        <p>Alamatnya mungkin salah ketik, atau tool-nya sudah berganti nama.</p>
        <Link to="/" className="btn btn--primary">
          Kembali ke semua tool
        </Link>
      </div>
    </AppFrame>
  );
}
