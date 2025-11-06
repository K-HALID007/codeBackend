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
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
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
  },
});

// Store active users
const activeUsers = new Set();

// Socket.IO event handlers
io.on("connection", (socket) => {
  activeUsers.add(socket.id);
  console.log(`⚡ User connected: ${socket.id} | Active: ${activeUsers.size}`);

  // Emit to all connected clients that a user joined
  io.emit("user-count", activeUsers.size);

  // When snippet is created
  socket.on("create-snippet", (data) => {
    console.log("✨ New snippet created:", data.name);
    socket.broadcast.emit("snippet-created", data);
  });

  // When snippet is updated
  socket.on("update-snippet", (data) => {
    console.log("🔄 Snippet updated:", data._id);
    socket.broadcast.emit("snippet-updated", data);
  });

  // When snippet is deleted
  socket.on("delete-snippet", (snippetId) => {
    console.log("🗑️ Snippet deleted:", snippetId);
    socket.broadcast.emit("snippet-deleted", snippetId);
  });

  socket.on("disconnect", () => {
    activeUsers.delete(socket.id);
    console.log(
      `❌ User disconnected: ${socket.id} | Active: ${activeUsers.size}`
    );
    io.emit("user-count", activeUsers.size);
  });
});

app.set("io", io);

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.use("/api/snippets", snippetRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Code Snippet Manager API",
    version: "1.0.0",
    endpoints: {
      snippets: "/api/snippets",
      health: "/api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size,
  });
});

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Server running in ${process.env.NODE_ENV} mode   ║
║   📡 Port: ${PORT}                              ║
║   🌐 URL: http://localhost:${PORT}             ║
╚═══════════════════════════════════════════════╝
  `);
});

process.on("unhandledRejection", (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export default app;
