import { GoogleGenerativeAI } from "@google/generative-ai";
import { firebaseApp } from "../firebase"; // Adjust path as needed

class AIBehaviorService {
  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    if (!this.apiKey) {
      console.warn("[AIBehaviorService] Gemini API key missing.");
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    // Using flash model for fast, low-cost behavioral analysis
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
    });
  }

  /**
   * Predicts pet behavior and search areas based on species and personality traits.
   */
  async analyzeLostBehavior(data) {
    const prompt = `
      Pet Species: ${data.species}
      Breed: ${data.breed || "Unknown"}
      Behavioral Trait: ${data.behavior}
      Time Lost: ${data.lastSeenTime}
      Environment: ${data.environment}

      Act as a professional pet recovery expert specializing in animal psychology. 
      Provide a JSON response only:
      {
        "strategy": "A short tactical advice for the owner based on animal psychology.",
        "radius": "Recommended distance in meters with a brief reason why.",
        "prioritySpots": "Comma separated list of specific hiding spots typical for this species."
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // CLEANUP: Remove Markdown formatting (backticks/json tag) before parsing
      const cleanJson = text.replace(/```json|```/g, "").trim();
      
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("[AIBehaviorService] Error analyzing behavior:", error);
      throw error;
    }
  }
}

export default new AIBehaviorService();