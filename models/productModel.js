const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    sellerId: {
      type: Schema.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountedPrice: {
      type: Number,
    },

    stock: {
      type: Number,
      default: 1,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },
    shopName: {
      type: String,
      required: true,
    },
    images: {
      type: Array,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    sponsors: [
      {
        type: Schema.ObjectId,
        ref: "products",
        // required: true,
      },
    ],
    free_delivery: {
      type: String,
      default: "free",
    },
    returnPolicy: {
      type: String,
      default: "7 days",
    },
    color: {
      type: String,
    },
    ram: {
      type: String,
    },
    storage: {
      type: String,
    },
    type: {
      enum: [
        "cloths",
        "shoes",
        "phones",
        "beauty",
        "accessories",
        "electronics",
      ],
      type: String,
      default: "cloths",
    },
    size: { type: String },
    colorName: { type: String },
    variations: [
      {
        type: Schema.Types.ObjectId,
        ref: "variants",
      },
    ],
  },
  { timestamps: true }
);

productSchema.index(
  {
    name: "text",
    category: "text",
    brand: "text",
    // description: "text",
  },
  {
    weights: {
      name: 5,
      category: 4,
      brand: 3,
      description: 2,
    },
  }
);

module.exports = model("products", productSchema);
