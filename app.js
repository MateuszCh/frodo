const express = require("express"),
    path = require("path"),
    bodyParser = require("body-parser"),
    cookieParser = require("cookie-parser"),
    expressValidator = require("express-validator"),
    session = require("express-session"),
    passport = require("passport"),
    mongoose = require("mongoose"),
    config = require("./config"),
    UserController = require("./server/controllers/user.controller"),
    MongoStore = require("connect-mongo")(session),
    Counter = require("./server/models/counter"),
    routes = require("./server/routes");

mongoose.connect(config.mongoUrl).then(
    () => {
        console.log("Connected to mongoDb");
    },
    err => {
        throw err;
    }
);
mongoose.Promise = global.Promise;

mongoose.connection.on("open", () => {
    console.log("Connected");
    Counter.findOne({})
        .then(counter => {
            if (counter === null) {
                Counter.create({ counter: 1 })
                    .then(counter => {
                        console.log("Newly created:");
                        console.log(counter);
                        UserController.createUsers();
                    })
                    .catch(err => {
                        console.log(err);
                    });
            } else {
                console.log("Exists:");
                console.log(counter);
                UserController.createUsers();
            }
        })
        .catch(err => {
            console.log(err);
        });
});

const app = express();

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(
    session({
        cookie: { maxAge: 3600000 },
        store: new MongoStore({ mongooseConnection: mongoose.connection }),
        name: "frodo",
        secret: "secret",
        saveUninitialized: true,
        resave: true
    })
);

app.use(passport.initialize());
app.use(passport.session());

// app.use(expressValidator({
//     errorFormatter: function(param, msg, value) {
//         var namespace = param.split('.')
//             , root    = namespace.shift()
//             , formParam = root;
//
//         while(namespace.length) {
//             formParam += '[' + namespace.shift() + ']';
//         }
//         return {
//             param : formParam,
//             msg   : msg,
//             value : value
//         };
//     }
// }));

routes(app);

app.use("/uploads", express.static(`${__dirname}/${config.uploadsPath}`));

app.use("/export", express.static(__dirname));

app.use("/", express.static(`${__dirname}/front/public`));

app.get(["*"], function(req, res) {
    res.sendFile(path.resolve(`${__dirname}/front/public/index.html`));
});

app.set("port", process.env.PORT || 3000);

app.use((err, req, res, next) => {
    console.log(err);
    console.log(err.message);
    if (typeof err === "string") {
        res.status(422).send({ error: err });
    } else if (typeof err.message === "string") {
        res.status(422).send({ error: err.message });
    } else if (err.errors) {
        const firstError = Object.keys(err.errors)[0];
        res.status(422).send({ error: err.errors[firstError].message });
    } else {
        res.status(422).send(err.message);
    }
});

app.listen(app.get("port"), () => console.log("Frodo running on port 3000"));
