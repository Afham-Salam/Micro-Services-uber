const express = require('express');
const router = express.Router();
const rideModel = require('../models/Ride');

const { subscribeToQueue, publishToQueue } = require('../service/rabbit');
const authMiddleware=require('../middleware/authmiddleware')

//  Create a new ride
router.post('/create', authMiddleware.userAuth,async (req, res, next) => {
    console.log( req.user._id)
    try {
        const { pickup, destination } = req.body;

        const newRide = new rideModel({
            user: req.user._id,
            pickup,
            destination
        });

        await newRide.save();
        publishToQueue("new-ride", JSON.stringify(newRide));
        res.status(201).send(newRide);
    } catch (error) {
        next(error);
    }
});

// POST: Accept a ride
router.post('/accept', async (req, res, next) => {
    try {
        const { rideId } = req.query;
        const ride = await rideModel.findById(rideId);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        ride.status = 'accepted';
        await ride.save();
        publishToQueue("ride-accepted", JSON.stringify(ride));
        res.send(ride);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
