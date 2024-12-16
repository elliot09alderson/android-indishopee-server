const mongoose = require("mongoose");

module.exports.dbConnect = async () => {
  try {
    await mongoose
      .connect(process.env.DB_URL, { dbName: "android-indishopee" })
      .then(() => console.log("database connected....", process.env.DB_URL));
  } catch (error) {
    console.log(error.message);
  }
};
