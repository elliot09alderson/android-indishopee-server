const subCategoryModel = require("../../models/subCategory");
const categoryModel = require("../../models/categoryModel");
const { responseReturn } = require("../../utiles/response");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");
const productModel = require("../../models/productModel");
const { Types } = require("mongoose");

class subCategoryController {
  add_sub_category = async (req, res) => {
    const form = formidable();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        responseReturn(res, 404, { error: "something error" });
      } else {
        let { name, categoryId } = fields;
        if (!categoryId) {
          return responseReturn(res, 400, {
            error: "please reselect category",
          });
        }
        let { image } = files;
        name = name.trim();
        if (!image.filepath) {
          console.log("please upload image correctly");
          responseReturn(res, 400, { error: "please upload image correctly" });
        }
        const slug = name.split(" ").join("-");

        try {
          // Define the transformation parameters for cropping
          const cropParams = {
            width: 300,
            height: 300,
            crop: "crop", // Use 'crop' to perform cropping
            gravity: "auto", // Use 'auto' to automatically detect the most relevant region
          };
          // Upload the cropped image to Cloudinary
          const result = await cloudinary.uploader.upload(image.filepath, {
            folder: "subcategory",
            resource_type: "image",
            transformation: cropParams,
          });
          const getCategoryName = await categoryModel.findById(categoryId);
          const categoryName = getCategoryName.name;
          if (result) {
            const subCategory = await subCategoryModel.create({
              name,
              categoryName,
              categoryId,
              slug,
              image: result.url,
            });

            await subCategory.save();
            const category = await categoryModel.findOne({ _id: categoryId });
            category.subcategories.push(subCategory._id);
            await category.save();

            responseReturn(res, 201, {
              subCategory,
              message: "Subcategory add success",
            });
          } else {
            responseReturn(res, 404, { error: "Image upload failed" });
          }
        } catch (error) {
          console.log(error);
          responseReturn(res, 500, {
            error: "Internal zeryghzndsbfegWdserver error",
          });
        }
      }
    });
  };

  get_sub_category = async (req, res) => {
    const { page, searchValue, parPage } = req.query;
    try {
      let skipPage = "";
      if (parPage && page) {
        skipPage = parseInt(parPage) * (parseInt(page) - 1);
      }
      if (searchValue && page && parPage) {
        const subCategorys = await subCategoryModel
          .find({
            $text: { $search: searchValue },
          })
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalSubCategory = await subCategoryModel
          .find({
            $text: { $search: searchValue },
          })
          .countDocuments();
        responseReturn(res, 200, { totalSubCategory, subCategorys });
      } else if (searchValue === "" && page && parPage) {
        const subCategorys = await subCategoryModel
          .find({})
          .skip(skipPage)
          .limit(parPage)
          .sort({ createdAt: -1 });
        const totalSubCategory = await subCategoryModel
          .find({})
          .countDocuments();
        responseReturn(res, 200, { totalSubCategory, subCategorys });
      } else {
        const subCategorys = await subCategoryModel
          .find({})
          .sort({ createdAt: -1 });
        const totalSubCategory = await subCategoryModel
          .find({})
          .countDocuments();
        responseReturn(res, 200, { totalSubCategory, subCategorys });
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  get_one_sub_category = async (req, res) => {
    const { subCategoryId } = req.params;

    try {
      const subCategory = await subCategoryId.findById(subCategoryId);
      responseReturn(res, 200, { subCategory });
    } catch (error) {
      console.log(error.message);
    }
  };

  //delete category
  delete_sub_category = async (req, res) => {
    const { subCategoryId } = req.params;
    try {
      const subcategory = await subCategoryModel.findByIdAndDelete(
        subCategoryId
      );
      if (subcategory) {
        const productDeletion = await productModel.deleteMany(
          // Products directly in the category
          { subcategory: subcategory.name }
        );
      }
      responseReturn(res, 200, {
        message: "Sub Category deleted successfully",
        subCategoryId,
      });
    } catch (error) {
      responseReturn(res, 500, { message: error.message });
    }
  };

  sub_category_update = async (req, res) => {
    let { name, image, categoryId, subCategoryId } = req.body;
    name = name.trim();
    const slug = name.split(" ").join("-");
    try {
      await subCategoryModel.findByIdAndUpdate(subCategoryId, {
        name,
        categoryId,
        slug,
      });

      const subCategory = await subCategoryId.findById(subCategoryId);
      responseReturn(res, 200, {
        subCategory,
        message: "sub category update success",
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };
  sub_category_image_update = async (req, res) => {
    const form = formidable({ multiples: true });

    form.parse(req, async (err, field, files) => {
      const { subCategoryId, oldImage } = field;
      const { newImage } = files;

      if (err) {
        responseReturn(res, 404, { error: err.message });
      } else {
        try {
          cloudinary.config({
            cloud_name: process.env.cloud_name,
            api_key: process.env.api_key,
            api_secret: process.env.api_secret,
            secure: true,
          });
          const result = await cloudinary.uploader.upload(newImage.filepath, {
            folder: "subcategory",
          });
          if (result) {
            let { images } = await subCategoryModel.findById(subCategoryId);
            const index = images.findIndex((img) => img === oldImage);
            images[index] = result.url;

            await subCategoryModel.findByIdAndUpdate(subCategoryId, {
              images,
            });

            const subCategory = await subCategoryModel.findById(subCategoryId);
            responseReturn(res, 200, {
              subCategory,
              message: "sub category image update success",
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

  get_sub_cat_by_category = async (req, res) => {
    const { categoryId } = req.params;

    try {
      const subCategorys = await categoryModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(categoryId), // Match the category by its ID
          },
        },
        {
          $lookup: {
            from: "subcategories", // The name of the subcategories collection
            localField: "subcategories", // The field in the category document that contains ObjectId references to subcategories
            foreignField: "_id", // The field in the subcategory document that contains the _id
            as: "subcategoriesDetails", // This will hold the result of the join
          },
        },

        {
          $unwind: "$subcategoriesDetails", // Flatten the subcategoriesDetails array
        },
        {
          $replaceRoot: {
            newRoot: "$subcategoriesDetails", // Replace the root with the subcategory document itself
          },
        },
        {
          $project: {
            _id: 1, // Optionally remove the _id field from the category
            name: 1, // Include the array of subcategory objects
            slug: 1,
            image: 1,
            productType: 1,
          },
        },
      ]);

      if (subCategorys) {
        responseReturn(res, 200, {
          data: subCategorys,
          status: 200,
          message: "data fetched ",
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
}

module.exports = new subCategoryController();
