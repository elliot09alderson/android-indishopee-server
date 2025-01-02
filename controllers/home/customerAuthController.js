const customerModel = require("../../models/customerModel");
const { responseReturn } = require("../../utiles/response");
const { createToken } = require("../../utiles/tokenCreate");
const sellerCustomerModel = require("../../models/chat/sellerCustomerModel");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const customerAddressModel = require("../../models/customerAddressModel");

class customerAuthController {
  getRecentSearches = async (userId) => {
    try {
      const recentSearch = await RecentSearch.findOne({ userId });
      return recentSearch ? recentSearch.searches : [];
    } catch (error) {
      console.error("Error fetching recent searches:", error);
      return [];
    }
  };
  addRecentSearch = async (userId, searchQuery) => {
    try {
      // Find the recent searches for the user
      let createdRecentSearch = await recentSearch.findOne({ userId });

      if (!createdRecentSearch) {
        // Create a new record if it doesn't exist
        createdRecentSearch = new recentSearch({
          userId,
          searches: [{ query: searchQuery }],
        });
      } else {
        // Add the new search query to the beginning of the array
        createdRecentSearch.searches.unshift({ query: searchQuery });

        // Ensure only the latest 10 searches are kept
        if (createdRecentSearch.searches.length > 10) {
          createdRecentSearch.searches = createdRecentSearch.searches.slice(
            0,
            10
          );
        }
      }

      // Save the updated record
      await createdRecentSearch.save();
      console.log("Recent search updated successfully!");
    } catch (error) {
      console.error("Error updating recent searches:", error.message);
    }
  };

  /**
   *
   * ACTUAL CONTROLLERS BELOW
   *
   */
  customer_register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
      const customer = await customerModel.findOne({ email });
      if (customer) {
        responseReturn(res, 404, { error: "Email already exits" });
      } else {
        const createCustomer = await customerModel.create({
          name: name.trim(),
          email: email.trim(),
          password: await bcrypt.hash(password, 10),
          method: "manually",
          isRegistered: true,
        });
        await sellerCustomerModel.create({
          myId: createCustomer.id,
        });
        const token = await createToken({
          id: createCustomer.id,
          name: createCustomer.name,
          email: createCustomer.email,
          method: createCustomer.method,
        });
        res.cookie("customerToken", token, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        responseReturn(res, 201, { message: "Register success", token });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  get_details = async (req, res) => {
    const userId = req.id;
    try {
      const user = await customerModel.findById(userId);
      const address = await customerAddressModel
        .findOne({ userId })
        .sort({ createdAt: -1 });
      console.log(address);
      if (user) {
        responseReturn(res, 200, {
          status: 200,
          message: "details fetched successfully",
          data: {
            _id: user._id,
            token: req.token,
            name: user.name,
            email: user.email,
            // password: user.password,
            phonenumber: user.phonenumber,
            address,
            islogin: true,
            avatar: user.avatar,
          },
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  update_details = async (req, res) => {
    const userId = req.id;
    const { phonenumber, email, name, password } = req.body;
    console.log(req.file);
    const file = req.file;

    const cropParams = {
      width: 300,
      height: 300,
      crop: "crop", // Use 'crop' to perform cropping
      gravity: "auto", // Use 'auto' to automatically detect the most relevant region
    };
    let result = "";
    if (file?.path) {
      result = await cloudinary.uploader.upload(file.path, {
        folder: "customer",
        resource_type: "image",
        transformation: cropParams,
      });
    }

    try {
      const updateFields = {};
      if (phonenumber) updateFields.phonenumber = phonenumber;
      if (email) updateFields.email = email;
      if (name) updateFields.name = name;

      if (result.url) updateFields.avatar = result.url;
      let newPassword = "";
      if (password) {
        newPassword = await bcrypt.hash(password, 10);
      }
      if (password) updateFields.password = newPassword;
      const user = await customerModel.findOneAndUpdate(
        { _id: userId },
        { $set: updateFields },
        { new: true }
      );

      // console.log(user);
      if (user) {
        responseReturn(res, 200, {
          message: "details fetched successfully",
          status: 200,
          user: {
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            phonenumber: user.phonenumber,
            islogin: true,
          },
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  customer_login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const customer = await customerModel
        .findOne({ email })
        .select("+password");
      if (customer) {
        const match = await bcrypt.compare(password, customer.password);
        if (match) {
          const token = await createToken({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            method: customer.method,
          });
          res.cookie("customerToken", token, {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          responseReturn(res, 201, { message: "Login success", token });
        } else {
          responseReturn(res, 404, { error: "Password wrong" });
        }
      } else {
        responseReturn(res, 404, { error: "Email not found" });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  customer_logout = async (req, res) => {
    res.cookie("customerToken", "", {
      expires: new Date(Date.now()),
    });

    responseReturn(res, 200, { message: "Logout success" });
  };

  getRecentSearches = async (req, res) => {
    const userId = req.query.userId; // Assume user ID is passed as a query param

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const recentSearches = await getRecentSearches(userId);
      res.json(recentSearches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent searches" });
    }
  };
}

module.exports = new customerAuthController();
