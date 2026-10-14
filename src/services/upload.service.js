import { cloudinary } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

export const uploadService = {
  /**
   * Uploads a file buffer to Cloudinary.
   * @param {Buffer} buffer
   * @param {string} folder  e.g. 'stock-sell/products'
   * @returns {Promise<{ url: string, publicId: string }>}
   */
  async uploadImage(buffer, folder = 'stock-sell/products') {
    if (!buffer) return null;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (err, result) => {
          if (err || !result) {
            return reject(
              ApiError.internal('Image upload failed', 'UPLOAD_FAILED')
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      stream.end(buffer);
    });
  },

  async deleteImage(publicId) {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (_) {
      // Ignore — image may already be gone
    }
  },
};