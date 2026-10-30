# Design system

UI diarahkan dengan [taste-skill](https://github.com/Leonxlnx/taste-skill/tree/main/skills/taste-skill) (jalur *app screens*), style **framed-sheet** (seed 1596433308), font IBM Plex Sans. Token ada di `src/styles/tokens.css`; komponen hanya mengacu ke token.

## Ide visual

- **Frame berwarna, sheet putih.** Bar atas dan latar jendela memakai `--ground` (abu batu, seperti meja cetak). Konten duduk di sheet putih, 8px dari tepi, sudut 16px, garis 1px, tanpa bayangan.
- **Satu aksen** (`--accent`, teal `#1b6c80`) hanya untuk data, seleksi, dan tanda merek (satu petak di logo). Tombol utama berwarna hampir hitam (`--primary`).
- **Tanda merek:** empat petak, satu berwarna aksen, yang sekaligus menggambarkan kotak perkakas dan grid kolase (`BrandMark`).

## Layout

| Layar | Pola |
| --- | --- |
| Home | `AppFrame` (bar 48px + sheet). Hero: `h1` besar (atas permintaan pemilik; layar app biasanya 18–32px), satu kalimat deskripsi, lalu kotak cari 56px selebar kolom 1120px. Di bawahnya daftar tool per kategori sebagai baris (preview SVG, nama, deskripsi, "Buka"). |
| Home: kategori | Baris chip filter (Semua + tiap kategori, dengan jumlah) di atas daftar; chip aktif terisi hitam. Tiap kategori punya judul 18px + satu kalimat deskripsi. |
| Tool converter | `ToolBar` + panel pengaturan 300px + area kerja (`.workspace`). Keadaan kosong = tombol besar bergaris putus-putus di area kerja. Di tablet/ponsel area kerja tampil di atas panel. |
| Tool jam (timer) | `ToolBar` + panel 300px + area kerja dengan tab garis bawah (2px tinta di atas garis 1px). Angka besar di tengah, satu-satunya pengecualian batas 48px untuk layar app karena dibaca dari jauh; di dalam cincin ukurannya mengikuti lebar cincin (`cqi`). Tombol 44px berbentuk pil. |
| Tool editor | Bar 44px di atas frame, tanpa garis. Panel 288px, kanvas, dan panel 300px dengan celah 12px dan tepi 8px. Kanvas adalah *well* satu tingkat lebih gelap dari frame. |
| Tablet (≤1180px) | Kanvas di atas, panel bertumpuk penuh lebar, seksi di dalam panel berdampingan (`auto-fit, minmax(280px, 1fr)`). |
| Ponsel (≤720px) | Satu kolom, sheet menempel ke tepi, status muncul sebagai toast di bawah. |

## Aturan

- Teks: 12 / 13 / 14 / 16 / 18 / 22 px, plus judul hero. Angka yang berubah memakai `.num` (tabular).
- Sudut: sheet/panel 16, kartu 8, kontrol 6, chip 4.
- Garis: `--border` untuk panel, `--rule` di antara seksi, `--control` untuk input. Garis putus-putus hanya untuk slot kosong dan area drop.
- Terpilih: border 1.5px warna tinta, glyph berubah aksen. Fokus: outline 2px aksen.
- Bayangan hanya untuk yang mengambang (toast). Tidak ada gradien, glow, blur, emoji, label kecil berhuruf kapital, ikon di kotak berwarna, atau penomoran 01/02.
- Skeleton: balok abu datar seukuran nilai aslinya, berdenyut lewat opacity (bukan shimmer gradien), tanpa geser layout. Semua animasi mati saat `prefers-reduced-motion`.
- Bahasa UI: Indonesia, huruf kalimat, kata-kata dari dunia penggunanya ("Feed Instagram", "Cetak 4R").

## Cek otomatis

Dengan taste-skill tersedia secara lokal:

```bash
node <skill>/scripts/lint.mjs --app src
node <skill>/scripts/inspect.mjs --app http://localhost:4173/tools/<slug>
```

Status terakhir: lint 0 FAIL 0 WARN. Inspector: home 0 FAIL (1 WARN untuk judul hero 76px, disengaja); kolase 0 FAIL (WARN garis putus-putus slot kosong, diizinkan untuk app screen); PDF ke Gambar, Gambar ke PDF, dan PNG ke JPEG 0 FAIL; Timer & Stopwatch 0 FAIL (WARN ruang kosong di sekitar muka jam yang sengaja dipusatkan).
