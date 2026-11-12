import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../ui/base.css";
import { KitPage } from "./KitPage";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("kit/index.html has no #root element");
}

createRoot(root).render(
  <StrictMode>
    <KitPage />
  </StrictMode>,
);
