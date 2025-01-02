const CusomerOrderModel = require("../../models/androidCustomerOrderModel.js");
const couponModel = require("../../models/couponModel.js");
const ProductDetailsModel = require("../../models/productDetailsModel.js");
const productModel = require("../../models/productModel.js");
const { responseReturn } = require("../../utiles/response.js");
const moment = require("moment");
class customerOrderController {
  create_order = async (req, res) => {
    try {
      const { couponCode, productId, quantity, address, variationId } =
        req.body;

      if (!productId || !quantity) {
        return res.status(200).json({
          message: "Productid and quantity required.",
          status: 400,
        });
      }

      // Check if the coupon exists and is active
      const coupon = await couponModel.findOne({
        code: couponCode,
        isActive: true,
        expiryDate: { $gte: new Date() }, // Ensure the coupon is not expired
      });
      const product = await ProductDetailsModel.findOne({
        productId,
        _id: variationId,
      });
      if (product) {
        // console.log(product);
        if (!coupon) {
          return res.status(200).json({
            message: "Invalid or expired coupon code.",
            status: 404,
          });
        }
        // upto=500 discount = 40% price = 10000
        // Calculate discount

        let discount = Number(product.price) * quantity;
        let productPrice = Number(product.price) * quantity;
        if (coupon.type === "price") {
          discount = productPrice - coupon.value;
        } else if (coupon.type === "discount" && coupon.upto == null) {
          discount = productPrice - (productPrice * coupon.value) / 100;
        } else if (coupon.type === "discount" && coupon.upto) {
          if (
            productPrice - (productPrice * coupon.value) / 100 >
            coupon.upto
          ) {
            discount = coupon.upto;
          } else {
            discount = productPrice - (productPrice * coupon.value) / 100;
          }
        }

        // Ensure the discounted price is not negative
        discount = Math.max(0, discount);

        // Respond with the calculated discounted price
        const order = await CusomerOrderModel.create({
          customerId: req.id,
          appliedCoupon: couponCode,
          payment_status: "pending",
          products: [
            {
              productId,
              quantity,
              variationId,
              discount,
              totalPirce: productPrice,
              discountedPrice: productPrice - discount,
            },
          ],
          discountedPrice: productPrice - discount,
          price: productPrice,
          discount,
          shippingInfo: address,
        });
        return res.status(200).json({
          message: "Coupon applied successfully.",
          status: 200,
          order,
        });
      } else {
        console.log("invalid productId or vairantId");
      }
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };

  get_orders = async (req, res) => {
    try {
      const orders = await CusomerOrderModel.find()
        .populate({
          path: "products.variationId",
          model: "variants",
        })
        .lean(); // Converts Mongoose documents to plain JavaScript objects

      const formattedOrders = orders.map((order) => ({
        ...order,
        products: order.products.map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          discount: product.discount,
          totalPirce: product.totalPirce,
          discountedPrice: product.discountedPrice,
          productDetails: product.variationId, // Rename variationId to productDetails
        })),
      }));
      responseReturn(res, 200, {
        orders: formattedOrders,
        message: "orders fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };

  get_order = async (req, res) => {
    const id = req.params.id;
    try {
      const order = await CusomerOrderModel.findById(id);
      responseReturn(res, 200, {
        order,
        message: "order fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
  delete_order = async (req, res) => {
    const id = req.params.id;
    try {
      const order = await CusomerOrderModel.findOneAndDelete(id);
      responseReturn(res, 200, {
        order,
        message: "order fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
}
module.exports = new customerOrderController();
