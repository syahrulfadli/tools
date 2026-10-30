# Jam Dunia

Rute: `/tools/jam-dunia` · Kategori: Waktu (`time`) · Definisi: `src/tools/world-clock/index.ts`

## Fungsi

Menampilkan jam di beberapa kota (sampai 12) sebagai kartu yang bersanding, masing-masing dengan tanggal, bagian hari (pagi, siang, sore, malam, dini hari), singkatan zona (WIB, WITA, WIT, EDT, …), selisih UTC, dan selisih dari waktu lokal perangkat. **Geser waktu** memajukan atau memundurkan semua jam sekaligus untuk mencari jam rapat yang pas di setiap kota.

Data zona waktu (termasuk pergantian musim panas/DST) berasal dari browser lewat `Intl`, tanpa library dan tanpa request ke server.

## Cara pakai

1. Saat pertama dibuka tampil kota lokal (dari zona perangkat) plus London dan New York.
2. **Tambah kota** di panel kiri: ketik nama kota, negara, singkatan (WIB), nama zona (`Asia/Tokyo`), atau selisih (`UTC+9`, `+5:45`). Enter menambah hasil pertama, Esc mengosongkan kolom. Saat kolom kosong tampil chip saran. Daftar berisi ±490 kota di 200 negara/wilayah (setiap negara anggota PBB minimal ibu kotanya).
3. **Pakai lokasi saya**: browser meminta izin lokasi, lalu kota terdekat di daftar ditambahkan dengan keterangan jaraknya ("Veghel, Belanda ditambahkan: kota terdekat di daftar, kurang dari 1 km dari lokasimu"). Tombol hanya tampil di konteks aman (https/localhost).
4. Di tiap kartu: **‹ ›** memindah urutan, **×** menghapus. **Urutkan barat ke timur** di kepala area kerja menyusun ulang menurut selisih UTC.
5. **Tampilan**: Digital atau Analog, format 24 jam atau 12 jam (AM/PM), dan sakelar detik.
6. **Geser waktu**: slider ±24 jam per 15 menit. Bar atas menampilkan pill "Pratinjau +3 jam" dan tombol **Kembali ke sekarang** muncul di kepala area kerja.

Kartu berlatar satu langkah lebih gelap menandakan malam di kota itu (18.00–04.59).

## Struktur file

| File | Isi |
| --- | --- |
| `index.ts` | `ToolDefinition`. |
| `WorldClockTool.tsx` | Halaman: panel (cari, tampilan, geser waktu), kepala area kerja, grid kartu, keadaan kosong. |
| `WorldClockSkeleton.tsx` | Skeleton (bar, tiga seksi panel, tiga kartu). |
| `Preview.tsx` | SVG mini untuk home: dua jam analog berdampingan. |
| `world-clock.css` | Kolom cari dan hasil, grid kartu, angka besar, muka analog. |
| `components/ClockCard.tsx` | Satu kartu kota. |
| `components/AnalogFace.tsx` | Muka jam analog SVG. |
| `components/CitySearch.tsx` | Kolom cari, tombol lokasi (GPS), chip saran, daftar hasil. |
| `lib/zone.ts` | `zoneTime`, `offsetMinutes`, `formatUtcOffset`, `formatDiff`, `formatClock`, `formatDate`, `dayDiff`, `partOfDay`, `zoneAbbreviation`, `localZone`, `isValidZone`, `canonicalZone`/`sameZone` (nama zona lama). |
| `lib/cities.ts` | Data kota pilihan per negara (`CITIES`): nama, negara, zona, alias. |
| `lib/coords.ts` | Koordinat tiap kota (`COORDS`) untuk mencari kota terdekat dari GPS. |
| `lib/places.ts` | `searchPlaces`, `parseOffsetQuery`, `nearestPlace`, `distanceKm`, `defaultPlaces`, `placeForZone`, `zonePlace`, `sortByOffset`, `movePlace`. |
| `lib/persist.ts` | Simpan/muat daftar kota dan tampilan di localStorage, `sanitizeState`. |
| `lib/hooks.ts` | `useSecondTick`: waktu sekarang yang berganti tepat di pergantian detik. |
| `lib/*.test.ts` | Test zona, pencarian, urutan, persist. |

## Model data

```ts
Place            { id, name, country, zone }   // id: slug kota pilihan, atau "zone:<IANA>"
WorldClockState  { places: Place[], face: "digital" | "analog", hour12, seconds }
```

`WorldClockState` disimpan di `localStorage["jam-dunia:v1"]` (kunci dihapus bila sama dengan bawaan). Geser waktu tidak disimpan.

## Alur penting

