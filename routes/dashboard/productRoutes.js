const router = require("express").Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const productController = require("../../controllers/dashboard/productController");

router.post("/product-add", authMiddleware, productController.add_product);
router.get("/products-get", authMiddleware, productController.products_get);
router.get(
  "/product-get/:productId",
  authMiddleware,
  productController.product_get
);
router.get("/product-detail", productController.product_detail);

router.get(
  "/related-product-get/:productId",

  productController.related_products
);

router.delete(
  "/product-delete/:productId",
  authMiddleware,
  productController.product_delete
);
router.post(
  "/product-update",
  authMiddleware,
  productController.product_update
);
router.post(
  "/product-image-update",
  authMiddleware,
  productController.product_image_update
);

/**
 *
 *
 *   @ANDROID
 *
 */

router.post("/product/sponsor/:productId", productController.addSponsorship);
router.post(
  "/filter-options",
  authMiddleware,
  productController.addFilterOptions
);
router.post("/filter", authMiddleware, productController.addFilter);

module.exports = router;
