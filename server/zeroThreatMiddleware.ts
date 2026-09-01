import express from "express";

export function setupZeroThreat(app: express.Express) {
  // Intercept zeroThreat validation requests at the absolute top of the server stack
  app.use((req, res, next) => {
    const rawPath = req.path.toLowerCase().trim();
    // Normalize path by stripping trailing slash
    const cleanPath = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;

    if (
      cleanPath === "/zero-threat" ||
      cleanPath === "/zero-threat.html" ||
      cleanPath === "/zerothreat" ||
      cleanPath === "/zerothreat.html"
    ) {
      console.log(`[ZeroThreat] Request intercepted: Path="${req.path}" Method="${req.method}" IP="${req.ip}"`);

      // Add fully permissive CORS headers so any external tool can access it
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Max-Age", "86400");

      // Prevent caching by CDN or proxy
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Handle preflight options requests
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }

      res.setHeader("Content-Type", "text/html; charset=UTF-8");
      return res.send(`<html lang="en"><head><meta charset="UTF-8"><title>Txt Record Title</title></head><body>zeroThreat=MTAwOTE=TVRBd09URT0=TVRBd09URT</body></html>`);
    }
    next();
  });

  // zeroThreat Verification Routes
  const zeroThreatHandler = (req: express.Request, res: express.Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.send(`<html lang="en"><head><meta charset="UTF-8"><title>Txt Record Title</title></head><body>zeroThreat=MTAwOTE=TVRBd09URT0=TVRBd09URT</body></html>`);
  };

  app.get("/zero-threat", zeroThreatHandler);
  app.get("/zero-threat.html", zeroThreatHandler);
  app.get("/zeroThreat", zeroThreatHandler);
  app.get("/zeroThreat.html", zeroThreatHandler);
  app.get("/zerothreat", zeroThreatHandler);
  app.get("/zerothreat.html", zeroThreatHandler);
}
