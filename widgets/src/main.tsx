import React from "react";
import { createRoot } from "react-dom/client";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
} from "@fluentui/react-components";
import { McpBridgeProvider, useBridge } from "./mcp/McpBridge";
import { App } from "./App";

function Themed() {
  const { theme } = useBridge();
  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme} style={{ height: "100%" }}>
      <App />
    </FluentProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <McpBridgeProvider appName="pega-blueprint">
      <Themed />
    </McpBridgeProvider>
  </React.StrictMode>,
);
