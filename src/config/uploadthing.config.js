// src/config/uploadthing.config.js
const { createUploadthing } = require("uploadthing/server");
 
// Create an UploadThing instance
const uploadthing = createUploadthing();

// Define file routes
const fileRouter = {
  // Define a receipt upload route
  receiptUploader: uploadthing({ pdf: { maxFileSize: "4MB" } })
    // Set permissions and file types for this route
    .middleware(({ req }) => {
      // This code runs on your server before upload
      const user = req.user;
 
      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");
 
      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
 
      console.log("file url", file.url);
 
      // Return details to client
      return { fileUrl: file.url };
    }),
};

module.exports = {
  uploadthing,
  fileRouter
};