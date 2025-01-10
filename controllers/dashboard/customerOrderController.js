const androidCustomerOrderModel = require("../../models/androidCustomerOrderModel.js");
const CusomerOrderModel = require("../../models/androidCustomerOrderModel.js");
const authOrder = require("../../models/authOrder.js");
const cardModel = require("../../models/cardModel.js");
const couponModel = require("../../models/couponModel.js");
const ProductDetailsModel = require("../../models/productDetailsModel.js");
const productModel = require("../../models/productModel.js");
const { responseReturn } = require("../../utiles/response.js");
const { Types } = require("mongoose");
const ObjectId = Types.ObjectId;
const moment = require("moment");
class customerOrderController {
  create_order = async (req, res) => {
    try {
      console.log("Create order hitted");
      const {
        couponCode,
        productId,
        quantity,
        addressName,
        addressPhonenumber,
        addressCity,
        addressState,
        addressDistrict,
        addressArea,
        variationId,
        size,
      } = req.body;

      console.log(
        "data given by frontend===>",
        couponCode,
        productId,
        quantity,
        addressName,
        addressPhonenumber,
        addressCity,
        addressState,
        addressDistrict,
        addressArea,
        variationId,
        size
      );
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
      if (product.size.indexOf(size) == -1) {
        return responseReturn(res, 200, {
          message: "size not available",
          status: 400,
        });
      }

      let discount = 0;
      let productPrice = Number(product.discountedPrice) * quantity;
      if (product && coupon) {
        console.log(coupon.type);
        if (coupon.type === "price") {
          discount = Number(coupon.value);
        } else if (coupon.type === "discount" && coupon.upto == null) {
          discount = productPrice - (productPrice * coupon.value) / 100;
        } else if (coupon.type === "discount" && coupon.upto) {
          if (
            productPrice - (productPrice * coupon.value) / 100 >
            coupon.upto
          ) {
            discount = Number(coupon.upto);
          } else {
            discount = productPrice - (productPrice * coupon.value) / 100;
          }
        }

        // Ensure the discounted price is not negative
        discount = Math.max(0, discount);
      }
      if (product) {
        // Respond with the calculated discounted price
        const order = await androidCustomerOrderModel.create({
          customerId: req.id,
          appliedCoupon: couponCode,
          payment_status: "pending",
          discountedPrice: productPrice - discount,
          price: productPrice,
          couponDiscount: Number(discount),
          selectedSize: size,
          products: [
            {
              productId,
              quantity,
              variationId,
              couponDiscount: discount,
              price: productPrice,
              discountedPrice: productPrice - discount,
              size,
            },
          ],
          shippingInfo: {
            name: addressName,
            phonenumber: addressPhonenumber,
            city: addressCity,
            state: addressState,
            district: addressDistrict,
            area: addressArea,
          },
        });

        console.log("craeted order === > ", order);
        return res.status(200).json({
          message: "order created successfully.",
          status: 200,
          order,
        });
      } else {
        return res.status(200).json({
          message: "invalid productId or vairantId",
          status: 400,
        });
        console.log("invalid productId or vairantId");
      }
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      return res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
  create_cart_order = async (req, res) => {
    try {
      let buy_product_item = 0;
      let calculatePrice = 0;
      let card_product_count = 0;
      const userId = req.id;
      console.log("userId--->", userId);
      const {
        couponCode,
        addressName,
        addressPhonenumber,
        addressCity,
        addressState,
        addressDistrict,
        addressArea,
      } = req.body;

      try {
        const card_products = await cardModel.aggregate([
          {
            $match: {
              userId: {
                $eq: new ObjectId(userId),
              },
            },
          },
          {
            $lookup: {
              from: "variants",
              localField: "variantId",
              foreignField: "_id",
              as: "products",
            },
          },
        ]);

        // console.log("card_products", card_products);
        // return res.send(card_products);
        console.log(">>>>>>>>>>", userId);
        if (card_products.length < 1) {
          responseReturn(res, 200, {
            message: "cart is empty ",
            status: 200,
          });
        }
        // return res.json({ card_products });

        const outOfStockProduct = card_products.filter((p) => {
          p.products[0]?.stock < p.quantity;
        });

        for (let i = 0; i < outOfStockProduct.length; i++) {
          card_product_count =
            card_product_count + outOfStockProduct[i].quantity;
        }
        const stockProduct = card_products.filter(
          (p) => p.products[0].stock >= p.quantity
        );

        // return res.send(stockProduct);
        for (let i = 0; i < stockProduct.length; i++) {
          const { quantity } = stockProduct[i];

          console.log("quantity---->", quantity);
          card_product_count = card_product_count + quantity;
          buy_product_item = buy_product_item + quantity;
          const { price, discount } = stockProduct[i].products[0];
          console.log(price, discount);
          if (discount !== 0) {
            calculatePrice =
              calculatePrice +
              quantity * (price - Math.floor((price * discount) / 100));
          } else {
            calculatePrice = calculatePrice + quantity * price;
          }
        }
        console.log("calculatePrice===> ", calculatePrice);
      } catch (error) {
        console.log(error.message);
      }

      // Check if the coupon exists and is active
      const coupon = await couponModel.findOne({
        code: couponCode,
        isActive: true,
        expiryDate: { $gte: new Date() }, // Ensure the coupon is not expired
      });

      let discount = 0;
      let productPrice = calculatePrice;
      console.log("productPrice", productPrice);
      if (card_product_count && coupon) {
        if (coupon.type === "price") {
          console.log("subtracting price");
          discount = Number(coupon.value);
          console.log("discount price", discount);
        } else if (coupon.type === "discount" && coupon.upto == null) {
          discount = productPrice - (productPrice * coupon.value) / 100;
        } else if (coupon.type === "discount" && coupon.upto) {
          if (
            productPrice - (productPrice * coupon.value) / 100 >
            coupon.upto
          ) {
            discount = Number(coupon.upto);
          } else {
            discount = productPrice - (productPrice * coupon.value) / 100;
          }
        }

        // Ensure the discounted price is not negative
        discount = Math.max(0, discount);
      }

      console.log("discount, productPrice", discount, productPrice);
      // Respond with the calculated discounted price

      console.log("creating order.....");
      const order = await androidCustomerOrderModel.create({
        customerId: new ObjectId(req.id),
        appliedCoupon: couponCode,
        payment_status: "pending",
        discountedPrice: productPrice - discount,
        price: productPrice,
        couponDiscount: Number(discount),

        // products: [
        //   {
        //     productId,
        //     quantity,
        //     variationId,
        //     couponDiscount: discount,
        //     price: productPrice,
        //     discountedPrice: productPrice - discount,
        //     size,
        //   },
        // ],
        shippingInfo: {
          name: addressName,
          phonenumber: addressPhonenumber,
          city: addressCity,
          state: addressState,
          district: addressDistrict,
          area: addressArea,
        },
      });
      return res.status(200).json({
        message: "order created successfully.",
        status: 200,
        order,
      });
    } catch (error) {
      console.error("Error creating order for customer", error.message);
      return res.status(500).json({
        message: "Internal server error.",
        status: 500,
      });
    }
  };
  get_orders = async (req, res) => {
    try {
      const orders = await androidCustomerOrderModel
        .find()
        .populate({
          path: "products.variationId",
          model: "variants",
        })
        .lean()
        .sort({ createdAt: -1 }); // Converts Mongoose documents to plain JavaScript objects

      const formattedOrders = orders.map((order) => ({
        discountedPrice: order.discountedPrice,
        orderId: order._id,
        quantity: order.quantity,
        selectedSize: order.selectedSize,
        products: order.products.map((product) => ({
          productDetails: product.variationId, // Rename variationId to productDetails
          productId: product.productId,
          quantity: product.quantity,
          discount: product.discount,
          totalPirce: product.totalPirce,
          discountedPrice: product.discountedPrice,
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
  get_orderDetails = async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await androidCustomerOrderModel
        .findById(orderId)
        .populate({
          path: "products.variationId",
          model: "variants",
        })
        .lean()
        .sort({ createdAt: -1 }); // Converts Mongoose documents to plain JavaScript objects

      const formattedOrders = {
        _id: order._id,
        customerId: order.customerId,
        selectedSize: order.selectedSize,
        priceDetails: {
          productListedPrice: order.products[0]?.variationId?.price,
          sellingPrice: order.products[0]?.variationId?.discountedPrice,
          itemCount: order.products[0].quantity,
          deliveryCharge: 0,
          listPrice:
            order.products[0].quantity * order.products[0]?.variationId?.price,
          extraDiscount: order.couponDiscount,
          price: order.price,
          discountedPrice: order.discountedPrice,
          payment_status: order.payment_status,
          appliedCoupon: order.appliedCoupon,
        },
        shippingInfo: order.shippingInfo,

        products: order.products,
      };
      responseReturn(res, 200, {
        orderDetails: formattedOrders,
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
