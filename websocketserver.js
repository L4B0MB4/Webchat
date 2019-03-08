const server = require("http").createServer();
const io = require("socket.io")(server);
io.on("connection", socket => {
  socket.emit("message", { data: "hier" }); //
  socket.on("message", () => {
    /* … */
  });
});
server.listen(3000);
