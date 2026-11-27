import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { copy } from "../copy";
import "../ui/base.css";
import { Wordmark } from "../ui/Wordmark";
import "./Share.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="share">
      <div className="share-mark">
        <Wordmark />
        <p className="share-tagline">{copy.start.taglines[0]}</p>
      </div>
    </main>
  </StrictMode>,
);
