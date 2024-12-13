const { Schema, model } = require("mongoose");

const Subcategory = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "categorys",
    },
    categoryName: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      // required: true
    },
    slug: {
      type: String,
      // required: true
    },
  },
  { timestamps: true }
);

Subcategory.index({
  name: "text",
});

module.exports = model("Subcategory", Subcategory);
