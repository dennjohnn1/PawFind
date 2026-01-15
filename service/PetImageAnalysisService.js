import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Maps AI analysis results to the pet registration form structure.
 */
const mapAnalysisToForm = (analysis) => {
  if (!analysis) return {};

  const formUpdates = {};

  if (analysis.species && analysis.species !== "Unknown") {
    formUpdates.species = analysis.species;
  }

  if (analysis.breed && analysis.breed !== "Unknown") {
    formUpdates.breed = analysis.breed;
    // Flag low confidence breeds for user review
    if (analysis.confidence?.breed !== "high") {
      formUpdates.breedConfidence = "low";
    }
  }

  if (analysis.sex && analysis.sex !== "Unknown") {
    formUpdates.sex = analysis.sex;
  }

  if (analysis.color) {
    formUpdates.color = analysis.color;
  }

  if (analysis.distinguishingFeatures) {
    formUpdates.distinguishingMarks = analysis.distinguishingFeatures;
  }

  // Map age group to approximate date of birth
  if (analysis.ageGroup && analysis.ageGroup !== "Unknown") {
    const today = new Date();
    let yearsToSubtract = 3; // Default Adult

    switch (analysis.ageGroup) {
      case "Puppy/Kitten":
        yearsToSubtract = 0.5;
        break;
      case "Young":
        yearsToSubtract = 1.5;
        break;
      case "Adult":
        yearsToSubtract = 3;
        break;
      case "Senior":
        yearsToSubtract = 8;
        break;
    }

    const approxDob = new Date();
    approxDob.setFullYear(today.getFullYear() - yearsToSubtract);

    formUpdates.dateOfBirth = {
      year: approxDob.getFullYear(),
      month: approxDob.getMonth() + 1,
      day: approxDob.getDate(),
    };
  }

  return {
    ...formUpdates,
    aiConfidence: analysis.confidence || {},
  };
};

// PetImageAnalysisService - Plain object singleton
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn("[PetImageAnalysisService] Gemini API key missing.");
  throw new Error("Gemini API key not configured. Set EXPO_PUBLIC_GEMINI_API_KEY.");
}

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Stable model
});

const PetImageAnalysisService = {
  /**
   * Fetches an image from a URL and converts it to Base64.
   */
  async fetchImageAsBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(",")[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("[PetImageAnalysisService] Error fetching image:", error);
      throw new Error("Failed to process image");
    }
  },

  /**
   * Analyzes a pet image and returns structured AI data.
   */
  async analyzePetImage(imageUrl, retries = 3, delayMs = 2000) {
    try {
      console.log("[PetImageAnalysisService] Starting image analysis...");
      const base64Image = await this.fetchImageAsBase64(imageUrl);

      const prompt = `
Analyze this pet image and extract the following information:
1. Species (Dog or Cat)
2. Breed 
3. Sex (Male, Female, Unknown)
4. Color/Markings
5. Approximate age (Puppy/Kitten, Young, Adult, Senior, Unknown)
6. Distinguishing features

Return EXACTLY as JSON, no extra text:
{
  "species": "...",
  "breed": "...",
  "sex": "...",
  "color": "...",
  "ageGroup": "...",
  "distinguishingFeatures": "...",
  "confidence": {
    "species": "high/medium/low",
    "breed": "high/medium/low", 
    "sex": "high/medium/low",
    "color": "high/medium/low"
  }
}
`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      ]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log("[PetImageAnalysisService] Analysis complete:", parsed);
        return parsed;
      } else {
        throw new Error("Failed to parse AI response as JSON. Response: " + responseText);
      }
    } catch (error) {
      if (retries > 0 && (error.message.includes("503") || error.message.includes("429"))) {
        console.warn(
          `[PetImageAnalysisService] Rate limited/overloaded, retrying in ${delayMs}ms... (${retries} left)`
        );
        await new Promise((res) => setTimeout(res, delayMs));
        return this.analyzePetImage(imageUrl, retries - 1, delayMs * 1.5);
      }
      console.error("[PetImageAnalysisService] Error analyzing image:", error);
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  },

  /**
   * Maps AI analysis to form - exposed as a method
   */
  mapAnalysisToForm(analysis) {
    return mapAnalysisToForm(analysis);
  }
};

// Export the service as default and the mapping function as named export
export default PetImageAnalysisService;
export { mapAnalysisToForm };