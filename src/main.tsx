import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import App from "./App";
import { AppearanceProvider } from "./AppearanceProvider";
import { applyAppearance, readAppearance } from "./appearance";
import "./aesthetics.css";
import "./App.css";

applyAppearance(readAppearance());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppearanceProvider>
      <App />
    </AppearanceProvider>
  </React.StrictMode>,
);
