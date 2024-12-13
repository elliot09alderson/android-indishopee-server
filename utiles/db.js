const mongoose = require("mongoose");

module.exports.dbConnect = async () => {
  try {
    await mongoose
      .connect(process.env.DB_URL, { dbName: "E-com" })
      .then(() => console.log("database connected....", process.env.DB_URL));
  } catch (error) {
    console.log(error.message);
  }
};
