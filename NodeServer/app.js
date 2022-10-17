const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

const session = require("express-session"); 
const passport = require("passport"); 
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const minimist = require("minimist");
const { fork } = require("child_process");
dotenv.config();

//express
const express = require("express");
const app = express();

//socket.io
const { Server: HttpServer } = require("http");
const { Server: IOServer } = require("socket.io");
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);

//MongoAtlas
const MongoStore = require("connect-mongo");
const advanceOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

//conexion a mongodb
app.use(cookieParser());
let mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/test';

//session middleware
app.use(
  session({
    store: new MongoStore({ 
      mongoUrl: mongoUrl,
      mongoOptions: advanceOptions   
    }),     
    secret: "coderhouse",
    resave: true,
    saveUninitialized: true,
    rolling: true, 
    cookie: { maxAge: 60000 },
  })
);

//auth middleware
app.use(passport.initialize());
app.use(passport.session());

//router
const router = require("./routes/index")

//plantillas
app.set('views', './views');
app.set('view engine', 'ejs');

//middlewares
app.use(express.static(__dirname + "/public"));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use("/", router);

//conexion
io.on('connection', async function(socket) {
  const messages = await chat.showMessage();  
  socket.emit('messages', messages);
 	io.sockets.emit('productos');
	socket.on ('new-message', async function (data){
    try {
      chat.saveMessage(data);
      const messages = await chat.showMessage();      
      io.sockets.emit('messages', messages);
    } catch (err) {
      console.log(err);
    }  
  });
});

//PORT
let PORT = 8080
let data = minimist(["-p",process.argv.slice(2)])
if(typeof(data.p) === "number"){
  PORT = data.p
}

//cluster
if (cluster.isPrimary) {
  console.log("num CPUs: " + numCPUs);
  console.log(`Soy el master ${process.pid}`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`${worker.process.pid} terminado!`);
  });
} else {

  httpServer.listen(PORT, function() {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  })
  console.log(`Proceso ${process.pid} iniciado`);
}