import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { firebaseApp } from "../firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";

class MatchingService {
  constructor() {
    this.db = getFirestore(firebaseApp);

    this.hfApiKey = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY;
    this.geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!this.geminiApiKey) {
      console.warn("[MatchingService] Gemini API key missing.");
    }

    this.genAI = new GoogleGenerativeAI(this.geminiApiKey);

    this.geminiModel = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });
  }

  /**
   * Generates an image embedding with retry logic for model loading
   */
  async generateImageEmbedding(imageUrl, retryCount = 0) {
    try {
      console.log(
        `[MatchingService] Generating embedding (Attempt ${retryCount + 1})...`
      );

      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.hfApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: imageUrl }),
        }
      );

      const result = await response.json();

      // Handle model loading
      if (result?.error?.includes("currently loading") && retryCount < 3) {
        const waitTime = (result.estimated_time || 5) * 1000;
        console.log(
          `[MatchingService] Model loading. Waiting ${waitTime}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.generateImageEmbedding(imageUrl, retryCount + 1);
      }

      if (!Array.isArray(result)) {
        console.error("[MatchingService] Unexpected HF Response:", result);
        return null;
      }

      return result;
    } catch (error) {
      console.error("[MatchingService] HF Embedding Error:", error);
      return null;
    }
  }

  async fetchImageAsBase64(imageUrl) {
    const response = await fetch(imageUrl);
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
  }

  /**
   * Cosine Similarity calculation
   */
  calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Deep visual verification using OpenAI GPT-4o-mini
   */
  async verifyWithAI(imageA, imageB) {
    try {
      const prompt = `
Compare these two pet images.
Are they likely the same animal?

Focus on:
- Unique markings
- Fur patterns
- Facial structure

Respond exactly in this format:
Match Probability: [0-100]%
Reason: <short explanation>
`;

      const result = await this.geminiModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: await this.fetchImageAsBase64(imageA),
          },
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: await this.fetchImageAsBase64(imageB),
          },
        },
      ]);

      return result.response.text();
    } catch (error) {
      console.error("Gemini Verification Error:", error);
      return "AI Verification unavailable";
    }
  }

  /**
   * Improved Match Score including Visual Similarity
   */
  calculateMatchScore(lostReport, foundReport) {
    let score = 0;
    const matchDetails = {
      species: false,
      breed: false,
      color: false,
      location: false,
      visual: "none",
    };

    // 1. Basic Metadata Matching (Species/Breed)
    if (
      lostReport.species?.toLowerCase() === foundReport.species?.toLowerCase()
    ) {
      score += 30;
      matchDetails.species = true;
    }

    if (lostReport.breed?.toLowerCase() === foundReport.breed?.toLowerCase()) {
      score += 20;
      matchDetails.breed = true;
    }

    // 2. Visual Matching (Embedding Similarity)
    if (lostReport.imageVector && foundReport.imageVector) {
      const visualSim = this.calculateCosineSimilarity(
        lostReport.imageVector,
        foundReport.imageVector
      );

      // ViT embeddings usually have high similarity.
      // Thresholds: > 0.95 High, > 0.90 Medium
      if (visualSim > 0.95) {
        score += 40;
        matchDetails.visual = "high";
      } else if (visualSim > 0.88) {
        score += 20;
        matchDetails.visual = "medium";
      }
    }

    return {
      score,
      matchDetails,
      matchLevel: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    };
  }

  getMatchLevel(score) {
    if (score >= 70) return "high";
    if (score >= 50) return "medium";
    if (score >= 30) return "low";
    return "unlikely";
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  calculateTimeDifference(date1, date2) {
    let d1 = date1?.seconds ? new Date(date1.seconds * 1000) : new Date(date1);
    let d2 = date2?.seconds ? new Date(date2.seconds * 1000) : new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Enhanced findPotentialMatches with species filtering
   */
  async findPotentialMatches(lostReport) {
    try {
      const reportsRef = collection(this.db, "reports");
      // Optimization: Filter by found status and species in the query
      const q = query(
        reportsRef,
        where("reportType", "==", "found"),
        where("status", "==", "open"),
        where("species", "==", lostReport.species)
      );

      const snapshot = await getDocs(q);
      const potentialMatches = [];

      snapshot.docs.forEach((doc) => {
        const foundReport = { id: doc.id, ...doc.data() };
        let scoreResult = this.calculateMatchScore(lostReport, foundReport);

        // Add Image Similarity Score
        if (lostReport.imageVector && foundReport.imageVector) {
          const visualSim = this.calculateCosineSimilarity(
            lostReport.imageVector,
            foundReport.imageVector
          );
          // Add up to 40 points for visual similarity
          if (visualSim > 0.85) scoreResult.score += 40;
          else if (visualSim > 0.7) scoreResult.score += 20;
        }

        if (foundReport.reporterId === lostReport.reporterId) return;

        const matchResult = this.calculateMatchScore(lostReport, foundReport);

        if (matchResult.score >= 30) {
          potentialMatches.push({
            ...foundReport,
            matchScore: matchResult.score,
            matchLevel: matchResult.matchLevel,
            matchDetails: matchResult.matchDetails,
          });
        }
      });

      return potentialMatches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error("[MatchingService] Error finding matches:", error);
      throw error;
    }
  }

  async saveMatchAlert(userId, matchData) {
    try {
      const matchesRef = collection(this.db, "matches");

      const matchDoc = await addDoc(matchesRef, {
        userId,
        lostReportId: matchData.lostReportId,
        foundReportId: matchData.foundReportId,
        matchScore: matchData.matchScore,
        matchLevel: matchData.matchLevel,
        matchDetails: matchData.matchDetails,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(
        "[MatchingService] Match alert saved successfully:",
        matchDoc.id
      );
      return matchDoc.id;
    } catch (error) {
      console.error("[MatchingService] Error saving match alert:", error);
      throw error; // This will now work once rules are updated
    }
  }

  async getUserMatchAlerts(userId) {
    try {
      const matchesRef = collection(this.db, "matches");
      const q = query(matchesRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const matches = [];
      for (const docSnap of snapshot.docs) {
        const matchData = { id: docSnap.id, ...docSnap.data() };
        const foundDoc = await getDoc(
          doc(this.db, "reports", matchData.foundReportId)
        );
        if (foundDoc.exists())
          matchData.foundReport = { id: foundDoc.id, ...foundDoc.data() };
        const lostDoc = await getDoc(
          doc(this.db, "reports", matchData.lostReportId)
        );
        if (lostDoc.exists())
          matchData.lostReport = { id: lostDoc.id, ...lostDoc.data() };
        matches.push(matchData);
      }
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error("[MatchingService] Error getting match alerts:", error);
      throw error;
    }
  }

  async updateMatchStatus(matchId, status) {
    try {
      const matchRef = doc(this.db, "matches", matchId);
      await updateDoc(matchRef, { status, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error("[MatchingService] Error updating match status:", error);
      throw error;
    }
  }

  async dismissMatch(matchId) {
    return this.updateMatchStatus(matchId, "dismissed");
  }
}

export default new MatchingService();
