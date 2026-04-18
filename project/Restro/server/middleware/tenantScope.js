// Ensures all queries are scoped to the user's restaurant
const tenantScope = (req, res, next) => {
  if (req.user && req.user.role !== 'superadmin' && req.user.restaurantId) {
    req.restaurantId = req.user.restaurantId;
  }
  next();
};

module.exports = tenantScope;
