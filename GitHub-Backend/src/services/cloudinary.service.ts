import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'desyyl4st';
const apiKey = process.env.CLOUDINARY_API_KEY || '729343848943969';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'uqozc1D1OIkWe8J7jM9jqJBPuxw';
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || '';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export class CloudinaryService {
  /**
   * Upload an image (base64 data URL, image data string, or file URL) to Cloudinary
   */
  public async uploadImage(fileData: string, folder = 'github_monitoring/profiles'): Promise<string> {
    try {
      if (!fileData) {
        throw new Error('File data is required for Cloudinary upload');
      }

      // If it's already a Cloudinary URL or remote HTTP URL, return as is
      if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
        return fileData;
      }

      logger.info('CLOUDINARY_SERVICE', `Uploading image file to Cloudinary cloud '${cloudName}'...`);
      
      const uploadOptions: any = {
        folder,
        resource_type: 'image',
      };

      if (uploadPreset) {
        uploadOptions.upload_preset = uploadPreset;
      }

      const result = await cloudinary.uploader.upload(fileData, uploadOptions);

      logger.info('CLOUDINARY_SERVICE', `Successfully uploaded image to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (err: any) {
      logger.error('CLOUDINARY_SERVICE', `Cloudinary image upload failed: ${err.message}`);
      throw new Error(`Cloudinary upload failed: ${err.message}`);
    }
  }

  /**
   * Upload documents/files/PDFs to Cloudinary
   */
  public async uploadDocument(fileData: string, folder = 'github_monitoring/documents'): Promise<string> {
    try {
      if (!fileData) {
        throw new Error('Document file data is required');
      }

      if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
        return fileData;
      }

      logger.info('CLOUDINARY_SERVICE', `Uploading document file to Cloudinary folder '${folder}'...`);
      const uploadOptions: any = {
        folder,
        resource_type: 'auto',
      };

      if (uploadPreset) {
        uploadOptions.upload_preset = uploadPreset;
      }

      const result = await cloudinary.uploader.upload(fileData, uploadOptions);

      logger.info('CLOUDINARY_SERVICE', `Successfully uploaded document to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (err: any) {
      logger.error('CLOUDINARY_SERVICE', `Cloudinary document upload failed: ${err.message}`);
      throw new Error(`Cloudinary document upload failed: ${err.message}`);
    }
  }
}

export const cloudinaryService = new CloudinaryService();
