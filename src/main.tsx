import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { startOffline } from "./offline/client";
import { RootErrorBoundary } from "./RootErrorBoundary";
import "./index.css";

startOffline();

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

createRoot(root).render(
  <RootErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </RootErrorBoundary>,
);
