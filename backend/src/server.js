import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import researchRoutes from "./routes/researchRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

app.use(helmet());

app.use((req, res, next) => {
  if (req.originalUrl === "/billing/webhook") {
    return next();
  }
  return express.json({
    verify: (request, response, buffer) => {
      request.rawBody = buffer;
    },
  })(req, res, next);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gpt-wiki-pro" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/billing", billingRoutes);
app.use(chatRoutes);
app.use(researchRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`GPT-Wiki PRO backend running on port ${PORT}`);
});
