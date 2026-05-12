import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

// file filter to accept only pdf

const fileFiler = (req : any, file : any, cb : any) => {
    const allowedExtensions = [".pdf"];
    const extName = path.extname(file.originalname);
    if (allowedExtensions.includes(extName)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only PDF files are allowed."), false);
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFiler,
    limits: {
        fileSize: 1024 * 1024 * 5, // 5MB limit
    },
});

export default upload;