import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { connectDB } from "./database.js";
import authMiddleware from "./middlewares/auth.js";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import userRouter from "./routes/userRoutes.js";

try {
  const db = await connectDB();
  console.log(db.namespace);

  const app = express();
  const port = 8080;

  app.use(cookieParser());
  app.use(express.json());
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  );

  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  app.use("/directory", authMiddleware, directoryRouter);
  app.use("/file", authMiddleware, fileRouter);
  app.use("/user", userRouter);

  app.use((err, req, res, next) => {
    res
      .status(500)
      .json({ message: "Global error handling: Something went wrong " });
  });

  app.listen(port, () => {
    console.log("Server is running ");
  });
} catch (e) {
  console.log(e);
}
