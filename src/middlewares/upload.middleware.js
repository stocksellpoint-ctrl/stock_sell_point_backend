import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// Use memory storage — we forward the buffer to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        'Only JPEG, PNG, or WebP images are allowed',
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single('image'); // field name on the client must be 'image'