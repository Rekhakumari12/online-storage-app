// const uuidRegex =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{24}$/i;

const validateIdMiddleware = (req, res, next, id) => {
  const currId = Array.isArray(id) ? id[0] : id;
  if (typeof currId !== "string" && currId.length !== 24) {
    return res.status(400).json({ message: "validation error: Invalid id" });
  }
  next();
};

export default validateIdMiddleware;
