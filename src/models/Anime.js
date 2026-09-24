const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    watchUrl: { type: String, required: true, trim: true },
    image: { type: String, default: "" }
  },
  { _id: true }
);

const animeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 4000 },
    image: { type: String, default: "" },
    banner: { type: String, default: "" },
    genres: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 10 },
    year: { type: Number, default: null },
    status: { type: String, default: "مستمر" },
    episodes: { type: [episodeSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Anime", animeSchema);