const adminModel = require("../models/adminModel");
const sellerModel = require("../models/sellerModel");
const sellerCustomerModel = require("../models/chat/sellerCustomerModel");
const bcrypt = require("bcryptjs");
const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const { responseReturn } = require("../utiles/response");
const { createToken } = require("../utiles/tokenCreate");
const generateOTP = require("../utiles/generateOtp");
const { sendEmail } = require("../utiles/email/sendEmail");

class authControllers {
  admin_login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const admin = await adminModel.findOne({ email }).select("+password");
      if (admin) {
        const match = await bcrypt.compare(password, admin.password);
        if (match) {
          const token = await createToken({
            id: admin.id,
            role: admin.role,
          });

          res.cookie("accessToken", token, {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          responseReturn(res, 200, { token, message: "Login success" });
        } else {
          responseReturn(res, 404, { error: "Password wrong" });
        }
      } else {
        responseReturn(res, 404, { error: "Email not found" });
      }
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };
  admin_register = async (req, res) => {
    const { email, name, password } = req.body;

    try {
      const user = await adminModel.findOne({ email });

      if (user) {
        responseReturn(res, 200, {
          message: "admin already exists",
          code: 400,
        });
        return;
      }

      const admin = await adminModel.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: "admin",
      });

      const token = await createToken({
        id: admin._id,
        role: "admin", // Replace with the actual role for the admin
      });

      res.cookie("accessToken", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      responseReturn(res, 201, {
        token,
        message: "admin created",
        code: 201,
      });
    } catch (error) {
      console.error("internal server error", error);
    }
  };

  seller_login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const seller = await sellerModel.findOne({ email }).select("+password");

      if (seller) {
        const match = await bcrypt.compare(password, seller.password);

        if (match) {
          const otp = generateOTP();

          await sendEmail(
            email,
            "Login OTP from Indishoppe",
            { name: seller.name, otp: otp },
            "./template/welcome.handlebars"
          );

          await sellerModel.updateOne({ _id: seller._id }, { otp: otp });
          responseReturn(res, 201, { message: "otp sent to your mail" });
        } else {
          responseReturn(res, 200, { error: "Wrong Credentials..." });
        }
      } else {
        responseReturn(res, 200, { error: "User not Found" });
      }
    } catch (error) {
      responseReturn(res, 500, { error: "Internal server Error" });
    }
  };

  verify_otp = async function (req, res, next) {
    try {
      const { email, otp } = req.body;
      const sellerData = await sellerModel.findOne({ email });
      if (Number(sellerData.otp) === otp) {
        const token = await createToken({
          id: sellerData.id,
          role: sellerData.role,
        });
        res.cookie("accessToken", token, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await sellerModel.findByIdAndUpdate(
          { _id: sellerData._id },
          { otp: null }
        );
        responseReturn(res, 200, {
          token,
          message: "logged in successfully ",
          status: 200,
        });
      } else {
        responseReturn(res, 200, { error: "Invalid OTP" });
      }
    } catch (err) {
      responseReturn(res, 500, { error: "Internal server error " });
    }
  };

  seller_register = async (req, res) => {
    console.log("hello");
    const form = formidable({ multiples: true });

    try {
      form.parse(req, async (err, fields, files) => {
        const {
          email,
          name,
          password,
          businessName,
          pan,
          subCategory,
          category,
          adhaar,
          businessAddress,
          pincode,
          gst,
        } = fields;

        const user = await sellerModel.findOne({ email });

        if (user) {
          responseReturn(res, 200, {
            message: "seller already exists",
            code: 400,
          });
          return;
        }

        let docs = [];
        try {
          const filesArray = Object.values(files);
          console.log(filesArray);
          for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            console.log(file);
            const result = await cloudinary.uploader.upload(file.path, {
              folder: "seller-documents-indishopee",
              resource_type: "raw",
            });
            docs.push({
              url: result.url,
            });
          }
          console.log(docs);
        } catch (error) {
          console.log(error.message);
        }
        const seller = await sellerModel.create({
          name,
          email,
          businessName,
          pan,
          subCategory,
          category,
          businessAddress,
          adhaar,
          pincode,
          gst,
          doc: docs,
          password: await bcrypt.hash(password, 10),
          method: "manual",
        });

        await sellerCustomerModel.create({
          myId: seller._id,
        });

        const token = await createToken({
          id: seller._id,
          role: "seller", // Replace with the actual role for the seller
        });

        res.cookie("accessToken", token, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        responseReturn(res, 201, {
          token,
          message: "user created",
          code: 201,
        });
      });
    } catch (error) {
      console.error("internal server error", error.message);
    }
  };

  getUser = async (req, res) => {
    const { id, role } = req;

    try {
      if (role === "admin") {
        const user = await adminModel.findById(id);
        responseReturn(res, 200, { userInfo: user });
      } else {
        const seller = await sellerModel.findById(id);
        responseReturn(res, 200, { userInfo: seller });
      }
    } catch (error) {
      responseReturn(res, 500, { error: "Internal server error" });
    }
  };

  profile_image_upload = async (req, res) => {
    const form = formidable({ multiples: true });
    form.parse(req, async (err, _, files) => {
      // console.log(files, "files..");

      const { image } = files;
      try {
        const cropParams = {
          width: 300,
          height: 300,
          crop: "crop", // Use 'crop' to perform cropping
          gravity: "auto", // Use 'auto' to automatically detect the most relevant region
        };

        const result = await cloudinary.uploader.upload(image.filepath, {
          folder: "profile",
          transformation: cropParams,
        });
        if (result) {
          await sellerModel.findByIdAndUpdate(req.id, {
            image: result.url,
          });
          const userInfo = await sellerModel.findById(req.id);
          responseReturn(res, 201, {
            message: "image upload success",
            userInfo,
          });
        } else {
          responseReturn(res, 404, { error: "image upload failed" });
        }
      } catch (error) {
        //console.log(error)
        responseReturn(res, 500, { error: error.message });
      }
    });
  };

  profile_info_add = async (req, res) => {
    const { pincode, category, businessName, businessAddress } = req.body;
    const { id } = req;

    try {
      await sellerModel.findByIdAndUpdate(
        id,
        { pincode, category, businessName, businessAddress },
        { new: true }
      );
      const userInfo = await sellerModel.findById(id);
      responseReturn(res, 201, {
        message: "Profile info add success",
        userInfo,
      });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  logout = async (req, res) => {
    try {
      res.cookie("accessToken", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      responseReturn(res, 200, { message: "logout success" });
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };
}
module.exports = new authControllers();
