const express = require("express");
const router = express.Router();
const Captain = require("../models/Captain");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authMiddleware=require('../middleware/authmiddleware')
const { subscribeToQueue } = require('../service/rabbit')

// Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingCaptain = await Captain.findOne({ email });
    if (existingCaptain) {
      return res.status(400).json({ message: "Captain already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newCaptain = await Captain.create({
      name,
      email,
      password: hashedPassword,
    });
    // Generate JWT token
    const token = jwt.sign({ id: newCaptain._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    // Set cookie
    res.cookie("token", token);

    res.status(201).json({ message: "Captain Registered Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


//login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const captain = await Captain.findOne({ email }).select("+password");

    if (!captain) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password,captain.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: captain._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    delete captain._doc.password;

    res.cookie("token", token);

    res.send({ token, captain });
  } catch (error) {
    console.error("Error in /login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout 
router.post('/logout', (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ message: 'Captain logged out successfully' });
    } catch (error) {
        console.error('Error in /logout:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Profile 
router.get('/profile',authMiddleware.captainAuth, (req, res) => {
    try {
        res.status(200).json({ captain: req.captain});
    } catch (error) {
        console.error('Error in /profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

//availablity

router.patch('/toogle-availablity',authMiddleware.captainAuth,async(req,res)=>{
  try {
    const captain= await Captain.findById(req.captain._id)
  captain.isAvailable=!captain.isAvailable
  await captain.save()
  res.send(captain)
    
  } catch (error) {
    res.status(500).json({error:error.message})
    
  }
  
})


// Ride Accepted Event
router.get('/new-ride',authMiddleware.captainAuth,(req, res) => {
   // Set timeout for long polling (e.g., 30 seconds)
   req.setTimeout(30000, () => {
    res.status(204).end(); // No Content
    });

    // Add the response object to the pendingRequests array
    pendingRequests.push(res);
});





subscribeToQueue("new-ride", (data) => {
  const rideData = JSON.parse(data);

  // Send the new ride data to all pending requests
  pendingRequests.forEach(res => {
      res.json(rideData);
  });

  // Clear the pending requests
  pendingRequests.length = 0;
});

module.exports = router;
