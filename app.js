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

app.use(express.urlencoded());

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

var redisHost;
if (process.env.CHANNEL == "docker") {
  redisHost = "redis";
  console.log("Working inside a Docker container. Using containerized redis store.");
} else {
  redisHost = "127.0.0.1";
  console.log("Docker environment not set. Using local redis store.");
}
app.use(cookieParser("testsecret"));
var sessionStore = new RedisStore({
  host: redisHost,
  port: 6379
});
app.use(
  session({
    store: sessionStore,
    secret: "testsecret",
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

client = redis.createClient(6379, redisHost);
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
    res.send(`
    <h1>Hello, ${req.session.name}!</h1>
    <a href="/logout">Logout</a>
  `);
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
    var sessionID = cookieParser.signedCookie(cookies["connect.sid"], "testsecret");
    sessionStore.load(sessionID, function(err, session) {
      if (err) return console.log(err);
      if (session) {
        session.cookie = undefined;
        socket.sessionData = session;
      }
      next();
    });
  });

  io.on("connection", async function(socket) {
    socket.emit("personalInfo", socket.sessionData);
  });

  http.listen(8000, function() {});
});