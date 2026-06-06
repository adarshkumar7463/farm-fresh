import { v2 as cloudinary } from 'cloudinary';
import logger from './logger.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary.
 */
export const uploadToCloudinary = (fileBuffer, folder = 'general') => {
  return new Promise((resolve, reject) => {
// console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
// console.log("API Key:", process.env.CLOUDINARY_API_KEY);
// console.log("API Secret:", process.env.CLOUDINARY_API_SECRET);
    if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  logger.warn('Cloudinary not configured. Skipping upload.');
  return resolve({
    secure_url: 'https://via.placeholder.com/150?text=No+Image',
    public_id: `dummy_${Date.now()}`
  });
}

    const uploadStream = cloudinary.uploader.upload_stream(
  {
    folder,
    resource_type: 'auto'
  },
  (error, result) => {
    if (error) {
      console.error('Cloudinary Upload Error:', error);
      return reject(error);
    }

    console.log('Cloudinary Upload Success:', result);

    resolve(result);
  }
);
    uploadStream.end(fileBuffer);
  });
};

/**
 * Deletes a resource from Cloudinary by public ID.
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw error;
  }
};
