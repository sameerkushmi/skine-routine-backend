const mongoose = require("mongoose");

const SectionSchema = new mongoose.Schema({
    heading: { type: String, required: true },
    content: [{ type: String }],
    list: [{ type: String }],
    image: {
        url: {
            type: String,
        },
        public_id: {
            type: String,
        }
    },
});

const CommentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: String, required: true },
});

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    excerpt: { type: String },
    date: { type: String, required: true },
    heroImage: {
        url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        }
    },
    article: {
        intro: { type: String },
        sections: [SectionSchema],
        conclusion: { type: String },
    },
    comments: [CommentSchema],
});

module.exports = mongoose.model("Blog", BlogSchema);