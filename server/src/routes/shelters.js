const placeRouter = require('./placeRouter');

const toInt = (v) => Math.max(0, parseInt(v, 10) || 0);

module.exports = placeRouter({
  table: 'shelters',
  fields: ['name', 'address', 'capacity', 'current_occupancy', 'contact_phone', 'facilities', 'status'],
  statuses: ['open', 'full', 'closed'],
  normalize(data) {
    if (data.capacity !== undefined) data.capacity = toInt(data.capacity);
    if (data.current_occupancy !== undefined) data.current_occupancy = toInt(data.current_occupancy);
    return data;
  },
});
