import userDB from "../usersDB.json" with { type: "json" };

function authMiddleware(req, res, next) {
  const userId = req.cookies.uid;
  const user = userDB.find((user) => user.id === userId);

  if (!user) {
    return res
      .status(401)
      .json({ message: "Please log in to access your files" });
  }

  req.user = user;
  next();
}

export default authMiddleware;
