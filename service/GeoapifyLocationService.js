import { GEOAPIFY_API_KEY } from "@env";

class GeoapifyService {
  constructor() {
    this.apiKey = GEOAPIFY_API_KEY;

    // Bicol provinces filter
    this.bicolProvinces = [
      "Albay",
      "Sorsogon",
      "Camarines Sur",
      "Camarines Norte",
      "Catanduanes",
      "Masbate",
    ];
  }

  /**
   * Autocomplete Search (Bicol Only)
   */
  async searchLocations(query) {
    if (!query || query.length < 2) {
      return { success: false, results: [], error: "Query too short" };
    }

    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        query
      )}&format=json&apiKey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error("[Geoapify] Search failed:", response.status);
        return { success: false, results: [], error: "Failed to fetch locations" };
      }

      const json = await response.json();
      const results = json.results || [];

      const filtered = results.filter((item) => {
        const province =
          item.state ||
          item.county ||
          item.region ||
          item.state_district ||
          "";
        return this.bicolProvinces.includes(province);
      });

      const mappedResults = filtered.map((item) => ({
        id: item.place_id,
        name: item.formatted,
        latitude: item.lat,
        longitude: item.lon,
        street: item.street,
        barangay: item.suburb,
        city: item.city || item.town,
        province: item.state,
        postalCode: item.postcode || "",
      }));

      return { success: true, results: mappedResults };
    } catch (error) {
      console.error("[Geoapify] Network error:", error);
      return { success: false, results: [], error: error.message };
    }
  }

  /**
   * Reverse Geocode (BigDataCloud)
   */
  async getAddressFromCoordinates(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const response = await fetch(url);

      if (!response.ok) return { success: false, address: `${lat}, ${lon}` };

      const json = await response.json();
      const address =
        json.localityInfo?.informative?.[0]?.description || json.locality;

      return { success: true, address };
    } catch (error) {
      console.error("[Geoapify][Reverse] Error:", error);
      return { success: false, address: `${lat}, ${lon}`, error: error.message };
    }
  }
}

// Export singleton instance
const geoapifyService = new GeoapifyService();
export default geoapifyService;
