const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateIdMiddleware = (req, res, next, id) => {
  if (typeof id !== "string" || !uuidRegex.test(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  console.log("Running the param id", req.method, { id });
  next();
};

export default validateIdMiddleware;
