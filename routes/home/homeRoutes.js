const router = require("express").Router();
const homeControllers = require("../../controllers/home/homeControllers");
const {
  searchMiddleware,
  customerMiddleware,
} = require("../../middlewares/authMiddleware");
/**
 *          @FOR_WEB
 */
router.get("/get-categorys", homeControllers.get_categorys);
router.get("/get-products", homeControllers.get_products);
router.get("/get-product/:slug", homeControllers.get_product);
router.get("/price-range-latest-product", homeControllers.price_range_product);
router.get("/query-products", searchMiddleware, homeControllers.query_products);
router.get(
  "/recent-searches",
  customerMiddleware,
  homeControllers.get_recent_searches
);
router.post("/customer/submit-review", homeControllers.submit_review);
router.get("/customer/get-reviews/:productId", homeControllers.get_reviews);

/**
 *          @FOR_ANDROID
 */

router.get("/all", homeControllers.getEverything);

router.get("/allproducts", homeControllers.allProducts);
router.get("/allsubcats", homeControllers.allSubcategorys);
router.get("/products/:subcat", homeControllers.fetchBySubcat);

router.get("/category-list", homeControllers.categoryList);

module.exports = router;
