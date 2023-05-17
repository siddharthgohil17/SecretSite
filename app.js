require('dotenv').config();
const findOrCreate = require("mongoose-findorcreate");
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
const session = require("express-session");
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const  FacebookStrategy=require("passport-facebook").Strategy;
const GitHubStrategy=require("passport-github2").Strategy;


const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true })); 

app.use(session({
    secret: 'The one who knock',
    resave: false,
    saveUninitialized: false,

}))

app.use(passport.initialize());
app.use(passport.session());


main().catch(err => console.log(err));
async function main() {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId:String,
    githubId:String,
    secret:String

})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

//Changed to work with all forms of auth instead of just local
passport.serializeUser(function (user, done) {
    done(null, user.id);
  });
  passport.deserializeUser(async function (id, done) {
    let err, user;
    try {
        user = await User.findById(id).exec();
    }
    catch (e) {
        err = e;
    }
    done(err, user);
  });
   
 
//The Google authentication strategy 

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //this use for to stop deprecat
  },
  function(accessToken, refreshToken, profile, cb) {
    const googleId = "google_" + profile.id;
    User.findOrCreate({ googleId: googleId }, function (err, user) {
      return cb(err, user);
    });
  }
));

//The facebook authentication strategy
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    const facebookId = "facebook_" + profile.id;
    User.findOrCreate({ facebookId: facebookId }, function (err, user) {
      return cb(err, user);
    });
  }
));


passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/github/secrets"
},
function(accessToken, refreshToken, profile, done) {
  const githubId = "github_" + profile.id; 
  User.findOrCreate({ githubId: githubId}, function (err, user) {
    return done(err, user);
  });
}
));



app.get('/', function (req, res) {
    res.render("home");
})
//google
app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
  );

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
//facebook
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ["profile"] }));

  app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  //github
  app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'profile' ] }));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get('/login', function (req, res) {
    res.render("login");
})
app.get('/register', function (req, res) {
    res.render("register");
})

app.get('/secrets',function(req,res){
  
    if(req.isAuthenticated()){
      User.find({"secret":{$ne:null}})
  .then(function(founduser){
    if(founduser)
    {
      res.render("secrets",{UserWithSecret:founduser})
    }     
  })
  .catch(err => {
       res.status(400).send("Oops!!!!!!");
   })
    }
    else
    {
        res.redirect("/login");
    }
})

app.get('/submit',function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
}
else
{
    res.redirect("/login");
}
})

app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.post('/submit',function(req,res){
  const submittedSecret=req.body.secret;
  User.findById(req.user.id)
  .then(function(founduser){
    if(founduser)
    {
      founduser.secret= submittedSecret;
      founduser.save().then(()=>{
        res.redirect('/secrets')
      })
    }
    
  })
  .catch(err => {
                        res.status(400).send("Oops!!!!!!");
                    })
})
app.post('/register', function (req, res) {

    // bcrypt.hash( req.body.password, saltRounds, function(err, hash) {
    //     newUser = new User({
    //         email: req.body.username,
    //         password:hash
    //     });
    //       const username=req.body.username;
    //     User.findOne({ email: username })
    //         .then(function (founduser) {
    //             if (founduser) {

    //                 res.send("You are already registered")
    //             }
    //             else {
    //                 newUser.save().then(() => {
    //                      console.log("i'm in")
    //                     res.render("secrets")
    //                 })
    //                 .catch(err => {
    //                     res.status(400).send("Oops!!!!!!");
    //                 })

    //             }
    //         })

    // });

    User.register({username:req.body.username},req.body.password,function(err,user){
         if(err)
         {
          console.log(err);
            res.redirect("/login")
         }
         else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
         }
    })


});

app.post('/login', function (req, res) {
    const user=new User({
         username :req.body.username,
         password : req.body.password
    })
  

    req.login(user,function(err){
        if(err){
            console.log(err);    
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
         }
    })

    // User.findOne({email: username })
    //     .then(function (founduser) {
    //         if (founduser) {


    //             bcrypt.compare(password,founduser.password, function(err, result) {
    //                     if(result===true)
    //                     {
    //                         res.render("secrets");
    //                     }
    //                     else {
    //                             res.status(400).send("Invalid username or password");
    //                         }

    //             });
    //         } else {
    //             res.status(400).send("Invalid username or password");
    //         }
    //     })
    //     .catch(err => {
    //         res.status(400).send("An error occurred while processing your request");
    //     });

    



});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})
