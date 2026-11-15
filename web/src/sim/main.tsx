import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../ui/base.css";
import { SimPage } from "./SimPage";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("sim/index.html has no #root element");
}

createRoot(root).render(
  <StrictMode>
    <SimPage />
  </StrictMode>,
);
