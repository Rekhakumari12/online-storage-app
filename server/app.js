import cors from "cors";
import express from "express";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";

const app = express();
const port = 8080;

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  });
  next();
});

app.use("/directory", directoryRouter);
app.use("/file", fileRouter);

app.use((err, req, res, next) => {
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(port, () => {
  console.log("Server is running ");
});
