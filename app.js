var express = require("express");
var session = require("express-session");
var redis = require("redis");
var RedisStore = require("connect-redis")(session);
var app = express();
var bluebird = require("bluebird");
var cookie = require("cookie");
var cookieParser = require("cookie-parser");
var http = require("http").Server(app);
var io = require("socket.io")(http);
var RedisStream = require("redis-stream");
var JSONStream = require("JSONStream");

var fs = require("fs"),
  path = require("path"),
  filePath = path.join(__dirname, "/public/index.html");

app.use(express.urlencoded());
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

var secret = "ThIsIsOuRsEcReT";
var redisHost;
if (process.env.CHANNEL == "docker") {
  redisHost = "redis";
  console.log("Working inside a Docker container. Using containerized redis store.");
} else {
  redisHost = "127.0.0.1";
  console.log("Docker environment not set. Using local redis store.");
}

var RedisStreamClient = new RedisStream(6379, redisHost);
app.use(cookieParser(secret));
var sessionStore = new RedisStore({
  host: redisHost,
  port: 6379
});
app.use(
  session({
    store: sessionStore,
    secret: secret,
    resave: true, // Don't force a reforce on unmodified sessions
    saveUninitialized: true // Don't store sessions that are unmodified
  })
);

authentication = function(req, res, next) {
  if (req.session.name) {
    next();
  } else {
    res.redirect("/login");
  }
};

var pub = redis.createClient(6379, redisHost);
var sub = redis.createClient(6379, redisHost);

var client = redis.createClient(6379, redisHost);
client.on("connect", function() {
  app.get("/login", function(req, res) {
    res.sendFile(__dirname + "/public/login.html");
  });

  app.post("/login", function(req, res) {
    console.log("Authenticated " + req.body.name);
    req.session.name = req.body.name;
    res.redirect("/");
  });

  app.use(authentication);

  app.get("/", function(req, res) {
    fs.readFile(filePath, { encoding: "utf-8" }, function(err, data) {
      if (!err) {
        data = data.replace("$$USERNAME$$", req.session.name);
        return res.send(data);
      } else {
        console.log(err);
      }
    });
  });

  app.get("/logout", function(req, res) {
    console.log("Deauthorized " + req.session.name);
    req.session.destroy();
    res.redirect("/");
  });

  app.get("/chat", function(req, res) {
    res.sendFile(__dirname + "/public/chat.html");
  });
  app.get("/socketioclient", function(req, res) {
    res.sendFile(__dirname + "/public/socket.io.js");
  });

  io.use(function(socket, next) {
    var cookies = cookie.parse(socket.request.headers.cookie);
    var sessionID = cookieParser.signedCookie(cookies["connect.sid"], secret);
    sessionStore.load(sessionID, function(err, session) {
      if (err) return console.log(err);
      if (session) {
        session.cookie = undefined;
        socket.sessionData = session;
      }
      next();
    });
  });

  var stream = RedisStreamClient.stream("get");
  stream.pipe(process.stdout);
  io.on("connection", async function(socket) {
    socket.emit("personalInfo", socket.sessionData);
    socket.on("message", function(data) {
      pub.publish("completeChat", "<" + socket.sessionData.name + ">: " + data);
    });
  });
  sub.on("message", function(channel, message) {
    client.set("chatlog", message + "\n");
    io.emit("message", message);
    stream.write("chatlog");
  });
  sub.subscribe("completeChat");

  http.listen(8000, function() {});
});
