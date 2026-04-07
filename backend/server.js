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

  // Let users join explicitly
  socket.on("joinSpace", (name) => {
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

  // messaging
  socket.on("sendMessage", (msgData) => {
    socket.to(msgData.room).emit("chatMessage", msgData);
  });

  // proximity event broadcasting pairing bounds
  socket.on("proximity:enter", (otherId) => {
    socket.to(otherId).emit("proximity:enter", { id: socket.id, name: users[socket.id]?.name });
  });

  socket.on("proximity:leave", (otherId) => {
    socket.to(otherId).emit("proximity:leave", { id: socket.id, name: users[socket.id]?.name });
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (users[socket.id]) {
      socket.broadcast.emit("user:left", { id: socket.id, name: users[socket.id].name });
    }
    delete users[socket.id];
    io.emit("userDisconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});