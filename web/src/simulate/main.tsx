import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../ui/base.css";
import { SimulatePage } from "./SimulatePage";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("simulate/index.html has no #root element");
}

createRoot(root).render(
  <StrictMode>
    <SimulatePage />
  </StrictMode>,
);
