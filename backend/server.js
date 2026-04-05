const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const users = {}; // store user positions

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // create new user at random distinct position
  users[socket.id] = {
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200
  };

  // send existing users to the new user
  socket.emit("currentUsers", users);

  // notify other users about new user
  socket.broadcast.emit("newUser", {
    id: socket.id,
    x: users[socket.id].x,
    y: users[socket.id].y
  });

  // movement update
  socket.on("move", (data) => {
    users[socket.id] = data;

    io.emit("userMoved", {
      id: socket.id,
      x: data.x,
      y: data.y
    });
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

  // messaging
  socket.on("sendMessage", (msgData) => {
    // msgData contains { room, senderId, text, timestamp }
    socket.to(msgData.room).emit("chatMessage", msgData);
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete users[socket.id];
    io.emit("userDisconnected", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});