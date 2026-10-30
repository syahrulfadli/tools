import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { AppFrame } from "../components/AppFrame";
import { toolPath, tools } from "../tools/registry";
import type { ToolDefinition } from "../tools/types";
import { libraries, shared, toolCredits, toolNotes, type Library, type LibraryId } from "./credits-data";
import "./credits.css";

export function Credits() {
  return (
    <AppFrame>
      <title>Kredit · Productivity Tools</title>
      <div className="credits">
        <Link to="/" className="credits__back">
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Semua tool
        </Link>
        <header className="credits__head">
          <h1>Kredit</h1>
          <p>Pustaka open source yang menjadi inti tiap tool. Terima kasih kepada para pembuat dan pemeliharanya.</p>
        </header>

        <section aria-labelledby="credits-core">
          <h2 id="credits-core">Pustaka inti tool</h2>
          <ul className="credits__libs credits__libs--card">
            {Object.entries(libraries).map(([id, library]) => {
              const users = tools.filter((tool) => toolCredits[tool.slug]?.includes(id as LibraryId));
              return <LibraryRow key={id} library={library} tools={users} />;
            })}
          </ul>
        </section>

        <section aria-labelledby="credits-native">
          <h2 id="credits-native">Tanpa pustaka tambahan</h2>
          <ul className="credits__libs credits__libs--card">
            {tools
              .filter((tool) => !toolCredits[tool.slug])
              .map((tool) => (
                <li key={tool.slug} className="credits__lib">
                  <div className="credits__lib-head">
                    <strong>
                      <Link to={toolPath(tool)}>{tool.name}</Link>
                    </strong>
                  </div>
                  <p>{toolNotes[tool.slug]}</p>
                </li>
              ))}
          </ul>
        </section>

        <section aria-labelledby="credits-shared">
          <h2 id="credits-shared">Dipakai di seluruh situs</h2>
          <ul className="credits__libs credits__libs--card">
            {shared.map((library) => (
              <LibraryRow key={library.name} library={library} />
            ))}
          </ul>
        </section>
      </div>
    </AppFrame>
  );
}

function LibraryRow({ library, tools: users }: { library: Library; tools?: ToolDefinition[] }) {
  return (
    <li className="credits__lib">
      <div className="credits__lib-head">
        <strong>{library.name}</strong>
        <span className="credits__license">{library.license}</span>
        <div className="credits__links">
          <a href={library.github} target="_blank" rel="noopener noreferrer" aria-label={`${library.name} di GitHub`}>
            GitHub
          </a>
          <a href={library.npm} target="_blank" rel="noopener noreferrer" aria-label={`${library.name} di npm`}>
            npm
          </a>
        </div>
      </div>
      <p>{library.role}</p>
      {users && users.length > 0 && (
        <ul className="credits__tools" aria-label={`Tool yang memakai ${library.name}`}>
          {users.map((tool) => (
            <li key={tool.slug}>
              <Link to={toolPath(tool)}>{tool.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
