import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const isValidLatitude = (lat) => {
  if (lat === null || lat === undefined) return true;
  const n = Number(lat);
  return Number.isFinite(n) && n >= -90 && n <= 90;
};

const isValidLongitude = (lng) => {
  if (lng === null || lng === undefined) return true;
  const n = Number(lng);
  return Number.isFinite(n) && n >= -180 && n <= 180;
};

const parseSportTypes = (sportTypes) => {
  if (sportTypes === undefined || sportTypes === null) return undefined;
  if (Array.isArray(sportTypes)) return sportTypes;

  if (typeof sportTypes === 'string') {
    const trimmed = sportTypes.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return undefined;
};

const isOwnerOrAdmin = (reqUser, ownerId) => {
  if (!reqUser) return false;
  if (reqUser.role === 'ADMIN') return true;
  return reqUser.role === 'OWNER' && reqUser.id === ownerId;
};

export const createVenue = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }
    if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const {
      name,
      phone,
      address,
      city,
      district,
      latitude,
      longitude,
      sportTypes,
      description,
      openTime,
      closeTime
    } = req.body;

    if (!name || !address || !city || !district) {
      return res.status(400).json({
        status: 'error',
        message: 'name, address, city, district là bắt buộc'
      });
    }

    if (!isValidLatitude(latitude)) {
      return res.status(400).json({ status: 'error', message: 'latitude không hợp lệ' });
    }
    if (!isValidLongitude(longitude)) {
      return res.status(400).json({ status: 'error', message: 'longitude không hợp lệ' });
    }

    const parsedSportTypes = parseSportTypes(sportTypes);

    const images = (req.files || []).map((f) => f.path);

    const venue = await prisma.venue.create({
      data: {
        ownerId: req.user.id,
        name,
        phone: phone || null,
        address,
        city,
        district,
        latitude: latitude === undefined || latitude === null || latitude === '' ? null : new Prisma.Decimal(String(latitude)),
        longitude:
          longitude === undefined || longitude === null || longitude === '' ? null : new Prisma.Decimal(String(longitude)),
        sportTypes: parsedSportTypes ?? [],
        description: description || null,
        images,
        status: 'PENDING',
        openTime: openTime || null,
        closeTime: closeTime || null
      }
    });

    res.status(201).json({
      status: 'success',
      data: venue
    });
  } catch (error) {
    next(error);
  }
};

export const listVenues = async (req, res, next) => {
  try {
    const { city, sport, isApproved, status } = req.query;

    const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {};

    if (city) where.city = String(city);

    if (status) {
      where.status = String(status);
    } else if (isApproved !== undefined) {
      const v = String(isApproved).toLowerCase();
      if (v === 'true' || v === '1') where.status = 'APPROVED';
      else if (v === 'false' || v === '0') where.status = { not: 'APPROVED' };
    } else {
      where.status = 'APPROVED';
    }

    const venues = await prisma.venue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const filteredBySport = sport
      ? venues.filter((v) => {
          const arr = Array.isArray(v.sportTypes) ? v.sportTypes : [];
          return arr.map(String).includes(String(sport));
        })
      : venues;

    res.json({
      status: 'success',
      data: {
        items: filteredBySport,
        page,
        limit,
        count: filteredBySport.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getVenueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        fields: true,
        reviews: true
      }
    });

    if (!venue || venue.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    res.json({ status: 'success', data: venue });
  } catch (error) {
    next(error);
  }
};

export const updateVenue = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }
    if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { id } = req.params;

    const existing = await prisma.venue.findUnique({ where: { id } });
    if (!existing || existing.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    if (!isOwnerOrAdmin(req.user, existing.ownerId)) {
      return res.status(403).json({ status: 'error', message: 'Bạn không có quyền sửa venue này' });
    }

    const {
      name,
      phone,
      address,
      city,
      district,
      latitude,
      longitude,
      sportTypes,
      description,
      openTime,
      closeTime,
      status
    } = req.body;

    if (latitude !== undefined && !isValidLatitude(latitude)) {
      return res.status(400).json({ status: 'error', message: 'latitude không hợp lệ' });
    }
    if (longitude !== undefined && !isValidLongitude(longitude)) {
      return res.status(400).json({ status: 'error', message: 'longitude không hợp lệ' });
    }

    const parsedSportTypes = parseSportTypes(sportTypes);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (latitude !== undefined) {
      updateData.latitude = latitude === null || latitude === '' ? null : new Prisma.Decimal(String(latitude));
    }
    if (longitude !== undefined) {
      updateData.longitude = longitude === null || longitude === '' ? null : new Prisma.Decimal(String(longitude));
    }
    if (parsedSportTypes !== undefined) updateData.sportTypes = parsedSportTypes;
    if (description !== undefined) updateData.description = description;
    if (openTime !== undefined) updateData.openTime = openTime;
    if (closeTime !== undefined) updateData.closeTime = closeTime;

    if (status !== undefined && req.user.role === 'ADMIN') {
      updateData.status = status;
    }

    if (req.files && req.files.length) {
      const newImages = req.files.map((f) => f.path);
      const existingImages = Array.isArray(existing.images) ? existing.images : [];
      updateData.images = [...existingImages, ...newImages];
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: updateData
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};

export const softDeleteVenue = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }
    if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }

    const { id } = req.params;

    const existing = await prisma.venue.findUnique({ where: { id } });
    if (!existing || existing.status === 'SUSPENDED') {
      return res.status(404).json({ status: 'error', message: 'Venue không tồn tại' });
    }

    if (!isOwnerOrAdmin(req.user, existing.ownerId)) {
      return res.status(403).json({ status: 'error', message: 'Bạn không có quyền xóa venue này' });
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: { status: 'SUSPENDED' }
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};