- **Jam di zona lain** dibaca dari `Intl.DateTimeFormat(..., { timeZone }).formatToParts`. Selisih UTC = jam dinding zona itu dibaca sebagai UTC dikurangi instan sebenarnya, jadi DST dan zona :30/:45 (India, Nepal) ikut benar. Formatter di-cache per zona karena tiap kartu diformat tiap detik.
- **Pembanding** semua kartu adalah zona perangkat (`localZone`) pada instan yang sama, termasuk saat digeser. Pill "Lokal" muncul pada kartu yang zonanya sama persis dengan zona perangkat.
- **Detik**: `useSecondTick` menjadwalkan `setTimeout` ke pergantian detik berikutnya (bukan interval 1000 ms dari saat mount), dan menyegarkan langsung saat tab kembali terlihat.
- **Nama zona lama**: sebagian browser/OS masih melaporkan nama lama (`Asia/Calcutta`, `Europe/Kiev`, `Etc/UTC`). `canonicalZone` memetakannya ke nama di daftar kota agar kartu "Lokal" dan kota bawaan tetap dikenali.
- **Lokasi (GPS)**: `navigator.geolocation.getCurrentPosition` dengan akurasi rendah (tingkat kota cukup, lebih cepat dan hemat baterai), batas 15 detik, posisi cache maksimal 10 menit. `nearestPlace` menghitung jarak lingkaran besar ke semua kota di `COORDS`, sepenuhnya di browser: koordinat tidak dikirim ke server mana pun dan tidak disimpan (tanpa layanan reverse geocoding). Kota yang zonanya sama dengan zona perangkat didahulukan bila paling jauh 150 km lebih jauh dari kota terdekat, supaya di dekat perbatasan (Kerkrade di Belanda, 6 km dari Aachen di Jerman) hasilnya tetap di negara yang benar. `public/_headers` mengizinkan `geolocation=(self)`.
- **Pencarian**: kota pilihan dulu (nama Indonesia + alias seperti "makkah", "wib"), lalu zona dari `Intl.supportedValuesOf("timeZone")` yang tidak diwakili kota pilihan, sehingga kota di luar daftar tetap bisa ditambahkan lewat nama zonanya. Nama zona hanya mencocokkan kota wakilnya ("jakarta" tidak memunculkan Bandung dan Surabaya). Hasil diurutkan: nama berawalan kueri, lalu ada kata di nama yang berawalan kueri, lalu yang cocok lewat negara/alias; maksimal 10 hasil. Kueri berbentuk selisih UTC mencocokkan zona dengan selisih itu saat ini.
- **Menambah kota ke daftar pilihan**: tambahkan nama kota di blok negaranya di `lib/cities.ts` (mis. `["Veghel", "", "brabant meierijstad"]` di blok Belanda; zona "" berarti zona bawaan negara), lalu koordinatnya di `lib/coords.ts` dengan id = slug nama (`veghel: [51.62, 5.55]`). Taruh kota baru **setelah** kota wakil zonanya (Amsterdam untuk `Europe/Amsterdam`), karena kota pertama dengan zona itu yang dipakai untuk mencocokkan nama zona dan sebagai kartu lokal. Test `places.test.ts` memastikan zonanya dikenal, id unik, setiap kota punya koordinat, dan bujurnya cocok dengan selisih UTC zonanya (menangkap tanda minus yang tertukar).
- **Persist**: nilai dari localStorage disaring (`sanitizeState`); kota dengan zona yang tidak dikenal browser ini dibuang. Daftar kosong dihormati sebagai pilihan user.
- **Angka besar** memakai container query (`24cqi` dari lebar kartu) agar dua kartu yang bersanding di layar lebar terbaca dari jauh dan tetap muat di kartu 240px.

## Batasan

- Akurasi data zona bergantung pada versi browser (aturan DST yang baru diubah pemerintah suatu negara baru ikut setelah browser diperbarui).
- Browser lama tanpa `Intl.supportedValuesOf` hanya bisa mencari kota di daftar pilihan.
- Lokasi GPS memilih kota terdekat **di daftar**, bukan nama kota sebenarnya: di desa kecil hasilnya kota terdekat (keterangan jarak ditampilkan). Jam tetap benar karena kota di negara yang sama berbagi zona.
- Kota yang ditambahkan lewat nama zona memakai nama kota acuan IANA (mis. `Asia/Novosibirsk` → Novosibirsk) dan nama wilayah benua, bukan negara.
- Pembanding selalu zona perangkat; belum bisa memilih kota lain sebagai acuan.

## Ide pengembangan

- Ganti nama kartu (mis. "Kantor pusat").
- Pilih kota acuan selain waktu lokal.
- Garis waktu 24 jam per kota dengan jam kerja yang tumpang tindih.
- Tautan berbagi berisi daftar kota (`?kota=jakarta,london`).
- Seret untuk mengurutkan kartu.
