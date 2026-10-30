# Timer & Stopwatch

Rute: `/tools/timer` (timer) · `/tools/timer?mode=stopwatch` (stopwatch) · Kategori: Waktu (`time`) · Definisi: `src/tools/timer/index.ts`

## Fungsi

Satu tool, dua mode:

- **Timer:** hitung mundur sampai 99:59:59, dengan alarm suara, getar (ponsel), dan notifikasi desktop opsional.
- **Stopwatch:** ukur waktu sampai seperseratus detik, dengan catatan putaran (lap).

Keduanya berjalan bersamaan dan tetap berjalan saat user pindah ke tool lain di tab yang sama. Tidak ada yang disimpan: menutup atau me-reload tab menghapus semuanya.

## Cara pakai

**Timer**

1. Atur durasi: klik angka jam/menit/detik di tengah cincin lalu ketik (panah atas/bawah menambah/mengurangi), atau pilih preset (1, 3, 5, 10, 15, 25 Pomodoro, 30, 45 menit, 1 jam). Durasi hanya bisa diubah saat timer tidak berjalan.
2. **Mulai** → **Jeda** → **Lanjutkan**. **+1 menit** menambah sisa waktu; saat waktu habis, +1 menit menjalankan ulang 1 menit (tunda).
3. Saat habis: cincin dan judul merah, "Waktu habis", hitungan "Lewat 00:12", judul tab "Waktu habis · Timer". Alarm berbunyi tiap detik sampai dimatikan (tombol, Spasi, atau Esc) atau 1 menit berlalu.
4. **Alarm** di panel kiri: sakelar Suara, dan Notifikasi desktop (meminta izin browser saat dinyalakan).

**Stopwatch**

1. **Mulai** / **Jeda** / **Lanjutkan**, **Putaran** mencatat waktu putaran, **Reset** mengosongkan.
2. Tabel putaran (terbaru di atas): nomor, waktu putaran, total. Putaran tercepat dan terlama ditandai bila ada minimal dua putaran yang berbeda.
3. Panel kiri: rata-rata, tercepat, terlama, dan **Salin daftar putaran** (teks dipisah tab, bisa ditempel ke spreadsheet).

**Pintasan keyboard:** Spasi (mulai/jeda; matikan alarm), R (reset), L (putaran, stopwatch), + (tambah 1 menit, timer), Esc (matikan alarm). Diabaikan saat mengetik di kolom isian; Spasi pada tombol lain tetap menekan tombol itu, kecuali tab mode.

## Struktur file

| File | Isi |
| --- | --- |
| `index.ts` | `ToolDefinition`. |
| `TimerTool.tsx` | Halaman: tab mode, panel kiri per mode, pintasan keyboard, judul tab dinamis. |
| `TimerSkeleton.tsx` | Skeleton (bar, panel, tab, cincin, tombol). |
| `Preview.tsx` | SVG mini untuk home. |
| `timer.css` | Tab, angka besar, cincin, tombol, tabel putaran, pintasan. |
| `components/TimerFace.tsx` | Cincin progres, angka (bisa diketik saat diam), tombol, preset (`TIMER_PRESETS`). |
| `components/TimeField.tsx` | Kolom dua digit jam/menit/detik. |
| `components/StopwatchFace.tsx` | Angka seperseratus detik, tombol, tabel putaran. |
| `lib/time.ts` | `formatDuration`, `splitDuration`, `toMs`, `ceilToSecond`, `durationInWords`, `MAX_TIMER`. |
| `lib/timer.ts` | Reducer timer murni + `timerRemaining`, `timerOvertime`, `timerProgress`. |
| `lib/stopwatch.ts` | Reducer stopwatch murni + `stopwatchElapsed`, `lapRows`, `lapAverage`. |
| `lib/store.ts` | Store modul (`clockStore`): state kedua mode, penjadwalan selesai, alarm. |
| `lib/alarm.ts` | Bip Web Audio, getar, notifikasi. |
| `lib/hooks.ts` | `useClock` (useSyncExternalStore), `useNow` (requestAnimationFrame). |
| `lib/clock.test.ts` | Test format, timer, stopwatch. |

## Model data

```ts
TimerState     { status: "idle" | "running" | "paused" | "finished", duration, endAt: number | null, remaining }
StopwatchState { status: "idle" | "running" | "paused", startedAt: number | null, accumulated, splits: number[] }
ClockSnapshot  { timer, stopwatch, ringing: boolean, settings: { sound, notify } }
```

Semua waktu dalam milidetik; `endAt`/`startedAt` adalah stempel `Date.now()`.

## Alur penting

- **Akurasi:** nilai tampilan selalu dihitung dari stempel waktu (`endAt − now`, `accumulated + now − startedAt`), bukan dari jumlah tick. Tab di latar (timer browser diperlambat) atau perangkat tidur tidak membuat waktu melenceng. `Date.now()` dipakai, bukan `performance.now()`, agar waktu tidur perangkat ikut terhitung.
- **Tampilan timer** dibulatkan ke atas ke detik penuh (`ceilToSecond`): 4,2 detik tersisa tampil 00:05, dan 00:00 hanya muncul saat benar-benar habis.
- **Store di modul**, bukan state React: komponen bisa unmount (user ke home) tanpa menghentikan timer. Reducer-nya murni dan menerima `now`, sehingga bisa diuji tanpa jam palsu.
- **Selesai:** `scheduleFinish` memasang `setTimeout` ke `endAt`; bila terpanggil terlalu cepat (penjadwalan browser), ia menjadwal ulang sampai `finish` benar-benar berlaku. Lalu `startAlarm`: bip tiap 1 detik, getar, notifikasi bila diizinkan, berhenti otomatis setelah 60 detik.
- **Suara:** `AudioContext` dibuat/di-resume pada klik Mulai atau +1 menit (aturan autoplay browser). Bunyi berupa oscillator, tanpa file audio.
- **Mode** disimpan sebagai state lokal dan disalin ke `?mode=` untuk tautan. Pembaruan URL React Router berjalan sebagai transition dan bisa tertunda; bila mode dibaca dari URL, Spasi yang ditekan tepat setelah klik tab masih memakai mode lama (ditemukan saat pengujian). Handler keyboard membaca mode lewat ref.
- **Ukuran angka di cincin** memakai container query (`15.5cqi`) agar selalu ±70% lebar cincin dan tidak menyentuh garis di lebar layar mana pun.

## Batasan

- Timer berhenti bila tab ditutup atau dimuat ulang (disengaja: tidak ada penyimpanan).
- Bila tab dibekukan browser (mis. ponsel mengunci layar lama), alarm bisa terlambat berbunyi sampai tab aktif lagi; angka tetap benar saat kembali.
- Notifikasi desktop di sebagian browser ponsel membutuhkan service worker dan tidak muncul.

## Ide pengembangan

- Siklus Pomodoro otomatis (25 kerja / 5 istirahat, hitungan sesi).
- Beberapa timer bernama sekaligus.
- Pilihan bunyi alarm.
