const router = require("express").Router();
const orderController = require("../../controllers/order/orderController");
const {
  customerMiddleware,
  authMiddleware,
} = require("../../middlewares/authMiddleware");

// ---- customer
router.post(
  "/home/order/palce-order",
  customerMiddleware,
  orderController.place_order
);
router.get("/generate-invoice/:orderId", orderController.generateInvoice);
router.post(
  "/home/customer/add_address",
  customerMiddleware,
  orderController.add_address
);
router.get(
  "/home/customer/get_all_address",
  customerMiddleware,
  orderController.get_all_address
);
router.get(
  "/home/customer/get_default_address",
  customerMiddleware,
  orderController.get_default_address
);
router.patch(
  "/home/customer/markDefaultAddress/:addressId",
  orderController.markDefaultAddress
);

router.delete(
  "/home/customer/delete_address/:addressId",
  orderController.delete_single_address
);
router.delete("/home/customer/delete_address", orderController.delete_address);
router.get(
  "/home/customer/gat-dashboard-data/:userId",
  orderController.get_customer_databorad_data
);
router.get(
  "/home/customer/gat-orders/:customerId/:status",
  orderController.get_orders
);
router.get(
  "/home/customer/gat-order/:orderId",
  customerMiddleware,
  orderController.get_order
);

router.post("/order/create-payment", orderController.create_payment);
router.get("/order/confirm/:orderId", orderController.order_confirm);

// --- admin
router.get("/admin/orders", orderController.get_admin_orders);
router.get("/admin/order/:orderId", orderController.get_admin_order);
router.put(
  "/admin/order-status/update/:orderId",
  orderController.admin_order_status_update
);

// ---seller

router.get("/seller/orders", authMiddleware, orderController.get_seller_orders);
router.get("/seller/order/:orderId", orderController.get_seller_order);
router.put(
  "/seller/order-status/update/:orderId",
  authMiddleware,
  orderController.seller_order_status_update
);

module.exports = router;
