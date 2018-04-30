var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// Create the Note
var NoteSchema = new Schema({
    body: {
        type: String
    },
    article: {
        type: Schema.Types.ObjectId,
        ref: "Article"
    }
});

// Create the Note model with the NoteSchema
var Note = mongoose.model("Note", NoteSchema);

module.exports = Note;
