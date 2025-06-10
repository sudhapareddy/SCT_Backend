const mongoose = require("mongoose");

const dairySchema = new mongoose.Schema(
  {
    dairyCode: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Z]{3}$/, // only 3 uppercase letters
    },
    dairyName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true, // store hashed password
    },
    role: {
      type: String,
      enum: ["admin", "dairy"], // roles for dairy users
      default: "dairy",
    },
    fatCowTable: [
      {
        FAT: { type: Number, required: true },
        RATE: { type: Number, required: true },
      },
    ],
    fatBufTable: [
      {
        FAT: { type: Number, required: true },
        RATE: { type: Number, required: true },
      },
    ],
    snfCowTable: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    snfBufTable: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    createdOn: {
      type: Date,
      default: Date.now,
      immutable: true, // 👈 ADD THIS LINE
    },
  },
  {
    minimize: false, // 🔑 ensures empty objects like {} are saved
  }
);

module.exports = mongoose.model("Dairy", dairySchema);
