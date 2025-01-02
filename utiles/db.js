const mongoose = require("mongoose");
const productModel = require("../models/productModel");
const recentSearch = require("../models/recentSearch");

module.exports.dbConnect = async () => {
  try {
    await mongoose
      .connect(process.env.DB_URL, { dbName: "android-indishopee" })
      .then(() => console.log("database connected....", process.env.DB_URL));

    // const result = await recentSearch.updateMany(
    //   { "searches.searchTerm": { $exists: false } }, // Check if "searchTerm" does not already exist in "searches"
    //   {
    //     $set: {
    //       "searches.$[].searchTerm": "", // Set a default empty string for "searchTerm"
    //       "searches.$[].image": null, // Set "image" to null by default
    //     },
    //   }
    // );

    // console.log(`${result.modifiedCount} documents updated successfully.`);

    // console.log("Migration Complete:", result);
  } catch (error) {
    console.log(error.message);
  }
};
