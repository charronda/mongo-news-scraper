var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

var request = require("request");
var cheerio = require("cheerio");

mongoose.Promise = Promise;

var port = process.env.PORT || 5000

var app = express();

app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    notesDir: path.join(__dirname, "/views/layouts/notes")
}));
app.set("view engine", "handlebars");

// Database configuration with mongoose
//mongoose.connect("mongdb://heroku_dzp73wg8:86as7aurduqdid9ievs2gurb5@ds263639.mlab.com:63639/heroku_dzp73wg8");
//mongoose.connect("mongodb://localhost/scrapdb");

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/5000";
mongoose.connect(MONGODB_URI);
var db = mongoose.connection;

// mongoose error handeling
//db.on(5000, function(error) {
  //console.log("Mongoose Error: ", error);
//});
//var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// Routes ======
//render Handlebars pages
app.get("/", function(req, res) {
  Article.find({"saved": false}, function(error, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("home", hbsObject);
  });
});

app.get("/saved", function(req, res) {
  Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
    var hbsObject = {
      article: articles
    };
    res.render("saved", hbsObject);
  });
});

app.get("/scrape", function(req, res) {

  request("http://www.mdjonline.com/news/lifestyle/", function(error, res, html) {

    var $ = cheerio.load(html);

    $(".card-body").each(function(i, element) {

      var result = {};

      result.title = $(this).children("h3").text();
      result.summary = $(this).children("a").text();
      //result.link = $(this).children("h2").children("a").attr("href");

      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, res) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(result);
        }
      });

    });
        //res.send("Scrape Complete");
        res.json('response');

  });
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab doc in the Articles array
  Article.find({}, function(error, res) {

    if (error) {
      console.log(error);
    }
    else {
      res.json(res);
    }
  });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  Article.findOne({ "_id": req.params.id })

  .populate("note")

  .exec(function(error, res) {

    if (error) {
      console.log(error);
    }
    else {
      res.json(res);
    }
  });
});


// Save an article
app.post("/articles/save/:id", function(req, res) {
      Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true})

      .exec(function(err, doc) {
        if (err) {
          console.log(err);
        }
        else {
          //res.send(doc);
          res.json('response');
        }
      });
});

// Delete an article
app.post("/articles/delete/:id", function(req, res) {
      Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": false, "notes": []})
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
});


// Create a new note
app.post("/notes/save/:id", function(req, res) {
  var newNote = new Note({
    body: req.body.text,
    article: req.params.id
  });
  console.log(req.body)

  newNote.save(function(error, note) {

    if (error) {
      console.log(error);
    }
    else {

      Article.findOneAndUpdate({ "_id": req.params.id }, {$push: { "notes": note } })

      .exec(function(err) {
        if (err) {
          console.log(err);
          res.send(err);
        }
        else {
          res.send(note);
        }
      });
    }
  });
});

// Delete a note
app.delete("/notes/delete/:note_id/:article_id", function(req, res) {

  Note.findOneAndRemove({ "_id": req.params.note_id }, function(err) {
    if (err) {
      console.log(err);
      res.send(err);
    }
    else {
      Article.findOneAndUpdate({ "_id": req.params.article_id }, {$pull: {"notes": req.params.note_id}})

        .exec(function(err) {
          if (err) {
            console.log(err);
            res.send(err);
          }
          else {
            res.send("Note Deleted");
          }
        });
    }
  });
});

// Listen on port
app.listen(port, function() {
  console.log("App running on port " + port);
});
