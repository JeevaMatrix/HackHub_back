const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

module.exports = {
  uploadImage: async (filePath) => {
    return await cloudinary.uploader.upload(filePath, {
      folder: "event_banners"
    });
  },

  uploadPDF: async (filePath) => {
    const fileName = "brochure"; // without .pdf — Cloudinary will add

    return await cloudinary.uploader.upload(filePath, {
      folder: "event_brochures",
      resource_type: "raw",
      format: "pdf",                 // ensures extension
      flags: "attachment",           // forces auto-download
      public_id: fileName,           // name of the file without ext
      invalidate: true,
    });
  }
};
