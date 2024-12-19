const customerModel = require("../../models/customerModel");
const { responseReturn } = require("../../utiles/response");
const { createToken } = require("../../utiles/tokenCreate");
const sellerCustomerModel = require("../../models/chat/sellerCustomerModel");
const bcrypt = require("bcryptjs");
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
          method: "menualy",
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
