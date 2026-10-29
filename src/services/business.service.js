import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadService } from './upload.service.js';

export const businessService = {
  // Get or Create Business Profile
  async getOrCreate(ownerId) {
    let business = await prisma.businessInfo.findUnique({
      where: { ownerId },
    });

    if (!business) {
      // Create default profile if none exists
      business = await prisma.businessInfo.create({
        data: {
          ownerId,
          companyName: 'My Company',
          slogan: 'Your Slogan Here',
          phone: '0000000000',
        },
      });
    }

    return business;
  },

  // Update Business Profile
  async update(ownerId, data, logoBuffer) {
    const existing = await this.getOrCreate(ownerId);

    // Validation for mandatory fields
    if (data.companyName !== undefined && !data.companyName.trim()) {
      throw ApiError.badRequest('Company Name is required', 'INVALID_COMPANY_NAME');
    }
    if (data.slogan !== undefined && !data.slogan.trim()) {
      throw ApiError.badRequest('Slogan is required', 'INVALID_SLOGAN');
    }
    if (data.phone !== undefined && !data.phone.trim()) {
      throw ApiError.badRequest('Phone number is required', 'INVALID_PHONE');
    }

    let logoUrl = existing.logoUrl;
    let logoPublicId = existing.logoPublicId;

    // Handle new logo upload
    if (logoBuffer) {
      // Delete old logo if exists
      if (existing.logoPublicId) {
        await uploadService.deleteImage(existing.logoPublicId);
      }
      const uploaded = await uploadService.uploadImage(logoBuffer);
      logoUrl = uploaded?.url;
      logoPublicId = uploaded?.publicId;
    }

    return prisma.businessInfo.update({
      where: { ownerId },
      data: {
        companyName: data.companyName ?? existing.companyName,
        slogan: data.slogan ?? existing.slogan,
        phone: data.phone ?? existing.phone,
        address: data.address !== undefined ? data.address : existing.address,
        email: data.email !== undefined ? data.email : existing.email,
        specialization: data.specialization !== undefined ? data.specialization : existing.specialization,
        tinNumber: data.tinNumber !== undefined ? data.tinNumber : existing.tinNumber,
        binNumber: data.binNumber !== undefined ? data.binNumber : existing.binNumber,
        currencySymbol: data.currencySymbol ?? existing.currencySymbol,
        logoUrl,
        logoPublicId,
      },
    });
  },
};