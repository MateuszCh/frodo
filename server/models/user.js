const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"]
    },
    password: {
        type: String,
        required: [true, "Passwor is required"]
    },
    id: {
        type: Number
    }
});

const User = mongoose.model("user", UserSchema);

module.exports = User;
