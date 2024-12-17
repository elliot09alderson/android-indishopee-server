const mongoose = require("mongoose");
const productModel = require("../models/productModel");

module.exports.dbConnect = async () => {
  try {
    await mongoose
      .connect(process.env.DB_URL, { dbName: "android-indishopee" })
      .then(() => console.log("database connected....", process.env.DB_URL));

    // const result = await productModel.updateMany(
    //   { size: { $exists: false } }, // Check if "sponsors" does not already exist
    //   { size: "" } // Set default value as an empty array
    // );

    // console.log("Migration Complete:", result);
  } catch (error) {
    console.log(error.message);
  }
};
