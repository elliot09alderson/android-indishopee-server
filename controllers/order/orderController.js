const authOrderModel = require("../../models/authOrder");
const customerOrder = require("../../models/customerOrder");
const cardModel = require("../../models/cardModel");
const myShopWallet = require("../../models/myShopWallet");
const sellerWallet = require("../../models/sellerWallet");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const {
  mongo: { ObjectId },
} = require("mongoose");
const { responseReturn } = require("../../utiles/response");

const moment = require("moment");
const customerAddressModel = require("../../models/customerAddressModel");
const stripe = require("stripe")(
  "sk_test_51Nk8Y4F0B89ncn3xMHxYCwnaouDR6zuX83ckbJivv2jOUJ9CTka6anJcKMLnatgeBUeQq1RcRYynSPgp6f5zS4qF00YZFMYHuD"
);

class orderController {
  add_address = async (req, res) => {
    try {
      const userInfo = req.id
      const {
        pincode,
        state,
        district,
        landmark,
        phoneNumber,
        houseNumber,
        area,
        defaultAddress,
      } = req.body;

      const address = await customerAddressModel.create({
        pincode,
        state,
        district,
        landmark,
        phonenumber: phoneNumber,
        housenumber: houseNumber,
        area,
        defaultAddress,
        userId: userInfo,
      });

      if (address) {
        responseReturn(res, 201, { address });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  markDefaultAddress = async (req, res) => {
    const { addressId } = req.params;
    try {
      const already = await customerAddressModel.findOneAndUpdate(
        { defaultAddress: true },
        { defaultAddress: false },
        {
          new: true,
          runValidators: true, // Optionally ensure validation on update
        }
      );
      const address = await customerAddressModel.findByIdAndUpdate(
        addressId,
        { defaultAddress: true },
        {
          new: true,
          runValidators: true, // Optionally ensure validation on update
        }
      );

      const addresses = await customerAddressModel.find();
      if (address) {
        responseReturn(res, 200, {
          message: "default address set successfully",
          addressId,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  get_all_address = async (req, res) => {
    const { id } = req;
    try {
      const address = await customerAddressModel.find({ userId: id });

      if (address) {
        responseReturn(res, 200, {
          message: "address fetched successfully",
          address,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  get_default_address = async (req, res) => {
    const  userInfo = req.id;
    try {
      const address = await customerAddressModel.findOne({
        userId: userInfo,
        defaultAddress: true,
      });

      if (address) {
        responseReturn(res, 200, {
          message: "default address fetched successfully",
          defaultAddress: address,
        });
      }

      responseReturn(res, 404, {
        message: "default address not found",
        defaultAddress: address,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  delete_address = async (req, res) => {
    try {
      const { userId } = req.params;
      const address = await customerAddressModel.findByIdAndDelete(userId);

      if (address) {
        responseReturn(res, 200, { userId });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  paymentCheck = async (id) => {
    try {
      const order = await customerOrder.findById(id);

      if (order.payment_status === "unpaid") {
        await customerOrder.findByIdAndUpdate(id, {
          delivery_status: "cancelled",
        });
        await authOrderModel.updateMany(
          {
            orderId: id,
          },
          {
            delivery_status: "cancelled",
          }
        );
      }
      return true;
    } catch (error) {
      console.log(error);
    }
  };

  place_order = async (req, res) => {
    const { price, products, shipping_fee, shippingInfo } = req.body;
    const userId = req.id
    // console.log("customerOrderProduct==========>>>>>>>", products);

    // console.log("price=====> ", price);
    let authorOrderData = [];
    let cardId = [];
    const tempDate = moment(Date.now()).format("LLL");

    let customerOrderProduct = [];

    for (let i = 0; i < products.length; i++) {
      const pro = products[i].products;
      for (let j = 0; j < pro.length; j++) {
        let tempCusPro = pro[j].productInfo;
        tempCusPro.quantity = pro[j].quantity;
        customerOrderProduct.push(tempCusPro);
        if (pro[j]._id) {
          cardId.push(pro[j]._id);
        }
      }
    }
    try {
      const order = await customerOrder.create({
        customerId: userId,
        shippingInfo,
        products: customerOrderProduct,
        price: price + shipping_fee,
        delivery_status: "pending",
        payment_status: "unpaid",
        date: tempDate,
      });

      for (let i = 0; i < products.length; i++) {
        const pro = products[i].products;
        const pri = products[i].price;
        const sellerId = products[i].sellerId;
        let storePro = [];
        for (let j = 0; j < pro.length; j++) {
          let tempPro = pro[j].productInfo;
          tempPro.quantity = pro[j].quantity;
          storePro.push(tempPro);
        }
        // console.log(pri, "=====>pri");
        authorOrderData.push({
          orderId: order.id,
          sellerId,
          products: storePro,
          price: pri,
          payment_status: "unpaid",
          shippingInfo,
          delivery_status: "pending",
          date: tempDate,
        });
      }
      const data = await authOrderModel.insertMany(authorOrderData);
      // console.log(order.id);
      // console.log("array data ==> ", data);

      // setTimeout(() => {
      //   this.paymentCheck(order.id);
      // }, 15000);
      responseReturn(res, 201, {
        message: "order created successfully",
        orderId: order.id,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_customer_databorad_data = async (req, res) => {
    const { userId } = req.params;

    try {
      const recentOrders = await customerOrder
        .find({
          customerId: new ObjectId(userId),
        })
        .limit(5);
      const pendingOrder = await customerOrder
        .find({
          customerId: new ObjectId(userId),
          delivery_status: "pending",
        })
        .countDocuments();
      const totalOrder = await customerOrder
        .find({
          customerId: new ObjectId(userId),
        })
        .countDocuments();
      const cancelledOrder = await customerOrder
        .find({
          customerId: new ObjectId(userId),
          delivery_status: "cancelled",
        })
        .countDocuments();
      responseReturn(res, 200, {
        recentOrders,
        pendingOrder,
        cancelledOrder,
        totalOrder,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_orders = async (req, res) => {
    const { customerId, status } = req.params;

    try {
      let orders = [];
      if (status !== "all") {
        orders = await customerOrder.find({
          customerId: new ObjectId(customerId),
          delivery_status: status,
        });
      } else {
        orders = await customerOrder.find({
          customerId: new ObjectId(customerId),
        });
      }
      responseReturn(res, 200, {
        orders,
      });
    } catch (error) {
      console.log(error.message);
    }
  };
  get_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      const order = await customerOrder.findById(orderId);
      responseReturn(res, 200, {
        order,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  get_admin_orders = async (req, res) => {
    let { page, parPage, searchValue } = req.query;
    console.log(page,parPage,searchValue)
    page = parseInt(page);
    parPage = parseInt(parPage);

    const skipPage = parPage * (page - 1);

    try {
      if (searchValue) {
      } else {
        const orders = await customerOrder
          .aggregate([
            {
              $lookup: {
                from: "authororders",
                localField: "_id",
                foreignField: "orderId",
                as: "suborder",
              },
            },
          ])
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });

        const totalOrder = await customerOrder.aggregate([
          {
            $lookup: {
              from: "authororders",
              localField: "_id",
              foreignField: "orderId",
              as: "suborder",
            },
          },
        ]);

        responseReturn(res, 200, { orders, totalOrder: totalOrder.length });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  get_admin_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      const order = await customerOrder.aggregate([
        {
          $match: { _id: new ObjectId(orderId) },
        },
        {
          $lookup: {
            from: "authororders",
            localField: "_id",
            foreignField: "orderId",
            as: "suborder",
          },
        },
      ]);
      responseReturn(res, 200, { order: order[0] });
    } catch (error) {
      console.log("get admin order " + error.message);
    }
  };

  admin_order_status_update = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
      await customerOrder.findByIdAndUpdate(orderId, {
        delivery_status: status,
      });
      responseReturn(res, 200, { message: "order status change success" });
    } catch (error) {
      console.log("get admin order status error " + error.message);
      responseReturn(res, 500, { message: "internal server error" });
    }
  };

  get_seller_orders = async (req, res) => {
    const  sellerId =req.id
    let { page, parPage, searchValue } = req.query;
    page = parseInt(page);
    parPage = parseInt(parPage);

    const skipPage = parPage * (page - 1);

    try {
      if (searchValue) {
      } else {
        const orders = await authOrderModel
          .find({
            sellerId,
          })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalOrder = await authOrderModel
          .find({
            sellerId,
          })
          .countDocuments();
        responseReturn(res, 200, { orders, totalOrder });
      }
    } catch (error) {
      console.log("get seller order error " + error.message);
      responseReturn(res, 500, { message: "internal server error" });
    }
  };

  get_seller_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      const order = await authOrderModel.findById(orderId);

      responseReturn(res, 200, { order });
    } catch (error) {
      console.log("get admin order " + error.message);
    }
  };

  seller_order_status_update = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
      await authOrderModel.findByIdAndUpdate(orderId, {
        delivery_status: status,
      });
      responseReturn(res, 200, { message: "order status change success" });
    } catch (error) {
      console.log("get admin order status error " + error.message);
      responseReturn(res, 500, { message: "internal server error" });
    }
  };

  create_payment = async (req, res) => {
    const { price, orderId } = req.body;
    // ______WEBHOOK IMPLEMENTATION_____

    const isPaid = await axios.post();
    await customerOrder.findByIdAndUpdate(orderId, {
      delivery_status: "dispatching",
      payment_status: "paid",
    });
    try {
      // const payment = await stripe.paymentIntents.create({
      //   amount: price * 100,
      //   currency: "usd",
      //   automatic_payment_methods: {
      //     enabled: true,
      //   },
      // });
      responseReturn(res, 200, { clientSecret: payment.client_secret });
    } catch (error) {
      console.log(error.message);
    }
  };

  order_confirm = async (req, res) => {
    const { orderId } = req.params;
    try {
      await customerOrder.findByIdAndUpdate(orderId, {
        payment_status: "paid",
        delivery_status: "pending",
      });
      await authOrderModel.updateMany(
        { orderId: new ObjectId(orderId) },
        {
          payment_status: "paid",
          delivery_status: "pending",
        }
      );
      const cuOrder = await customerOrder.findById(orderId);

      const auOrder = await authOrderModel.find({
        orderId: new ObjectId(orderId),
      });

      const time = moment(Date.now()).format("l");

      const splitTime = time.split("/");

      await myShopWallet.create({
        amount: cuOrder.price,
        manth: splitTime[0],
        year: splitTime[2],
      });

      for (let i = 0; i < auOrder.length; i++) {
        await sellerWallet.create({
          sellerId: auOrder[i].sellerId.toString(),
          amount: auOrder[i].price,
          manth: splitTime[0],
          year: splitTime[2],
        });
      }

      responseReturn(res, 200, { message: "success" });
    } catch (error) {
      console.log(error.message);
    }
  };
  generateInvoice = async (req, res) => {
    try {
      const order = await customerOrder.findById(req.params.orderId);

      if (!order) return res.status(404).send("Order not found");

      // Create a new PDF document with margins
      const doc = new PDFDocument({ margin: 50 });

      // Path to store the generated PDF
      const filePath = path.join(__dirname, `invoice-${order.orderId}.pdf`);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Add brand logo
      const logoPath = path.join(__dirname, "/indi-shoppe-2.png"); // Adjust the path
      doc.image(logoPath, { fit: [200, 100], align: "left" });
      // Header
      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("Invoice", { align: "center" })
        .moveDown(3);

      // Order Details
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Order Details", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Order ID: ${order._id}`)
        .text(`Customer ID: ${order.customerId}`)
        .moveDown()
        .text(`Date: ${order.date}`)
        .moveDown()
        .text(`Payment Status: ${order.payment_status}`)

        .text(`Delivery Status: ${order.delivery_status}`)
        .moveDown(1);

      // Products Section
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Products", { underline: true })
        .moveDown(0.5);

      doc.fontSize(12).font("Helvetica");

      // Loop through products and add images and details
      order.products.forEach((product, index) => {
        doc.text(`${index + 1}. ${product.name} :  ${product.price}`, {
          indent: 20,
          lineGap: 5,
        });

        // Add product image
      });

      doc.moveDown(1);

      // Total Price
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(`Total Price: ${order.price}`, { align: "right" })
        .moveDown();

      // Footer with brand logo
      doc.moveDown(2);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Thank you for your purchase from indishopee!", {
          align: "center",
          lineGap: 5,
        })
        .moveDown(0.5);
      doc.text("If you have any questions, contact our support.", {
        align: "center",
      });

      // Finalize the PDF and end the stream
      doc.end();

      // Send the file path as a response
      writeStream.on("finish", () => {
        res.download(filePath, `invoice-${order.orderId}.pdf`, (err) => {
          if (err) console.error("Error downloading the file:", err);
          fs.unlinkSync(filePath); // Delete the file after download
        });
      });
    } catch (error) {
      res.status(500).send("Error generating invoice");
    }
  };
}

module.exports = new orderController();
