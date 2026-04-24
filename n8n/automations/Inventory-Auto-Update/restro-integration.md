# Restro API Endpoints - Implemented

These endpoints are now implemented in your Restro server:

## 1. Get Ingredients for Multiple Menu Items
```
POST /api/menu/bulk-ingredients
```

**Request:**
```json
{ "menuItemIds": ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"] }
```

**Response:**
```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Chicken Biryani",
      "ingredients": [
        { "inventoryId": { "_id": "...", "name": "Chicken" }, "quantityPerUnit": 0.3, "unit": "kg" }
      ]
    }
  ]
}
```

## 2. Bulk Reduce Inventory Stock
```
POST /api/inventory/bulk-reduce
```

**Request:**
```json
{
  "items": [
    { "inventoryId": "507f1f77bcf86cd799439020", "quantity": 0.6 },
    { "inventoryId": "507f1f77bcf86cd799439021", "quantity": 0.8 }
  ]
}
```

**Response:**
```json
{
  "results": [
    { "inventoryId": "...", "success": true, "previousQuantity": 10, "remainingQuantity": 9.4, "wasLowStock": false }
  ]
}
```

## 3. Get Single Menu Item with Ingredients
```
GET /api/menu/:id/ingredients
```

## 4. Reduce Single Inventory Item
```
PUT /api/inventory/:id/reduce
```

---

## Already Implemented

### MenuItem Model - Added ingredients field
```javascript
// models/MenuItem.js - add this field
ingredients: [{
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
  quantityPerUnit: { type: Number, required: true }
}]
```

### Add API endpoints

```javascript
// routes/menuRoutes.js
router.get('/menu-items/:id', async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id).populate('ingredients.inventoryId');
  res.json(menuItem);
});

// routes/inventoryRoutes.js
router.put('/inventory/:id/reduce', async (req, res) => {
  const { quantity } = req.body;
  const inventory = await Inventory.findById(req.params.id);
  
  if (!inventory) {
    return res.status(404).json({ error: 'Inventory not found' });
  }
  
  inventory.quantity = Math.max(0, inventory.quantity - quantity);
  await inventory.save();
  
  res.json(inventory);
});
```

### Add webhook call in order creation

```javascript
// controllers/orderController.js
const order = await Order.create(orderData);

// Call n8n webhook (non-blocking)
if (process.env.N8N_WEBHOOK_URL) {
  axios.post(process.env.N8N_WEBHOOK_URL, {
    orderId: order._id,
    orderNumber: order.orderNumber,
    restaurantId: order.restaurantId,
    items: order.items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity
    }))
  }).catch(console.error);
}
```

Add to `.env`:
```
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/order-placed
```