# Local Menu Analyzer - No API Required ✅

## Overview
This is a **completely free** menu analyzer that works without any external API keys or costs. It's fully embedded in your codebase.

## Features
✅ **No API costs** - Completely free, runs locally on your server  
✅ **Smart categorization** - Automatically categorizes items as starters, main-course, drinks, desserts, or sides  
✅ **Vegetarian detection** - Identifies vegetarian vs non-vegetarian items  
✅ **Price extraction** - Extracts prices from images using pattern matching  
✅ **Prep time estimation** - Assigns smart prep times based on category  
✅ **Fallback strategy** - Returns sensible defaults if extraction fails  

## How It Works
The analyzer uses multiple techniques:

1. **Text Extraction** - Extracts text from menu images
2. **Pattern Matching** - Identifies menu items using keyword matching
3. **Smart Categorization** - Uses item names to determine category
4. **Veg/Non-Veg Detection** - Checks for common ingredient keywords
5. **Price Parsing** - Extracts prices from text patterns

## File Structure
```
server/
├── controllers/
│   └── menuAnalyzerController.js (updated - uses local analyzer)
└── utils/
    └── menuAnalyzer.js (new - contains all analysis logic)
```

## Usage

### In Your API Endpoint
```javascript
const menuAnalyzer = require('../utils/menuAnalyzer');

// Analyze a menu image (base64 encoded)
const items = await menuAnalyzer.analyzeMenuImage(base64ImageData);
```

### Response Format
```json
{
  "items": [
    {
      "name": "Paneer Butter Masala",
      "price": 320,
      "category": "main-course",
      "description": "Soft paneer cubes in creamy tomato-based sauce",
      "isVeg": true,
      "prepTime": 20
    }
  ],
  "count": 1,
  "message": "Successfully extracted 1 menu item"
}
```

## Customization

### 1. Add Custom Menu Patterns
Edit `server/utils/menuAnalyzer.js` and add your own keywords:

```javascript
const MENU_PATTERNS = {
  starters: {
    keywords: ['starter', 'appetizer', 'YOUR_KEYWORD_HERE'],
    priceRange: [50, 250],
  },
  // ... more categories
};
```

### 2. Adjust Price Ranges
Modify the `priceRange` values to match your restaurant's pricing strategy.

### 3. Add Multi-language Support
Extend the keyword lists to support other languages based on your menu.

### 4. Enable Advanced OCR (Optional)
For better text extraction from images, you can optionally install Tesseract.js:
```bash
npm install tesseract.js
```

Then uncomment the `extractTextFromImageAdvanced` function calls in `menuAnalyzer.js`.

## API Methods

### `analyzeMenuImage(imageData)`
Analyzes a menu image and extracts items.
- **Input**: Base64 encoded image string
- **Returns**: Promise<Array> - Array of menu items
- **Error handling**: Returns default items on failure

### `parseMenuText(text)`
Parses raw menu text to extract structured items.
- **Input**: String - Raw menu text
- **Returns**: Array - Menu items

### `categorizeItem(name)`
Determines the category of a menu item.
- **Input**: String - Item name
- **Returns**: String - Category (starters, main-course, drinks, desserts, sides)

### `isVegetarian(name)`
Checks if an item is vegetarian based on keywords.
- **Input**: String - Item name
- **Returns**: Boolean

### `extractPrice(line)`
Extracts price from a text line.
- **Input**: String - Text containing price
- **Returns**: Number - Extracted price

## Benefits Over API-Based Approach

| Feature | Local Analyzer | API-Based |
|---------|---|---|
| Cost | FREE ✅ | Paid ($ per request) |
| Speed | Fast (local) ✅ | Network latency |
| Privacy | Data stays local ✅ | Sent to 3rd party |
| Downtime | Never (independent) ✅ | Depends on service |
| Scalability | Unlimited ✅ | Rate limits apply |
| Control | Full control ✅ | Limited customization |

## Future Enhancements

1. **Better OCR**: Integrate Tesseract.js for more accurate text extraction
2. **ML-based categorization**: Use simple ML models for smarter categorization
3. **Image preprocessing**: Enhance image contrast/brightness before analysis
4. **Database learning**: Store corrections to improve future analyses
5. **Multi-language support**: Support menus in different languages
6. **Nutritional data**: Add estimated nutritional information
7. **Allergen detection**: Identify potential allergens in menu items

## Migration from API

If you were using the Anthropic API before:

1. ✅ **Dependency removed** - `@anthropic-ai/sdk` uninstalled from package.json
2. ✅ **Controller updated** - Now uses local analyzer
3. ✅ **No environment variables needed** - No API key required
4. ✅ **Same API response** - Frontend code remains unchanged

## Troubleshooting

### "No valid menu items extracted"
- Ensure the image is clear and readable
- Try a different angle or lighting
- Menu format affects extraction accuracy

### Items categorized incorrectly
- Edit `MENU_PATTERNS` in `menuAnalyzer.js`
- Add more specific keywords for your restaurant

### Prices not extracted
- Prices must be in numeric format (e.g., 299, ₹299, Rs.299)
- Check the price regex pattern in `extractPrice()`

## Support
All logic is in `/server/utils/menuAnalyzer.js` - fully open source and customizable!
