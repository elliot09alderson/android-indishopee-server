const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const productDetailsSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products",
      required: true,
    },

    discount: { type: Number },
    discountedPrice: { type: Number },

    type: {
      type: String,
      required: true, // e.g., 'electronics', 'clothes'
    },
    color: {
      type: String, // Shared between all types
      required: function () {
        return this.type === "clothes" || this.type === "phones";
      },
    },
    size: {
      type: String, // For clothes (e.g., 'S', 'M', 'L')
      required: function () {
        return this.type === "clothes" || this.type === "shoes";
      },
    },
    ram: {
      type: String, // For electronics (e.g., '6GB', '8GB')
      required: function () {
        return this.type === "phones";
      },
    },
    storage: {
      type: String, // For electronics (e.g., '128GB', '256GB')
      required: function () {
        return this.type === "phones";
      },
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 1,
    },
    colorName: { type: String },
    images: {
      type: [String],
      required: true,
    },
  },
  { timestamps: true }
);

const ProductDetailsModel = model("variants", productDetailsSchema);

module.exports = ProductDetailsModel;
