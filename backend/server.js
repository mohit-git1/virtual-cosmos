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

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
const users = {}; // storing socketID  x and y postions

io.on("connection" , (socket) =>{
    console.log("User is Connected: ", socket.id);
        users[socket.id] = {
            x: 100,
            y:100

        };

    socket.emit("currentUsers", users);

        socket.broadcast.emit("newYuser", {
                id: socket.id,
                x:100,
                y:100
            });
    

    });

socket.on("move", (data) => {

  users[socket.id] = data;

  io.emit("userMoved", {
    id: socket.id,
    ...data
  });

});





