import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import snippetRoutes from "./routes/snippetRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app); // Needed for socket.io

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Socket.IO real-time communication
io.on("connection", (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);

  // When a snippet is updated, broadcast to all others
  socket.on("update-snippet", (data) => {
    console.log("📝 Snippet updated:", data._id);
    socket.broadcast.emit("snippet-updated", data);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Attach `io` to app so routes can access it if needed
app.set("io", io);

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use("/api/snippets", snippetRoutes);

// Root route
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Server configuration
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

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export default app;
