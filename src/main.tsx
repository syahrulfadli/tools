import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { initPwa } from "./lib/pwa";
import { initTheme } from "./lib/theme";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/tool.css";

initTheme();
initPwa();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
