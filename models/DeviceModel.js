const mongoose = require("mongoose");
const serverSettingsSchema = new mongoose.Schema(
  {
    serverControl: { type: String, default: "N" },
    weightMode: { type: String, default: "1" },
    fatMode: { type: String, default: "1" },
    analyzer: { type: String, default: "U" },
    useCowSnf: { type: String, default: "Y" },
    useBufSnf: { type: String, default: "Y" },
    clrBasedTable: { type: String, default: "N" },
    highFatAccept: { type: String, default: "Y" },
    lowFatAccept: { type: String, default: "Y" },
    dpuMemberList: { type: String, default: "N" },
    dpuRateTables: { type: String, default: "N" },
    dpuCollectionModeControl: { type: String, default: "Y" },
    autoTransfer: { type: String, default: "N" },
    autoShiftClose: { type: String, default: "N" },
    mixedMilk: { type: String, default: "N" },
    machineLock: { type: String, default: "N" },
    commissionType: { type: String, default: "N" },
    normalCommission: { type: String, default: "0.00" },
    specialCommission: { type: [String], default: [] },
  },
  { _id: false }
);
const DeviceSchema = new mongoose.Schema(
  {
    deviceid: {
      type: String,
      required: true,
      unique: true,
    },
    dairyCode: {
      type: String,
      required: true,
      match: /^[A-Z]{3}$/,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    status: {
      type: String,
      default: "active",
    },
    role: {
      type: String,
      enum: ["device"],
      default: "device",
    },
    isDeviceRateTable: {
      fatBufTable: { type: Boolean, default: false },
      fatCowTable: { type: Boolean, default: false },
      snfBufTable: { type: Boolean, default: false },
      snfCowTable: { type: Boolean, default: false },
    },
    rateChartIds: {
      fatBufId: { type: Number, default: 0 },
      fatCowId: { type: Number, default: 0 },
      snfBufId: { type: Number, default: 0 },
      snfCowId: { type: Number, default: 0 },
    },
    effectiveDates: {
      fatBufEffectiveDate: { type: String, default: "" },
      fatCowEffectiveDate: { type: String, default: "" },
      snfBufEffectiveDate: { type: String, default: "" },
      snfCowEffectiveDate: { type: String, default: "" },
    },
    serverSettings: { type: serverSettingsSchema, default: {} },
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
    members: [
      {
        CODE: Number,
        MILKTYPE: String,
        COMMISSIONTYPE: String,
        MEMBERNAME: String,
        CONTACTNO: String,
        STATUS: String,
        createdOn: { type: Date, default: Date.now },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    minimize: false, // 🔑 ensures empty objects like {} are saved
  }
);

module.exports = mongoose.model("Device", DeviceSchema, "devicesList");
