import { ObjectId } from "mongodb";

async function authMiddleware(req, res, next) {
  const userId = req.cookies.uid;
  if (!userId)
    return res
      .status(401)
      .json({ message: "Please log in to access your files" });

  const db = req.db;
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  if (!user) {
    return res
      .status(401)
      .json({ message: "Please log in to access your files" });
  }

  req.user = user;
  next();
}

export default authMiddleware;
