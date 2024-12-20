const { Schema, model } = require("mongoose");

const recentSearchSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "customers", // Reference to the User model
      required: true,
    },
    searches: [{ type: String, required: true }],
  },
  { timestamps: true }
);

module.exports = model("RecentSearch", recentSearchSchema);
