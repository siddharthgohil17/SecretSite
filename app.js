require('dotenv').config();
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
const encrypt = require("mongoose-encryption")
const PORT = process.env.PORT || 3000;
const app = express();



app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


main().catch(err => console.log(err));
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB', { useNewUrlParser: true });
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String
})


userSchema.plugin(encrypt,{secret:process.env.secret,encryptedFields:["password"]});


const User = mongoose.model('User', userSchema);


app.get('/', function (req, res) {
    res.render("home");
})
app.get('/login', function (req, res) {
    res.render("login");
})
app.get('/register', function (req, res) {
    res.render("register");
})

app.post('/register', function (req, res) {
    newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
      const username=req.body.username;
    User.findOne({ email: username })
        .then(function (founduser) {
            if (founduser) {
                res.send("You are already registered")
            }
            else {
                newUser.save().then(() => {
                    res.render("secrets")
                })
                    .catch(err => {
                        res.status(400).send("Oops!!!!!!");
                    })

            }
        })

})

app.post('/login', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
   
    User.findOne({ email: username })
        .then(function (founduser) {
            if (founduser) {
                if (founduser.password === password) {
                    res.render("secrets");
                } else {
                    res.status(400).send("Invalid username or password");
                }
            } else {
                res.status(400).send("Invalid username or password");
            }
        })
        .catch(err => {
            res.status(400).send("An error occurred while processing your request");
        });
});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})
