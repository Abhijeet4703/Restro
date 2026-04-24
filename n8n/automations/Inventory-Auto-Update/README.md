# Inventory Auto-Update Workflow

## Overview
Automatically reduces inventory stock when orders are placed and alerts owner when stock is low.

## Flow
```
Order Webhook → Parse Data → Get Ingredients → Calculate Reductions → Reduce Stock → Check Low Stock → [Email/Slack Alert]
```

## n8n Environment Variables
Configure these in n8n:
| Variable | Description | Example |
|----------|-------------|---------|
| `RESTRO_API_URL` | Restro server URL | `http://localhost:5000` |
| `OWNER_EMAIL` | Email for alerts | `owner@restaurant.com` |

## API Endpoints Used

### 1. Get Ingredients for Multiple Menu Items
```
POST /api/menu/bulk-ingredients
```

**Request:**
```json
{ "menuItemIds": ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"] }
```

### 2. Bulk Reduce Inventory Stock
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

## Setup in n8n

1. **Import** `workflow.json`
2. **Add Credentials:** HTTP Header Auth, Gmail, Slack
3. **Set Environment Variables:** `RESTRO_API_URL`, `OWNER_EMAIL`

## Restro Server Setup

### 1. Update .env
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

### 2. Add Ingredients to Menu Items
```json
{
  "name": "Chicken Biryani",
  "price": 250,
  "category": "Biryani",
  "ingredients": [
    { "inventoryId": "...", "name": "Chicken", "quantityPerUnit": 0.3, "unit": "kg" }
  ]
}
```

### 3. Create Inventory Items
```json
{
  "name": "Chicken",
  "quantity": 50,
  "unit": "kg",
  "lowStockThreshold": 10
}
```

## How It Works

1. **Order Placed** → Restro sends webhook to n8n
2. **n8n fetches** menu item ingredients from Restro API
3. **Calculates** total quantity needed (orderQty × ingredientPerUnit)
4. **Reduces** inventory stock via bulk API
5. **Checks** if any items are now low stock
6. **Alerts** owner via email + Slack if low stock detected
- **Gmail**: Configure Gmail credentials for email alerts

### 3. Update API Endpoints
Edit the workflow nodes to match your Restro server:
- Replace `http://localhost:5000` with your actual server URL

### 4. Webhook URL
After activating, n8n will provide a webhook URL:
```
https://your-n8n-instance.com/webhook/order-placed
```

### 5. Connect Restro to Webhook
In your Restro server, add a webhook call when orders are placed:

```javascript
// In orderController.js, after order creation:
const order = await Order.create(orderData);

// Call n8n webhook
axios.post('https://your-n8n-instance.com/webhook/order-placed', {
  orderId: order._id,
  orderNumber: order.orderNumber,
  items: order.items.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity
  })),
  restaurantId: order.restaurantId
});
```

## Expected Webhook Payload

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "ORD-001",
  "restaurantId": "507f1f77bcf86cd799439012",
  "items": [
    {
      "menuItemId": "507f1f77bcf86cd799439013",
      "name": "Chicken Biryani",
      "quantity": 2
    }
  ]
}
```

## Requirements

- n8n instance (self-hosted or cloud)
- Restro server running
- Gmail account for notifications
- API authentication for Restro

## Customization

- Add more notification channels (Slack, SMS, etc.)
- Add reorder automation
- Add inventory reports
- Add multiple threshold alerts