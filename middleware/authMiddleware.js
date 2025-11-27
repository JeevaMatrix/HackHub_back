const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // Token is in HTTP-only cookie
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token found" });
    }

    // Verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info
    req.user = decoded;

    next();
  } catch (err) {
    console.log("Auth Middleware Error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
