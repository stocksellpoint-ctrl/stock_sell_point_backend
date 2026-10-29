import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadService } from './upload.service.js';

export const businessService = {
  // 🟢 1. Check if the user has set up their business info
  async checkSetup(ownerId) {
    const business = await prisma.businessInfo.findUnique({
      where: { ownerId },
      select: { id: true } // Only fetch the ID to keep it lightweight
    });
    
    return { isSetup: !!business }; // true if exists, false if null
  },

  // 🟢 2. Get the profile (Returns null if not setup)
  async get(ownerId) {
    const business = await prisma.businessInfo.findUnique({
      where: { ownerId },
    });
    return business; // Returns null if user hasn't set it up yet
  },

  // 🟢 3. Create or Update (Upsert)
  async upsert(ownerId, data, logoBuffer) {
    // Validation for mandatory fields
    if (!data.companyName || !data.companyName.trim()) {
      throw ApiError.badRequest('Company Name is required', 'INVALID_COMPANY_NAME');
    }
    if (!data.slogan || !data.slogan.trim()) {
      throw ApiError.badRequest('Slogan is required', 'INVALID_SLOGAN');
    }
    if (!data.phone || !data.phone.trim()) {
      throw ApiError.badRequest('Phone number is required', 'INVALID_PHONE');
    }

    // Check if it exists to handle old logo deletion
    const existing = await prisma.businessInfo.findUnique({ where: { ownerId } });

    let logoUrl = existing?.logoUrl || null;
    let logoPublicId = existing?.logoPublicId || null;

    // Handle new logo upload
    if (logoBuffer) {
      if (existing?.logoPublicId) {
        await uploadService.deleteImage(existing.logoPublicId);
      }
      const uploaded = await uploadService.uploadImage(logoBuffer);
      logoUrl = uploaded?.url;
      logoPublicId = uploaded?.publicId;
    }

    // Upsert: Create if new, Update if existing
    return prisma.businessInfo.upsert({
      where: { ownerId },
      create: {
        ownerId,
        companyName: data.companyName,
        slogan: data.slogan,
        phone: data.phone,
        address: data.address || null,
        email: data.email || null,
        specialization: data.specialization || null,
        tinNumber: data.tinNumber || null,
        binNumber: data.binNumber || null,
        currencySymbol: data.currencySymbol || 'BDT',
        logoUrl,
        logoPublicId,
      },
      update: {
        companyName: data.companyName,
        slogan: data.slogan,
        phone: data.phone,
        address: data.address !== undefined ? data.address : existing?.address,
        email: data.email !== undefined ? data.email : existing?.email,
        specialization: data.specialization !== undefined ? data.specialization : existing?.specialization,
        tinNumber: data.tinNumber !== undefined ? data.tinNumber : existing?.tinNumber,
        binNumber: data.binNumber !== undefined ? data.binNumber : existing?.binNumber,
        currencySymbol: data.currencySymbol || existing?.currencySymbol || 'BDT',
        logoUrl,
        logoPublicId,
      },
    });
  },
};