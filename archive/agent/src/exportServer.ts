// Public HTTP routes that serve generated PDF/Excel files.
// Mounted BEFORE the bot's JWT auth so download links work from a browser.

import type { Express, Request, Response } from "express";
import { pega } from "./pega/store";
import { buildPdf, buildXlsx, safeFileName } from "./export";

export function registerExportRoutes(app: Express): void {
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).send("ok");
  });

  app.get("/api/export/:blueprintId/:format", async (req: Request, res: Response) => {
    const blueprintId = String(req.params.blueprintId);
    const format = String(req.params.format);
    const bp = pega.get(blueprintId);
    if (!bp) {
      res.status(404).send("Blueprint not found");
      return;
    }
    try {
      const fileBase = safeFileName(bp.title);
      if (format === "pdf") {
        const buf = await buildPdf(bp);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.pdf"`);
        res.end(buf);
        return;
      }
      if (format === "excel" || format === "xlsx") {
        const buf = await buildXlsx(bp);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.xlsx"`);
        res.end(buf);
        return;
      }
      res.status(400).send("Unsupported format. Use 'pdf' or 'excel'.");
    } catch (err) {
      console.error("export failed", err);
      res.status(500).send("Export failed");
    }
  });
}
