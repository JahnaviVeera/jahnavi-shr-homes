import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    // Accept any field name for file uploads
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

export default upload;
