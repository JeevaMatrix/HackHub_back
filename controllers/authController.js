const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const jwt = require('jsonwebtoken');

// Helper to set cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
  // Access Token (short-lived)
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,      // set true in production (HTTPS)
    sameSite: "strict",
    maxAge: 15 * 60 * 1000 // 15 min
  });

  // Refresh Token (long-lived)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// -----------------------------
// SIGNUP
// -----------------------------
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, collegeId, department, year } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "Missing required fields" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      collegeId,
      department,
      year
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// LOGIN
// -----------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// REFRESH TOKEN
// -----------------------------
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken)
      return res.status(401).json({ message: "Refresh token missing" });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, userData) => {
      if (err) return res.status(403).json({ message: "Invalid refresh token" });

      const newAccessToken = generateAccessToken(userData);
      const newRefreshToken = generateRefreshToken(userData);

      // Set cookies again
      setAuthCookies(res, newAccessToken, newRefreshToken);

      return res.status(200).json({ message: "Token refreshed" });
    });

  } catch (error) {
    console.error("Refresh Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.json({ user: null });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");

    return res.json({ user });

  } catch (err) {
    return res.json({ user: null });
  }
};
