const placeRouter = require('./placeRouter');

module.exports = placeRouter({
  table: 'distribution_points',
  fields: ['name', 'address', 'supply_types', 'open_time', 'close_time', 'contact_phone', 'status'],
  statuses: ['active', 'closed'],
});
