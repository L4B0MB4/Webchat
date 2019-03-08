var express = require("express");
var session = require("express-session");
var redis = require("redis");
var RedisStore = require("connect-redis")(session);
var app = express();
var bluebird = require("bluebird");

app.use(express.urlencoded());

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

var redisHost;
if (process.env.CHANNEL == "docker") {
  redisHost = "redis";
  console.log(
    "Working inside a Docker container. Using containerized redis store."
  );
} else {
  redisHost = "192.168.99.100";
  console.log("Docker environment not set. Using local redis store.");
}

app.use(
  session({
    store: new RedisStore({
      host: redisHost,
      port: 6379
    }),
    secret: "•ᴗ•",
    resave: true, // Don't force a reforce on unmodified sessions
    saveUninitialized: true // Don't store sessions that are unmodified
  })
);

client = redis.createClient(6379, redisHost);
client.on("connect", function() {
  app.get("/login", function(req, res) {
    if (req.session.name) {
      res.send(`
      <h1>Hello, ${req.session.name}!</h1>
      <a href="/logout">Logout</a>
    `);
    } else {
      res.sendFile("login.html");
    }
  });

  app.post("/login", function(req, res) {
    console.log("Authenticated " + req.body.name);
    req.session.name = req.body.name;
    res.redirect("/");
  });

  app.get("/logout", function(req, res) {
    console.log("Deauthorized " + req.session.name);
    req.session.destroy();
    res.redirect("/");
  });

  app.listen(8000, function() {});
});
