import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/heebo";
import "./styles.css";
import { initTheme } from "./app/theme";

initTheme();

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
