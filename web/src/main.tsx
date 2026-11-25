import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./ui/base.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("index.html has no #root element");
}

// Keeps the app and its data on the phone for offline rolls (web/README.md#Installing); development serves fresh
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => console.error(error));
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
