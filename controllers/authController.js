const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { userSignup, sendNewUserMail } = require("../utils/emailNotification");
const { getCoordinates } = require("../utils/coordinates");

exports.signup = async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    password,
    address, // expects: { street, city, state, zip }
    paymentMethods = [], // optional, can be empty initially
  } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const addressString = `${address.street}, ${address.city}, ${address.state}`;
    const { lat, lng } = await getCoordinates(addressString);
    const user = await User.create({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      address,
      latitude: lat,
      longitude: lng,
      pets: [],
      bookings: [],
      consultations: [],
      paymentMethods,
    });
    console.log(user);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const data = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
    }
    const create = await userSignup(data);
    if (create) {
    const sendMail = await sendNewUserMail(data);
    }
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id, name: user.name, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};
