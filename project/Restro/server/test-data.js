// Quick test script to create test data
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

async function createTestData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Restaurant = require('./models/Restaurant');
  const Inventory = require('./models/Inventory');
  const MenuItem = require('./models/MenuItem');
  const Table = require('./models/Table');
  
  // Check if test restaurant exists
  let restaurant = await Restaurant.findOne({ name: 'Test Restaurant' });
  
  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      owner: '507f1f77bcf86cd799439000',
      approvalStatus: 'approved',
      isActive: true,
      address: { street: 'Test St', city: 'Test City' },
      contact: { phone: '1234567890' }
    });
    console.log('Created restaurant:', restaurant._id);
  }
  
  // Create inventory items
  const inventoryItems = await Inventory.find({ restaurantId: restaurant._id });
  
  if (inventoryItems.length === 0) {
    const items = await Inventory.insertMany([
      { name: 'Chicken', quantity: 50, unit: 'kg', lowStockThreshold: 10, category: 'proteins', restaurantId: restaurant._id },
      { name: 'Basmati Rice', quantity: 100, unit: 'kg', lowStockThreshold: 20, category: 'grains', restaurantId: restaurant._id },
      { name: 'Papad', quantity: 200, unit: 'pieces', lowStockThreshold: 50, category: 'snacks', restaurantId: restaurant._id },
      { name: 'Onion', quantity: 30, unit: 'kg', lowStockThreshold: 5, category: 'vegetables', restaurantId: restaurant._id },
      { name: 'Tomato', quantity: 25, unit: 'kg', lowStockThreshold: 5, category: 'vegetables', restaurantId: restaurant._id }
    ]);
    console.log('Created inventory items:', items.length);
  }
  
  // Create menu items with ingredients
  const menuItems = await MenuItem.find({ restaurantId: restaurant._id });
  
  const inv = await Inventory.find({ restaurantId: restaurant._id });
  const chicken = inv.find(i => i.name === 'Chicken');
  const rice = inv.find(i => i.name === 'Basmati Rice');
  const papad = inv.find(i => i.name === 'Papad');
  const onion = inv.find(i => i.name === 'Onion');
  const tomato = inv.find(i => i.name === 'Tomato');
  
  if (menuItems.length === 0) {
    const items = await MenuItem.insertMany([
      {
        name: 'Chicken Biryani',
        description: ' aromatic rice dish with chicken',
        price: 250,
        category: 'Biryani',
        restaurantId: restaurant._id,
        ingredients: [
          { inventoryId: chicken._id, name: 'Chicken', quantityPerUnit: 0.3, unit: 'kg' },
          { inventoryId: rice._id, name: 'Basmati Rice', quantityPerUnit: 0.4, unit: 'kg' },
          { inventoryId: onion._id, name: 'Onion', quantityPerUnit: 0.2, unit: 'kg' },
          { inventoryId: tomato._id, name: 'Tomato', quantityPerUnit: 0.1, unit: 'kg' }
        ]
      },
      {
        name: 'Masala Papad',
        description: 'Crispy papad with masala',
        price: 50,
        category: 'Starters',
        restaurantId: restaurant._id,
        ingredients: [
          { inventoryId: papad._id, name: 'Papad', quantityPerUnit: 1, unit: 'pieces' }
        ]
      }
    ]);
    console.log('Created menu items:', items.length);
  }
  
  // Create tables
  const tables = await Table.find({ restaurantId: restaurant._id });
  if (tables.length === 0) {
    await Table.insertMany([
      { number: 1, capacity: 4, status: 'available', restaurantId: restaurant._id },
      { number: 2, capacity: 4, status: 'available', restaurantId: restaurant._id },
      { number: 5, capacity: 6, status: 'available', restaurantId: restaurant._id }
    ]);
    console.log('Created tables');
  }
  
  console.log('\n=== Test Data Ready ===');
  console.log('Restaurant ID:', restaurant._id);
  console.log('Table 5 available for orders');
  
  await mongoose.disconnect();
}

createTestData().catch(console.error);