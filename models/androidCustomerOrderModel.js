const { Schema, model } = require("mongoose");

const customerOrder = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "customers",
      required: true,
    },
    selectedSize: { type: String },
    couponDiscount: { type: Number },
    products: {
      type: Array,
      // required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountedPrice: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    payment_status: {
      type: String,
      required: true,
    },

    shippingInfo: {
      type: Object,
      required: true,
    },
    appliedCoupon: {
      type: String,
      required: false,
    },

    delivery_status: {
      type: String,
      required: false,
    },
    transactionId: {
      type: String,
    },
    transactionDate: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("androidCustomerOrders", customerOrder);
