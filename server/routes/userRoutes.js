import crypto from "crypto";
import express from "express";
import { writeFile } from "fs/promises";
import directoryDB from "../directoriesDB.json" with { type: "json" };
import authMiddleware from "../middlewares/auth.js";
import userDB from "../usersDB.json" with { type: "json" };

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, password, email } = req.body;

  const isUserFound = userDB.find((user) => user.email === email);
  if (isUserFound)
    return res.status(409).json({ error: "User already exists" });

  const userId = crypto.randomUUID();
  const dirId = crypto.randomUUID();

  directoryDB.push({
    id: dirId,
    userId,
    name: `root-${email}`,
    parentDirId: null,
    files: [],
    directories: [],
  });

  userDB.push({
    id: userId,
    name,
    email,
    password,
    rootDirId: dirId,
  });

  try {
    await writeFile("./usersDB.json", JSON.stringify(userDB));
    await writeFile("./directoriesDB.json", JSON.stringify(directoryDB));
    return res.status(201).json({ message: "User registered" });
  } catch (e) {
    console.log(e);
    return res.json({ error: e.message });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  const { id, name, email } = req.user;
  return res.json({ user: { id, name, email } });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = userDB.find(
    (item) => item.email === email && item.password === password,
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  console.log("Login request received:", req.body);
  res.cookie("uid", user.id, {
    httpOnly: true, // cookie will not be accessed from client
    maxAge: 60 * 1000 * 60 * 24 * 7, // 1 week
  });

  return res.json({
    message: "Login successful",
    dirId: user.rootDirId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      dirId: user.rootDirId,
    },
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("uid", { httpOnly: true });
  return res.json({ message: "Logged out successfully" });
});

export default router;
