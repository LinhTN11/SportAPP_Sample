import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { uploadVenueImages } from '../middlewares/upload.middleware.js';
import {
  createVenue,
  listVenues,
  getVenueById,
  updateVenue,
  softDeleteVenue
} from '../controllers/venue.controller.js';
import {
  createField,
  listFieldsByVenue,
  getFieldById,
  updateField,
  deleteField
} from '../controllers/field.controller.js';

const router = express.Router();

router.get('/', listVenues);
router.get('/:id', getVenueById);

router.post('/', protect, authorize('OWNER', 'ADMIN'), uploadVenueImages.array('images', 10), createVenue);
router.put('/:id', protect, authorize('OWNER', 'ADMIN'), uploadVenueImages.array('images', 10), updateVenue);
router.delete('/:id', protect, authorize('OWNER', 'ADMIN'), softDeleteVenue);

router.get('/:venueId/fields', listFieldsByVenue);
router.get('/:venueId/fields/:fieldId', getFieldById);
router.post('/:venueId/fields', protect, authorize('OWNER', 'ADMIN'), createField);
router.put('/:venueId/fields/:fieldId', protect, authorize('OWNER', 'ADMIN'), updateField);
router.delete('/:venueId/fields/:fieldId', protect, authorize('OWNER', 'ADMIN'), deleteField);

export default router;
