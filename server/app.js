import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authMiddleware from "./middlewares/auth.js";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import userRouter from "./routes/userRoutes.js";

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

// app.use(["/directory", "/file"], authMiddleware);

// commented this bcs using in above way cors()
// app.use((req, res, next) => {
//   res.set({
//     "Access-Control-Allow-Origin": "*",
//     "Access-Control-Allow-Methods": "*",
//     "Access-Control-Allow-Headers": "*",
//   });
//   next();
// });

app.use("/directory", authMiddleware, directoryRouter);
app.use("/file", authMiddleware, fileRouter);
app.use("/user", userRouter);

app.use((err, req, res, next) => {
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(port, () => {
  console.log("Server is running ");
});
