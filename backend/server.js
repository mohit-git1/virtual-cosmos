require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const Connection = require("./models/Connection");

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtualcosmos')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const users = {}; // store user positions
const chatHistory = {}; // in-memory chat array caching
const activeConnections = {}; // store Mongo Connection IDs

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Let users join explicitly
  socket.on("joinSpace", async (name) => {
    socket.data.name = name;
    try {
      const userDoc = await User.findOneAndUpdate(
        { name },
        { socketId: socket.id, lastSeen: Date.now(), $inc: { totalSessions: 1 } },
        { upsert: true, new: true }
      );
      socket.data.userId = userDoc._id;
    } catch(err) {
      console.error("Mongo Auth Error:", err);
    }
    // create new user at random distinct position
    users[socket.id] = {
      id: socket.id,
      name: name,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200
    };

    console.log(`User registered: ${name} (${socket.id})`);

    // send existing users to the new user
    socket.emit("currentUsers", users);

    // notify other users about new user
    socket.broadcast.emit("newUser", {
      id: socket.id,
      name: name,
      x: users[socket.id].x,
      y: users[socket.id].y
    });

    socket.broadcast.emit("user:joined", { id: socket.id, name });
    io.emit("room:count", { current: io.sockets.sockets.size, max: 50 });
  });

  // movement update
  socket.on("move", (data) => {
    if (users[socket.id]) {
      users[socket.id].x = data.x;
      users[socket.id].y = data.y;

      io.emit("userMoved", {
        id: socket.id,
        x: data.x,
        y: data.y
      });
    }
  });

  // chat rooms
  socket.on("joinRoom", (room) => {
    socket.join(room);
    socket.emit("joinedRoom", room);
    console.log(`${socket.id} joined room ${room}`);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    socket.emit("leftRoom");
    console.log(`${socket.id} left room ${room}`);
  });

  // messaging tracking MongoDB overrides
  socket.on("sendMessage", async (msgData) => {
    socket.to(msgData.room).emit("chatMessage", msgData);

    const toName = msgData.toName || msgData.room.replace(socket.id, "").replace("-", ""); // Temporary fallback calculation if pure P2P array isn't fully synced
    const myName = socket.data.name;

    if(myName && msgData.toId) {
       const pairKey = [myName, msgData.toName].sort().join('__');
       try {
         await Message.create({ pairKey, senderName: myName, message: msgData.text });
         if (!chatHistory[pairKey]) chatHistory[pairKey] = [];
         chatHistory[pairKey].push({ senderName: myName, message: msgData.text, timestamp: Date.now() });
         if(chatHistory[pairKey].length > 200) chatHistory[pairKey].shift();
       } catch (err) {
          console.error("Message Save err:", err);
       }
    }
  });

  socket.on("chat:history:request", async ({ withId, withName }) => {
     const myName = socket.data.name;
     if(!myName || !withName) return;

     const pairKey = [myName, withName].sort().join('__');
     
     try {
       const messages = await Message.find({ pairKey }).sort({ timestamp: 1 }).limit(200).lean();
       socket.emit("chat:history:response", messages.map(m => ({ senderName: m.senderName, message: m.message, timestamp: m.timestamp })));
     } catch(err) {
       console.error("History fetch err:", err);
     }
  });

  // proximity event broadcasting pairing bounds
  socket.on("proximity:enter", async (otherId) => {
    socket.to(otherId).emit("proximity:enter", { id: socket.id, name: users[socket.id]?.name });
    
    // Create new mongo tracker
    const myName = socket.data.name;
    const otherName = users[otherId]?.name;
    if (myName && otherName) {
      const pairKey = [myName, otherName].sort().join('__');
      try {
        const connDoc = await Connection.create({ nameA: myName, nameB: otherName });
        activeConnections[pairKey] = { id: connDoc._id, start: Date.now() };
      } catch (e) { console.error("Conn Log Err:", e); }
    }
  });

  socket.on("proximity:leave", async (otherId) => {
    socket.to(otherId).emit("proximity:leave", { id: socket.id, name: users[socket.id]?.name });

    const myName = socket.data.name;
    const otherName = users[otherId]?.name;
    if (myName && otherName) {
      const pairKey = [myName, otherName].sort().join('__');
      const active = activeConnections[pairKey];
      if (active) {
         const duration = Math.floor((Date.now() - active.start) / 1000);
         try {
           await Connection.findByIdAndUpdate(active.id, { endedAt: Date.now(), duration });
         } catch(e) { console.error("Ended Conn Log Err:", e); }
         delete activeConnections[pairKey];
      }
    }
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (users[socket.id]) {
      socket.broadcast.emit("user:left", { id: socket.id, name: users[socket.id].name });
    }
    delete users[socket.id];
    io.emit("userDisconnected", socket.id);
    io.emit("room:count", { current: io.sockets.sockets.size, max: 50 });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});