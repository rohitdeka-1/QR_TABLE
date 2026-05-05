/**
 * Haversine formula to calculate distance between two points on Earth
 * @param {number} lat1 - Latitude of first point (degrees)
 * @param {number} lon1 - Longitude of first point (degrees)
 * @param {number} lat2 - Latitude of second point (degrees)
 * @param {number} lon2 - Longitude of second point (degrees)
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Check if customer is within allowed radius of restaurant
 * @param {number} customerLat - Customer latitude
 * @param {number} customerLng - Customer longitude
 * @param {number} restaurantLat - Restaurant latitude
 * @param {number} restaurantLng - Restaurant longitude
 * @param {number} radiusKm - Allowed radius in kilometers (default 10)
 * @returns {object} { isWithinRadius: boolean, distance: number }
 */
export function isWithinRadius(customerLat, customerLng, restaurantLat, restaurantLng, radiusKm = 10) {
  const distance = calculateDistance(customerLat, customerLng, restaurantLat, restaurantLng);
  return {
    isWithinRadius: distance <= radiusKm,
    distance,
  };
}
