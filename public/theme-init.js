// Dijalankan di <head> sebelum render pertama agar tidak ada kedipan tema terang.
// Logikanya sama dengan src/lib/theme.ts; ubah keduanya bersamaan.
// File terpisah (bukan inline) karena CSP hanya mengizinkan script-src 'self'.
(function () {
  var mode = null;
  try {
    mode = localStorage.getItem("theme");
  } catch (e) {}
  var dark = mode === "dark" || (mode !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#111213" : "#f3f4f2");
})();
