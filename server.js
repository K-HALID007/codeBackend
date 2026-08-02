import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import snippetRoutes from "./routes/snippetRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "x-pin"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
});

// Store active users with their info
const activeUsers = new Map();

// Make io accessible to routes
app.set("io", io);

// 🔥 CRITICAL: Middleware to emit Socket.IO events after REST API operations
// This ensures real-time updates happen automatically
app.use(
  "/api/snippets",
  (req, res, next) => {
    // Store the original json method
    const originalJson = res.json.bind(res);

    // Override json method to emit socket events after response is sent
    res.json = function (data) {
      // Get the io instance
      const io = req.app.get("io");

      // Emit events based on the request method and response status
      if (data.isFolderRename) {
        console.log("📂 Auto-emitting folder-renamed event");
        io.emit("folder-renamed", data.data);
      } else if (req.method === "POST" && res.statusCode === 201 && data.data) {
        // Snippet created - broadcast to all clients
        console.log("✨ Auto-emitting snippet-created event");
        io.emit("snippet-created", data.data);
      } else if (
        (req.method === "PUT" || req.method === "PATCH") &&
        res.statusCode === 200 &&
        data.data
      ) {
        // Snippet updated - broadcast to all clients
        console.log("🔄 Auto-emitting snippet-updated event");
        io.emit("snippet-updated", data.data);
      } else if (req.method === "DELETE" && res.statusCode === 200) {
        // Snippet deleted - broadcast to all clients
        const snippetId = req.params.id;
        console.log("🗑️ Auto-emitting snippet-deleted event for:", snippetId);
        io.emit("snippet-deleted", snippetId);
      }

      // Call the original json method
      return originalJson(data);
    };

    next();
  },
  snippetRoutes,
);

// Socket.IO Connection Handling
io.on("connection", (socket) => {
  console.log(`⚡ New client connected: ${socket.id}`);

  // Add user to active users
  activeUsers.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
  });

  // Emit updated user count to all clients
  io.emit("user-count", activeUsers.size);

  // Send welcome message to newly connected client
  socket.emit("connected", {
    userId: socket.id,
    activeUsers: activeUsers.size,
    timestamp: new Date().toISOString(),
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} | Reason: ${reason}`);
    activeUsers.delete(socket.id);
    io.emit("user-count", activeUsers.size);
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error.message);
  });
});

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`,
      );
    });
    next();
  });
}

// Routes
app.use("/api/snippets", snippetRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Code Snippet Manager API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      snippets: "/api/snippets",
      health: "/api/health",
    },
    socket: {
      active: true,
      users: activeUsers.size,
    },
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size,
    socketConnections: io.engine.clientsCount,
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Server running in ${(process.env.NODE_ENV || "development").padEnd(6)} mode      ║
║   📡 Port: ${PORT}                              ║
║   🌐 URL: http://localhost:${PORT}             ║
║   🔌 Socket.IO: Enabled                       ║
║   📊 Health: http://localhost:${PORT}/api/health ║
╚═══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("\n🔄 Shutting down gracefully...");

  io.close(() => {
    console.log("🔌 Socket.IO connections closed");
  });

  server.close(() => {
    console.log("🌐 HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("❌ Forcefully shutting down");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
});

process.on("uncaughtException", (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

export default app;
