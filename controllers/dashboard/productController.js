const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const productModel = require("../../models/productModel");
const { responseReturn } = require("../../utiles/response");
const ProductDetailsModel = require("../../models/productDetailsModel");
const filteroptionModel = require("../../models/filteroptionModel");
class productController {
  add_product = async (req, res) => {
    const { id } = req;
    const form = formidable({ multiples: true });

    form.parse(req, async (err, field, files) => {
      let {
        name,
        category,
        subcategory,
        description,
        stock,
        price,
        discount,
        type,
        shopName,
        brand,
        colorName,
        discountedPrice,
        color,
        size,
        ram,
        storage,

        free_delivery,
      } = field;

      if (
        !name ||
        !category ||
        !subcategory ||
        !type ||
        !description ||
        !colorName ||
        !color ||
        !stock ||
        !price ||
        !discount ||
        !shopName
      ) {
        return responseReturn(res, 400, {
          message: "please provide details correctly",
        });
      }
      const { images } = files;
      name = name.trim();
      const slug = name.split(" ").join("-").split("/").join("-");

      try {
        const cropParams = {
          width: 500,
          height: 500,
          crop: "crop", // Use 'crop' to perform cropping
          gravity: "auto", // Use 'auto' to automatically detect the most relevant region
        };
        let allImageUrl = [];
        if (!Array.isArray(images)) {
          const result = await cloudinary.uploader.upload(images.filepath, {
            folder: "products",
          });

          allImageUrl = [...allImageUrl, result.url];
        } else {
          for (let i = 0; i < images.length; i++) {
            const result = await cloudinary.uploader.upload(
              images[i].filepath,
              {
                folder: "products",
                transformation: cropParams,
                resource_type: "image",
              }
            );
            allImageUrl = [...allImageUrl, result.url];
          }
        }

        const product = await productModel.create({
          sellerId: id,
          name,
          slug,
          shopName,
          type: type.toLowerCase(),
          subcategory,
          category: category.trim(),
          description: description.trim(),
          stock: parseInt(stock),
          price: parseInt(price),
          discount: parseInt(discount),
          images: allImageUrl,
          brand: brand.trim(),
          colorName,
          discountedPrice,
          color,

          ram,
          storage,

          size,
          free_delivery,
        });

        const variant = await ProductDetailsModel.create({
          productId: product._id,
          type: type.toLowerCase(),
          color,
          ram: ram ? ram : "",
          storage: storage ? storage : "",
          price: parseInt(price),
          size: size ? size : "",
          stock,
          colorName,
          discount: parseInt(discount),
          discountedPrice,
          images: allImageUrl,
        });
        if (variant) {
          const productDetails = await productModel.findOneAndUpdate(
            { _id: product._id },
            {
              //push variant Id here to variations field if it is not present
              $addToSet: {
                variations: variant._id,
              },
            },
            { new: true }
          );
        }
        console.log("createdVariant", variant);
        responseReturn(res, 201, { message: "product added successfully" });
      } catch (error) {
        console.log(error, "error");
        responseReturn(res, 500, { error: error.message });
      }
    });
  };
  products_get = async (req, res) => {
    const { page, searchValue, parPage } = req.query;
    const { id } = req;

    const skipPage = parseInt(parPage) * (parseInt(page) - 1);

    try {
      if (searchValue) {
        const products = await productModel
          .find({
            $text: { $search: searchValue },
            sellerId: id,
          })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalProduct = await productModel
          .find({
            $text: { $search: searchValue },
            sellerId: id,
          })
          .countDocuments();
        responseReturn(res, 200, { totalProduct, products });
      } else {
        const products = await productModel
          .find({ sellerId: id })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalProduct = await productModel
          .find({ sellerId: id })
          .countDocuments();
        responseReturn(res, 200, { totalProduct, products });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  //delete product
  product_delete = async (req, res) => {
    const { productId } = req.params;
    try {
      await productModel.findByIdAndDelete(productId);

      responseReturn(res, 200, {
        message: "product deleted successfully",
        productId,
      });
    } catch (error) {
      responseReturn(res, 500, { message: error.message });
    }
  };
  //   -------------------------------

  //get product
  product_get = async (req, res) => {
    const { productId } = req.params;

    try {
      const product = await productModel.findById(productId);
      responseReturn(res, 200, { product });
    } catch (error) {
      console.log(error.message);
    }
  };

  //   -------------------------------
  product_update = async (req, res) => {
    let { name, description, discount, price, brand, productId, stock } =
      req.body;
    name = name.trim();
    const slug = name.split(" ").join("-");
    try {
      await productModel.findByIdAndUpdate(productId, {
        name,
        description,
        discount,
        price,
        brand,
        productId,
        stock,
        slug,
      });
      const product = await productModel.findById(productId);
      responseReturn(res, 200, { product, message: "product update success" });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  product_image_update = async (req, res) => {
    const form = formidable({ multiples: true });

    form.parse(req, async (err, field, files) => {
      const { productId, oldImage } = field;
      const { newImage } = files;

      if (err) {
        responseReturn(res, 404, { error: err.message });
      } else {
        try {
          const result = await cloudinary.uploader.upload(newImage.filepath, {
            folder: "products",
          });
          if (result) {
            let { images } = await productModel.findById(productId);
            const index = images.findIndex((img) => img === oldImage);
            images[index] = result.url;

            await productModel.findByIdAndUpdate(productId, {
              images,
            });

            const product = await productModel.findById(productId);
            responseReturn(res, 200, {
              product,
              message: "product image update success",
            });
          } else {
            responseReturn(res, 404, { error: "image upload failed" });
          }
        } catch (error) {
          responseReturn(res, 404, { error: error.message });
        }
      }
    });
  };

  addVariants = async (req, res) => {
    const { productId } = req.params;
    const form = formidable({ multiples: true });
    console.log("data reached");
    form.parse(req, async (err, field, files) => {
      const { images } = files;
      if (!images) {
        return responseReturn(res, 400, {
          error: "please provide atleast one image",
        });
      }
      let {
        type,
        color,
        size,
        ram,
        storage,
        price,
        stock,
        colorName,
        discount,
        discountedPrice,
      } = field;
      console.log("field==> ", field);
      if ((!type, !color, !price, !stock)) {
        responseReturn(res, 400, {
          message: "please provide details correctly",
        });
      }

      try {
        const cropParams = {
          width: 500,
          height: 500,
          crop: "crop", // Use 'crop' to perform cropping
          gravity: "auto", // Use 'auto' to automatically detect the most relevant region
        };
        let allImageUrl = [];
        if (!Array.isArray(images)) {
          const result = await cloudinary.uploader.upload(images.filepath, {
            folder: "products",
          });

          allImageUrl = [...allImageUrl, result.url];
        } else {
          for (let i = 0; i < images.length; i++) {
            const result = await cloudinary.uploader.upload(
              images[i].filepath,
              {
                folder: "products-variants",
                transformation: cropParams,
                resource_type: "image",
              }
            );
            allImageUrl = [...allImageUrl, result.url];
          }
        }

        const variant = await ProductDetailsModel.create({
          productId,
          type: type.toLowerCase(),
          color,
          ram: ram ? ram : "",
          storage: storage ? storage : "",
          price,
          size: size ? size : "",
          stock,
          colorName,
          discount,
          discountedPrice,
          images: allImageUrl,
        });
        console.log("createdVariant", variant);
        if (variant) {
          const productDetails = await productModel.findOneAndUpdate(
            { _id: productId },
            {
              //push variant Id here to variations field if it is not present
              $addToSet: {
                variations: variant._id,
              },
            },
            { new: true }
          );

          if (productDetails) {
            console.log(
              "Variant successfully added to product variations:",
              productDetails
            );
            responseReturn(res, 201, {
              message: "product variant added successfully",
              variant,
            });
          } else {
            console.log("Product not found or update failed.");
            responseReturn(res, 201, {
              message: "product add variant operation failed ",
            });
          }
        }
      } catch (error) {
        console.log(error.message, "error");
        responseReturn(res, 500, { error: error.message });
      }
    });
  };

  addSponsorship = async (req, res) => {
    try {
      const { productId } = req.params;
      const { sponsoredId } = req.body;

      if (sponsoredId) {
        const sponsor = await productModel.findOneAndUpdate(
          { _id: productId },
          {
            //push variant Id here to variations field if it is not present
            $addToSet: {
              sponsors: sponsoredId,
            },
          },
          { new: true }
        );

        // console.log(productId);
        if (sponsor) {
          console.log(
            "sponsor successfully added to product sponsorlist:",
            sponsor
          );
          responseReturn(res, 201, {
            message: "sponsor added successfully",
            sponsor,
          });
        } else {
          console.log("Product not found or update failed.");
          responseReturn(res, 400, {
            message: "sponsor add operation failed ",
          });
        }
      }
      responseReturn(res, 400, {
        error: "please provide sponsor id",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  getDetailsWithVariants = async (req, res) => {
    const { productId } = req.params;

    try {
      // Find the product by its ID and populate the variations field
      const productDetails = await productModel
        .findById(productId)
        .populate({
          path: "variations", // Reference the variations field
          model: "variants", // The model name of the related schema
        })
        .select("-createdAt -updatedAt -__v");

      if (productDetails) {
        responseReturn(res, 200, {
          message: "Product details retrieved successfully",
          data: productDetails,

          status: 200,
        });
      } else {
        responseReturn(res, 200, { status: 404, message: "Product not found" });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      responseReturn(res, 500, {
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };

  /**
   *
   * @ANDROID
   *
   */
  getDetailsWithVariantsForAndroid = async (req, res) => {
    const { productId } = req.params;

    try {
      // Find the product by its ID and populate the variations field
      const productDetails = await productModel
        .findById(productId)
        .populate({
          path: "variations", // Reference the variations field
          model: "variants", // The model name of the related schema
        })
        .select("-createdAt -updatedAt -__v");

      const sponsors = await productModel.aggregate([
        // Match the product by ID
        {
          $match: { _id: new mongoose.Types.ObjectId(productId) }, // Convert productId to ObjectId
        },

        // Lookup to populate the sponsors
        {
          $lookup: {
            from: "products", // Name of the collection (Mongoose pluralizes model names)
            localField: "sponsors", // Field in the product schema
            foreignField: "_id", // Field in the sponsors schema
            as: "sponsorDetails", // Alias for the populated data
          },
        },

        // Project only necessary fields
        {
          $project: {
            _id: 0, // Exclude main product ID
            sponsors: {
              $map: {
                input: "$sponsorDetails",
                as: "sponsor",
                in: {
                  image: { $arrayElemAt: ["$$sponsor.images", 0] }, // First image
                  brand: "$$sponsor.brand",
                  price: "$$sponsor.price",
                  discount: "$$sponsor.discount",
                  name: "$$sponsor.name",
                },
              },
            },
          },
        },
      ]);

      const relatedProducts = await productModel.aggregate([
        {
          $match: {
            $and: [
              {
                _id: {
                  $ne: productDetails._id,
                },
              },
              {
                category: {
                  $eq: productDetails.category,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            category: 1,
            rating: 1,
            subcategory: 1,
            brand: 1,
            price: 1,
            discount: 1,
            stock: 1,
            description: 1,
            // Use $arrayElemAt to get the first image
            images: 1,
          },
        },
      ]);

      const moreProducts = await productModel.aggregate([
        {
          $match: {
            $and: [
              {
                _id: {
                  $ne: productId,
                },
              },
              {
                sellerId: {
                  $eq: productDetails.sellerId,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            category: 1,
            rating: 1,
            subcategory: 1,
            brand: 1,
            price: 1,
            discount: 1,
            stock: 1,
            description: 1,
            // Use $arrayElemAt to get the first image
            images: 1,
          },
        },
      ]);

      if (productDetails) {
        responseReturn(res, 200, {
          message: "Product details retrieved successfully",
          data: {
            productDetails: {
              ...productDetails._doc,
              variations: productDetails.variations,
            },
            relatedProducts,
            moreProducts,
            sponsors: sponsors[0].sponsors,
          },
          status: 200,
        });
      } else {
        responseReturn(res, 200, { status: 404, message: "Product not found" });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      responseReturn(res, 500, {
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };

  addFilter = async (req, res) => {
    const { productType } = req.body;

    const filter = await filteroptionModel.create({ productType });
    if (!filter) {
      responseReturn(res, 400, {
        message: "filter creation failed",
        status: 400,
      });
    }
    responseReturn(res, 200, {
      message: "filter created",
      status: 201,
    });
  };
  addFilterOptions = async (req, res) => {
    const { productType, options } = req.body;

    try {
      const filter = await filteroptionModel.findOneAndUpdate(
        { productType },
        { $addToSet: { options: { $each: options } } }, // Add options only if not already present
        { new: true, upsert: true } // Return updated document and create if not exists
      );

      return res.status(200).json({
        message: "Options updated successfully",
        filter,
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message,
      });
    }
  };
}

module.exports = new productController();
