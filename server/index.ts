import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000 or the environment PORT for Replit
  // this serves both the API and the client.
  const port = process.env.PORT || 5000;
  
  // Create a better error handler for address in use errors
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Trying again in 5 seconds...`);
      setTimeout(() => {
        server.close();
        server.listen({
          port: Number(port),
          host: "0.0.0.0"
        });
      }, 5000);
    } else {
      console.error('Server error:', e);
    }
  });
  
  // For Replit, we may need to use the PORT environment variable
  // that their proxy system automatically assigns
  const portNumber = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  
  log(`Attempting to start server on port ${portNumber}`);
  
  // Use a more permissive setup for Replit's proxy system
  server.listen(portNumber, "0.0.0.0", () => {
    log(`Server running at http://0.0.0.0:${portNumber}`);
    log(`WebSocket server is also running on port ${portNumber}`);
    log(`Using GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "Configured" : "Not configured"}`);
  });
})();
