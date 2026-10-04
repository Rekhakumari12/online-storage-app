import cors from "cors";
import express from "express";
import directoryRouter from "./routes/directoryRoutes-old.js";
import fileRouter from "./routes/fileRoutes-old.js";

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
app.use("/files", fileRouter);

app.listen(port, () => {
  console.log("Server is running ");
});
