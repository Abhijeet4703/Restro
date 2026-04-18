/**
 * Image Generation Controller
 * ============================
 * Endpoints for generating AI dish images via Pollinations.ai.
 *
 * POST /api/menu/generate-image      — Generate image for a single dish
 * POST /api/menu/generate-images     — Batch generate for multiple dishes
 * GET  /api/menu/image-url/:itemId   — Get or generate image URL for an item
 */

const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const {
  generateDishImageUrl,
  generateAndDownloadDishImage,
  downloadImageAsBase64,
  generateImagesForItems,
} = require('../utils/imageGenerator');

/**
 * POST /api/menu/generate-image
 * Body: { itemId, template? }
 * Generates an AI image for one menu item and saves it to DB.
 */
exports.generateImage = async (req, res) => {
  try {
    const { itemId, template } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: 'itemId is required' });
    }

    const item = await MenuItem.findOne({ _id: itemId, restaurantId: req.restaurantId });
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Determine template
    let activeTemplate = template;
    if (!activeTemplate) {
      const restaurant = await Restaurant.findById(req.restaurantId);
      activeTemplate = restaurant?.activeTemplate || 'royal-3d';
    }

    console.log(`[ImageGen] Generating image for "${item.name}" (category: ${item.category}, template: ${activeTemplate})`);

    // Uses TheMealDB (dish-specific) → Unsplash CDN (keyword fallback)
    const base64Image = await generateAndDownloadDishImage(item.name, item.category, activeTemplate, item.isVeg);

    item.image = base64Image;
    await item.save();

    console.log(`[ImageGen] ✓ Saved image for "${item.name}" (${Math.round(base64Image.length / 1024)}KB)`);

    res.json({
      success: true,
      itemId: item._id,
      name: item.name,
      imageSize: base64Image.length,
      message: `Image generated for ${item.name}`,
    });
  } catch (error) {
    console.error('[ImageGen] ✗ generateImage error for item:', error.message);
    res.status(500).json({ message: error.message || 'Failed to generate image', error: error.message });
  }
};

/**
 * POST /api/menu/generate-images
 * Body: { itemIds?, template?, all? }
 *   - itemIds: array of specific item IDs to generate for
 *   - all: true to generate for all items without images
 *   - template: override template (otherwise uses restaurant's activeTemplate)
 *
 * Generates images in batch and returns progress via SSE or final JSON.
 */
exports.generateImages = async (req, res) => {
  try {
    const { itemIds, template, all, force } = req.body;

    // Determine template
    const restaurant = await Restaurant.findById(req.restaurantId);
    const activeTemplate = template || restaurant?.activeTemplate || 'royal-3d';

    // Find items to process
    let query = { restaurantId: req.restaurantId };
    if (all) {
      if (!force) {
        // Only generate for items that don't have images yet
        query.image = { $in: [null, ''] };
      }
      // force:true → no image filter, regenerate everything
    } else if (itemIds && itemIds.length > 0) {
      query._id = { $in: itemIds };
    } else {
      return res.status(400).json({ message: 'Provide itemIds array or set all:true' });
    }

    const items = await MenuItem.find(query).lean();

    if (items.length === 0) {
      return res.json({ message: 'No items need image generation', generated: 0 });
    }

    console.log(`[ImageGen] Batch generating ${items.length} images (template: ${activeTemplate})`);

    // Generate all images
    const results = await generateImagesForItems(items, activeTemplate, 3, (done, total) => {
      console.log(`[ImageGen] Progress: ${done}/${total}`);
    });

    // Save to DB
    let saved = 0;
    for (const result of results) {
      if (result._id && result.image) {
        await MenuItem.updateOne({ _id: result._id }, { $set: { image: result.image } });
        saved++;
      }
    }

    console.log(`[ImageGen] Batch complete: ${saved}/${items.length} images saved`);

    res.json({
      success: true,
      total: items.length,
      generated: saved,
      failed: items.length - saved,
      message: `Generated ${saved} of ${items.length} dish images`,
    });
  } catch (error) {
    console.error('[ImageGen] generateImages error:', error.message);
    res.status(500).json({ message: 'Failed to generate images', error: error.message });
  }
};

/**
 * GET /api/menu/image-url/:itemId
 * Returns a Pollinations URL (no download) for quick preview.
 */
exports.getImageUrl = async (req, res) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.itemId, restaurantId: req.restaurantId });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.image) {
      return res.json({ imageUrl: item.image, cached: true });
    }

    const restaurant = await Restaurant.findById(req.restaurantId);
    const template = restaurant?.activeTemplate || 'royal-3d';

    const imageUrl = generateDishImageUrl(item.name, item.category, template, item.isVeg);
    res.json({ imageUrl, cached: false });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get image URL', error: error.message });
  }
};

/**
 * POST /api/menu/generate-image-url
 * Body: { dishName, category, template?, isVeg? }
 * Returns a Pollinations URL without saving — useful for preview before saving items.
 */
exports.previewImageUrl = async (req, res) => {
  try {
    const { dishName, category, template, isVeg } = req.body;

    if (!dishName) {
      return res.status(400).json({ message: 'dishName is required' });
    }

    let activeTemplate = template;
    if (!activeTemplate && req.restaurantId) {
      const restaurant = await Restaurant.findById(req.restaurantId);
      activeTemplate = restaurant?.activeTemplate || 'royal-3d';
    }
    activeTemplate = activeTemplate || 'royal-3d';

    const imageUrl = generateDishImageUrl(dishName, category || 'main-course', activeTemplate, isVeg ?? true);

    res.json({ imageUrl, dishName, template: activeTemplate });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate preview URL', error: error.message });
  }
};

/**
 * GET /api/menu/download-preview-image
 * Query: { dishName, category, template?, isVeg? }
 * Downloads image from Pollinations server-side and returns as base64 data URL.
 * No auth required — safe for onboarding flow.
 */
exports.downloadPreviewImage = async (req, res) => {
  try {
    const { dishName, category, template, isVeg } = req.query;
    if (!dishName) return res.status(400).json({ message: 'dishName is required' });
    const activeTemplate = template || 'royal-3d';

    console.log(`[PreviewImage] Generating image for "${dishName}" (category: ${category || 'main-course'})...`);
    // Uses TheMealDB (dish-specific) → Unsplash CDN (keyword fallback)
    const base64Image = await generateAndDownloadDishImage(
      dishName,
      category || 'main-course',
      activeTemplate,
      isVeg === 'true'
    );
    console.log(`[PreviewImage] ✓ Done for "${dishName}" (${Math.round(base64Image.length / 1024)}KB)`);
    res.json({ imageUrl: base64Image, dishName, template: activeTemplate });
  } catch (error) {
    console.error('[PreviewImage] ✗ Error for "' + dishName + '":', error.message);
    res.status(500).json({ message: error.message || 'Failed to generate image', error: error.message });
  }
};
