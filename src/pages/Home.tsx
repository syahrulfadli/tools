import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowRight, Search, X } from "lucide-react";
import { AppFrame } from "../components/AppFrame";
import { categories, findCategory } from "../tools/categories";
import { groupByCategory, preloadTool, searchTools, toolPath, tools } from "../tools/registry";
import type { ToolDefinition } from "../tools/types";
import "./home.css";

export function Home() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState(() => findCategory(params.get("kategori"))?.id ?? null);
  const trimmed = query.trim();
  const matches = useMemo(() => searchTools(query), [query]);
  const results = categoryId ? matches.filter((tool) => tool.category === categoryId) : matches;
  const groups = groupByCategory(results);
  const activeCategory = findCategory(categoryId);

  // Simpan kata kunci dan kategori di URL (?q=, ?kategori=) agar bisa dibagikan
  // dan bertahan saat kembali dari tool.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    if (categoryId) next.set("kategori", categoryId);
    else next.delete("kategori");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [trimmed, categoryId, params, setParams]);

  // "/" memfokuskan pencarian dari mana saja di halaman.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.closest("input, textarea, [contenteditable]")) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppFrame>
      <title>Productivity Tools: kolase foto, konverter PDF, timer, dan jam dunia</title>
      <div className="home">
        <section className="home__hero" aria-labelledby="home-title">
          <h1 id="home-title">Productivity Tools</h1>
          <p>Kumpulan tools receh untuk produktivitas harian.</p>
          <p className="home__credit">
            Dibangun dengan pustaka open source. <Link to="/kredit">Lihat kredit</Link>
          </p>
          <form
            className="search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (results[0]) navigate(toolPath(results[0]));
            }}
          >
            <Search className="search__icon" size={20} strokeWidth={1.5} aria-hidden="true" />
            <label htmlFor="tool-search" className="visually-hidden">
              Cari tool
            </label>
            <input
              id="tool-search"
              ref={inputRef}
              type="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Cari tool, mis. kolase, foto, grid"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              aria-describedby="search-hint"
            />
            {query ? (
              <button
                type="button"
                className="search__clear btn btn--ghost btn--icon"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Hapus pencarian"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            ) : (
              <kbd className="search__key" aria-hidden="true">
                /
              </kbd>
            )}
            <span id="search-hint" className="visually-hidden">
              Tekan Enter untuk membuka hasil pertama.
            </span>
          </form>
        </section>

        <section className="tools" aria-label="Daftar tool">
          <div className="tools__bar">
            <div className="chips" role="radiogroup" aria-label="Kategori">
              <Chip label="Semua" count={matches.length} active={!categoryId} onClick={() => setCategoryId(null)} />
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  count={matches.filter((tool) => tool.category === category.id).length}
                  active={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                />
              ))}
            </div>
            <p className="num" aria-live="polite">
              {trimmed
                ? `${results.length} tool cocok dengan “${trimmed}”`
                : `${results.length} dari ${tools.length} tool`}
            </p>
          </div>

          {groups.length > 0 ? (
            groups.map(({ category, tools: list }) => (
              <section key={category.id} className="tool-group" aria-labelledby={`group-${category.id}`}>
                <header className="tool-group__head">
                  <h2 id={`group-${category.id}`}>{category.name}</h2>
                  <p>{category.description}</p>
                </header>
                <ul className="tools__list">
                  {list.map((tool) => (
                    <ToolRow key={tool.slug} tool={tool} />
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <div className="tools__empty">
              <p>
                {trimmed
                  ? `Belum ada tool ${activeCategory ? `${activeCategory.name} ` : ""}untuk “${trimmed}”. Coba kata lain, misalnya “foto” atau “pdf”.`
                  : `Belum ada tool di ${activeCategory?.name ?? "kategori ini"}.`}
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setQuery("");
                  setCategoryId(null);
                }}
              >
                Tampilkan semua tool
              </button>
            </div>
          )}
        </section>
      </div>
    </AppFrame>
  );
}

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={active} className={`chip${active ? " is-active" : ""}`} onClick={onClick}>
      {label}
      <span className="num">{count}</span>
    </button>
  );
}

function ToolRow({ tool }: { tool: ToolDefinition }) {
  return (
    <li>
      <Link
        to={toolPath(tool)}
        className="tool-row"
        onPointerEnter={() => preloadTool(tool)}
        onFocus={() => preloadTool(tool)}
      >
        <div className="tool-row__preview">
          <tool.Preview />
        </div>
        <div className="tool-row__body">
          <h3>{tool.name}</h3>
          <p>{tool.description}</p>
        </div>
        <span className="tool-row__go">
          Buka
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}
