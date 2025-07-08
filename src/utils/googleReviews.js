const axios = require("axios");
const GOOGLE_API_KEY = require("../config/index"); // Make sure this is set in your .env

// 🔧 Helper to get reviews & rating from Google Place API
async function getGoogleReviews(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,reviews&key=${GOOGLE_API_KEY}`;

  try {
    const response = await axios.get(url);
    const { rating, reviews } = response.data.result || {};
    return {
      rating: rating || null,
      reviews: reviews || []
    };
  } catch (error) {
    console.error("Failed to fetch Google Reviews:", error.message);
    return { rating: null, reviews: [] };
  }
}

module.exports = getGoogleReviews;
