const { Schema, model, default: mongoose } = require("mongoose");

const customerAddress = new Schema(
  {
    pincode: {
      type: String,
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
    phonenumber: {
      type: Number,
      required: true,
    },
    defaultAddress: {
      type: Boolean,
      required: false,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
      required: true,
    },
    landmark: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    housenumber: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "customers",
    },
  },
  { timestamps: true }
);

module.exports = model("customerAddress", customerAddress);
