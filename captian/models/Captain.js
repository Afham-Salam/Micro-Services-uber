const mongoose = require('mongoose');

const captainSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
        select: false, // Exclude the password field by default
    }, 
    isAvailable:{
        type:Boolean,
        default:false
    }
   
});

module.exports = mongoose.model('Captain', captainSchema);