import express from "express";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, password, email } = req.body;
  const db = req.db;

  const isUserFound = await db.collection("users").findOne({ email });
  if (isUserFound)
    return res.status(409).json({ error: "User already exists" });

  try {
    const userRootDir = await db.collection("directories").insertOne({
      userId: null,
      name: `root-${email}`,
      parentDirId: null,
    });

    const rootDirId = userRootDir.insertedId;
    const createdUser = await db.collection("users").insertOne({
      name,
      email,
      password,
      rootDirId,
    });
    const userId = createdUser.insertedId;
    await db
      .collection("directories")
      .updateOne({ _id: rootDirId }, { $set: { userId } });
    return res.status(201).json({ message: "User registered" });
  } catch (e) {
    console.log(e);
    return res.json({ error: e.message });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  const { _id, name, email } = req.user;
  return res.json({ user: { id: _id, name, email } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const db = req.db;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await db.collection("users").findOne({ email, password });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const userObjectId = user._id.toString();
  res.cookie("uid", userObjectId, {
    httpOnly: true, // cookie will not be accessed from client
    maxAge: 60 * 1000 * 60 * 24 * 7, // 1 week
  });

  return res.json({
    message: "Login successful",
    dirId: user.rootDirId,
    user: {
      id: userObjectId,
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
