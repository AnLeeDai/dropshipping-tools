import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import App from "./App";
import Providers from "./providers";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
