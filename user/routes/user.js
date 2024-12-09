const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authMiddleware=require('../middleware/authmiddleware')

// Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });
    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    // Set cookie
    res.cookie("token", token);

    res.status(201).json({ message: "User Registered Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


//login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    delete user._doc.password;

    res.cookie("token", token);

    res.send({ token, user });
  } catch (error) {
    console.error("Error in /login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout 
router.post('/logout', (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        console.error('Error in /logout:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Profile 
router.get('/profile',authMiddleware.userAuth, (req, res) => {
    try {
        res.status(200).json({ user: req.user });
    } catch (error) {
        console.error('Error in /profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Ride Accepted Event
router.get('/ride-accepted', (req, res) => {
    // Long polling: wait for 'ride-accepted' event
    rideEventEmitter.once('ride-accepted', (data) => {
        res.status(200).json(data);
    });

    // Timeout for long polling (30 seconds)
    setTimeout(() => {
        res.status(204).send();
    }, 30000);
});

module.exports = router;
