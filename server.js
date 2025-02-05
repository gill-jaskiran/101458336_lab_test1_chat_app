// Import required modules
const express = require('express');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const cors = require('cors');

// creating istance for express app
const app = express();

// attaching socket.io of http server
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// coonecting to mondo database
mongoose.connect("mongodb+srv://jaskiran:pass@labtest.7pnfy.mongodb.net/?retryWrites=true&w=majority&appName=LabTest")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));


// user schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  firstname: String,
  lastname: String,
  password: { type: String, required: true },
  createdOn: { type: Date, default: Date.now }
});

// group message schema
const GroupMessageSchema = new mongoose.Schema({
  from_user: String,
  room: String,
  message: String,
  date_sent: { type: Date, default: Date.now }
});

// private message schema
const PrivateMessageSchema = new mongoose.Schema({
  from_user: String,
  to_user: String,
  message: String,
  date_sent: { type: Date, default: Date.now }
});

// defining the models
const User = mongoose.model("User", UserSchema); 
const GroupMessage = mongoose.model("GroupMessage", GroupMessageSchema);
const PrivateMessage = mongoose.model("PrivateMessage", PrivateMessageSchema); // not enough time to implement

// event handling for socket.io
io.on("connection", (socket) => {
  console.log("New client connected");

  // Join room event
  socket.on("joinRoom", async ({ username, room }) => {
    socket.join(room);

    try {
      const previousMessages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
      socket.emit("previousMessages", previousMessages); // sending privious messages
    } catch (error) {
      console.error("Error retrieving previous messages:", error);
    }

    // notification when new user joins room
    socket.to(room).emit("message", { username: "System", message: `${username} has joined the room.` });
  });

  // when the user sends a chat
  socket.on("chatMessage", async ({ username, room, message }) => {
    try {
      const newMessage = new GroupMessage({ from_user: username, room, message });
      await newMessage.save(); // gets saved in the database
      io.to(room).emit("message", { username, message }); // message is sent to others
    } catch (error) {
      console.error("Error saving group message:", error);
    }
  });

  // Private message event - not implemented 
  socket.on("privateMessage", async ({ from_user, to_user, message }) => {
    try {
      const newMessage = new PrivateMessage({ from_user, to_user, message });
      await newMessage.save(); // saving private messages
      io.emit("privateMessage", { from_user, to_user, message }); // private messages displayed to others
    } catch (error) {
      console.error("Error saving private message:", error);
    }
  });

  // Typing indicator
  socket.on("typing", ({ username, room }) => {
    socket.to(room).emit("typing", { username });
  });

  // user leaving room message
  socket.on("leaveRoom", ({ username, room }) => {
    socket.leave(room);
    socket.to(room).emit("message", { username: " ", message: `${username} has left the room.` });
  });

  socket.on("disconnect", () => { 
    console.log("User disconnected");// logging
  });
});



// Signup endpoint
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;
    if (!username || !firstname || !lastname || !password) {
      return res.status(400).json({ msg: "Missing required fields" });
    }
    const trimmedUsername = username.trim().toLowerCase();

    // see if user exitss
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.status(400).json({ msg: "Username already exists!" });
    }

    // create new user and save
    const user = new User({
      username: trimmedUsername,
      firstname,
      lastname,
      password
    });

    await user.save();
    res.json({ msg: "Signup successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ msg: "Missing username or password" });
    }
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ msg: "Login successful!", username });
    } else {
      res.status(400).json({ msg: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("Chat Server Running");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
