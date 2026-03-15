import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isOwnerOrAdmin = (reqUser, ownerId) => {
  if (!reqUser) return false;
  if (reqUser.role === 'ADMIN') return true;
  return reqUser.role === 'OWNER' && reqUser.id === ownerId;
};

export const createField = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }
    if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { venueId } = req.params;
    const { name, sportType, fieldType, capacity, isActive } = req.body;

    if (!name || !sportType) {
      return res.status(400).json({ status: 'error', message: 'name và sportType là bắt buộc' });
    }

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue || venue.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    if (!isOwnerOrAdmin(req.user, venue.ownerId)) {
      return res.status(403).json({ status: 'error', message: 'Bạn không có quyền tạo field cho venue này' });
    }

    const field = await prisma.field.create({
      data: {
        venueId,
        name,
        sportType,
        fieldType: fieldType || 'STANDARD',
        capacity: capacity === undefined || capacity === null || capacity === '' ? null : parseInt(capacity, 10),
        isActive: isActive === undefined ? true : Boolean(isActive)
      }
    });

    res.status(201).json({ status: 'success', data: field });
  } catch (error) {
    next(error);
  }
};

export const listFieldsByVenue = async (req, res, next) => {
  try {
    const { venueId } = req.params;

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue || venue.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    const fields = await prisma.field.findMany({
      where: {
        venueId
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ status: 'success', data: fields });
  } catch (error) {
    next(error);
  }
};

export const getFieldById = async (req, res, next) => {
  try {
    const { venueId, fieldId } = req.params;

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue || venue.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    const field = await prisma.field.findFirst({
      where: {
        id: fieldId,
        venueId
      }
    });

    if (!field) {
      return res.status(404).json({ status: 'error', message: 'Field không tồn tại' });
    }

    res.json({ status: 'success', data: field });
  } catch (error) {
    next(error);
  }
};

export const updateField = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }
    if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { venueId, fieldId } = req.params;

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue || venue.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    if (!isOwnerOrAdmin(req.user, venue.ownerId)) {
      return res.status(403).json({ status: 'error', message: 'Bạn không có quyền sửa field của venue này' });
    }

    const existingField = await prisma.field.findFirst({ where: { id: fieldId, venueId } });
    if (!existingField) {
      return res.status(404).json({ status: 'error', message: 'Field không tồn tại' });
    }

    const { name, sportType, fieldType, capacity, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (sportType !== undefined) updateData.sportType = sportType;
    if (fieldType !== undefined) updateData.fieldType = fieldType;
    if (capacity !== undefined) {
      updateData.capacity = capacity === null || capacity === '' ? null : parseInt(capacity, 10);
    }
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.field.update({
      where: { id: existingField.id },
      data: updateData
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteField = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }
    if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { venueId, fieldId } = req.params;

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue || venue.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    if (!isOwnerOrAdmin(req.user, venue.ownerId)) {
      return res.status(403).json({ status: 'error', message: 'Bạn không có quyền xóa field của venue này' });
    }

    const existingField = await prisma.field.findFirst({ where: { id: fieldId, venueId } });
    if (!existingField) {
      return res.status(404).json({ status: 'error', message: 'Field không tồn tại' });
    }

    await prisma.field.delete({ where: { id: existingField.id } });

    res.json({ status: 'success', message: 'Xóa field thành công' });
  } catch (error) {
    next(error);
  }
};
