// models/record.js
const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  DEVICEID: String,
  CODE: Number,
  NAME: String,
  MILKTYPE: String,
  FAT: Number,
  SNF: Number,
  QTY: Number,
  RATE: Number,
  SAMPLEDATE: String,
  SAMPLETIME: String,
  SHIFT: String,
  ANALYZERMODE: String,
  WEIGHTMODE: String,
  CLR: Number,
  WATER: Number,
  ANALYZERSAMPLETIME: String,
  INCENTIVEAMOUNT: Number,
  RECORDTYPE: String,
}, { collection: 'records' });

module.exports = mongoose.model('Record', recordSchema);
