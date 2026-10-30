# Pomodoro

Rute: `/tools/pomodoro` · Kategori: Waktu (`time`) · Definisi: `src/tools/pomodoro/index.ts`

## Fungsi

Timer siklus Pomodoro: sesi fokus, istirahat pendek, dan istirahat panjang setiap beberapa sesi, berganti fase sendiri. Tetap berjalan saat user membuka tool lain di tab yang sama (seperti Timer). Hanya setelan yang disimpan di browser; hitungan sesi hilang saat tab ditutup.

## Cara pakai

1. **Mulai fokus** (atau Spasi). Cincin menghitung mundur; judul tab menampilkan sisa waktu dan fase ("12:30 · Fokus").
2. Saat fase habis: bip tiga kali, getar (ponsel), notifikasi desktop bila diizinkan, lalu pindah ke fase berikutnya. Bila **Mulai fase berikutnya otomatis** mati (bawaan), fase berikutnya menunggu tombol Mulai.
3. **Jeda**/**Lanjutkan**, **Reset** (kembali ke awal fase ini), **Lewati** (fase berikutnya; sesi fokus yang dilewati tidak dihitung).
4. Tab **Fokus / Istirahat pendek / Istirahat panjang** memilih fase secara manual saat tidak berjalan.
5. Titik di bawah cincin: sesi fokus yang selesai di siklus ini. Setelah titik terakhir, istirahat panjang.
6. Panel kiri:
   - **Durasi**: fokus (1–120 mnt, bawaan 25), istirahat pendek (1–60, bawaan 5), istirahat panjang (1–90, bawaan 15), panjang setiap (1–12 sesi, bawaan 4). Perubahan berlaku langsung bila fase belum dimulai, atau mulai fase berikutnya.
   - **Pergantian fase**: otomatis, suara, notifikasi desktop.
   - **Sesi ini**: jumlah sesi fokus selesai dan total waktu fokus. **Mulai siklus baru** mengosongkan hitungan.

**Pintasan keyboard:** Spasi (mulai/jeda), S (lewati), R (reset fase). Diabaikan saat mengetik.

## Struktur file

| File | Isi |
| --- | --- |
| `index.ts` | `ToolDefinition`. |
| `PomodoroTool.tsx` | Halaman: tab fase, cincin, titik sesi, tombol, panel setelan, pintasan. |
| `PomodoroSkeleton.tsx` | Skeleton (bar, panel, tab, cincin, titik, tombol). |
| `Preview.tsx` | SVG mini untuk home. |
| `pomodoro.css` | Label fase, titik sesi, tab nonaktif. Muka jam memakai `timer/timer.css`. |
| `lib/pomodoro.ts` | Reducer murni siklus + `pomodoroRemaining`, `pomodoroProgress`, `sanitizeSettings`. |
| `lib/store.ts` | Store modul: state, penjadwalan akhir fase, bunyi/notifikasi, simpan setelan. |
| `lib/pomodoro.test.ts` | Test siklus, jeda, lewati, otomatis, setelan. |

Dipakai dari Timer: `alarm.ts` (bip, getar, notifikasi dengan `tag` sendiri), `hooks.ts` (`useNow`), `time.ts` (format), `timer.css`.

## Model data

```ts
PomodoroSettings { focus, short, long /* menit */, longEvery /* sesi */, autoStart }
PomodoroState    { phase: "focus" | "short" | "long", status: "idle" | "running" | "paused", endAt, remaining, cycle, completed, focused }
```

localStorage `pomodoro:settings` = `PomodoroSettings` + `{ sound, notify }`. Dibaca lewat `sanitizeSettings`, jadi nilai rusak kembali ke bawaan.

## Alur penting

- **Akurasi** sama dengan Timer: sisa waktu = `endAt − Date.now()`, bukan hitungan tick. `scheduleFinish` menjadwal ulang bila `setTimeout` terpanggil terlalu cepat.
- **Siklus**: `cycle` naik tiap sesi fokus selesai penuh; saat mencapai `longEvery`, fase berikutnya istirahat panjang dan `cycle` kembali 0. Melewati fokus tidak menaikkan `cycle`.
- **Mode otomatis** hanya berlaku saat fase habis sendiri, tidak saat Lewati, agar menekan Lewati tidak langsung memulai hitungan.
- **Bunyi** berupa bip Timer yang diulang tiga kali saja (bukan 60 detik seperti alarm Timer), karena pergantian fase bukan alarm darurat.
- **Notifikasi** memakai tag `productivity-tools-pomodoro`, sehingga tidak menimpa notifikasi Timer yang mungkin berjalan bersamaan.

## Batasan

- Hitungan sesi tidak disimpan (disengaja: tidak ada data user yang disimpan).
- Bila tab dibekukan browser (layar ponsel terkunci lama), bunyi bisa terlambat sampai tab aktif lagi; angka tetap benar.
- Notifikasi di sebagian browser ponsel butuh service worker dan tidak muncul.

## Ide pengembangan

- Catatan tugas per sesi.
- Pilihan bunyi dan volume.
- Mode layar penuh dengan angka besar.
