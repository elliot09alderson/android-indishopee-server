const { Schema, model } = require("mongoose");

const recentSearchSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "customers", // Reference to the User model
      required: true,
    },
    searches: [
      {
        query: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("RecentSearch", recentSearchSchema);
