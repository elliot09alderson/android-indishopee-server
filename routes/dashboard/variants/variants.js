const variantRouter = require("express").Router();
const { authMiddleware } = require("../../../middlewares/authMiddleware");
const productController = require("../../../controllers/dashboard/productController");

/**
 *
 * @ANDROID
 *
 */

variantRouter.post(
  "/product/variants/:productId",
  authMiddleware,
  productController.addVariants
);

variantRouter.get(
  "/product/variants/:productId",

  productController.getDetailsWithVariants
);
module.exports = variantRouter;
