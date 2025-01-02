const router = require("express").Router();
const customerOrderController = require("../../controllers/dashboard/customerOrderController");
const {
  customerMiddleware,
  authMiddleware,
} = require("../../middlewares/authMiddleware");

// ---- customer
router.post(
  "/order/create",
  customerMiddleware,
  customerOrderController.create_order
);
router.post("/orders", customerMiddleware, customerOrderController.get_orders);
router.post(
  "/order/:id",
  customerMiddleware,
  customerOrderController.get_order
);

router.delete(
  "/order/:id",
  customerMiddleware,
  customerOrderController.delete_order
);

module.exports = router;
