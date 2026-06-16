import express from "express";
import { authorizeJWT, getAuthConfigWithDefaults } from "@microsoft/agents-hosting";
import { agentApp } from "./agent";
import { registerExportRoutes } from "./exportServer";

// Custom server bootstrap (replaces the SDK's startServer) so we can mount
// PUBLIC routes (PDF/Excel downloads, health check) BEFORE the bot's JWT auth.
const authConfig = getAuthConfigWithDefaults();
const adapter = agentApp.adapter;

const app = express();
app.use(express.json());

// Public routes — must be registered before authorizeJWT.
registerExportRoutes(app);

// Bot endpoint behind JWT auth.
app.use(authorizeJWT(authConfig));
app.post("/api/messages", (req, res) =>
  adapter.process(req, res, (context) => agentApp.run(context), (agentApp as any).options?.headerPropagation),
);

const port = process.env.PORT || 3978;
app.listen(port, () => {
  console.log(`Pega Blueprint agent listening on port ${port}`);
});
