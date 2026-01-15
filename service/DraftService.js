import AsyncStorage from "@react-native-async-storage/async-storage";

const PET_DRAFT_KEY = "pet_registration_draft";
const REPORT_DRAFT_KEY = "report_draft";

class DraftService {
  // ============================================
  // PET DRAFT METHODS
  // ============================================
  async savePetDraft(draftData) {
    try {
      await AsyncStorage.setItem(
        PET_DRAFT_KEY,
        JSON.stringify({
          ...draftData,
          savedAt: new Date().toISOString(),
        })
      );
      return true;
    } catch (error) {
      console.error("Error saving pet draft:", error);
      return false;
    }
  }

  async getPetDraft() {
    try {
      const draft = await AsyncStorage.getItem(PET_DRAFT_KEY);
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      console.error("Error loading pet draft:", error);
      return null;
    }
  }

  async clearPetDraft() {
    try {
      await AsyncStorage.removeItem(PET_DRAFT_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing pet draft:", error);
      return false;
    }
  }

  async hasPetDraft() {
    const draft = await this.getPetDraft();
    return !!draft;
  }

  // ============================================
  // REPORT DRAFT METHODS
  // ============================================
  async saveReportDraft(draftData) {
    try {
      await AsyncStorage.setItem(
        REPORT_DRAFT_KEY,
        JSON.stringify({
          ...draftData,
          savedAt: new Date().toISOString(),
        })
      );
      return true;
    } catch (error) {
      console.error("Error saving report draft:", error);
      return false;
    }
  }

  async getReportDraft() {
    try {
      const draft = await AsyncStorage.getItem(REPORT_DRAFT_KEY);
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      console.error("Error loading report draft:", error);
      return null;
    }
  }

  async clearReportDraft() {
    try {
      await AsyncStorage.removeItem(REPORT_DRAFT_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing report draft:", error);
      return false;
    }
  }

  async hasReportDraft() {
    const draft = await this.getReportDraft();
    return !!draft;
  }

  // ============================================
  // BACKWARD COMPATIBILITY METHODS
  // ============================================
  // These methods are for backward compatibility with existing code
  async saveDraft(draftData) {
    return this.savePetDraft(draftData);
  }

  async getDraft() {
    return this.getPetDraft();
  }

  async clearDraft() {
    return this.clearPetDraft();
  }

  async hasDraft() {
    return this.hasPetDraft();
  }

  // ============================================
  // CLEAR ALL DRAFTS
  // ============================================
  async clearAllDrafts() {
    try {
      await AsyncStorage.multiRemove([PET_DRAFT_KEY, REPORT_DRAFT_KEY]);
      return true;
    } catch (error) {
      console.error("Error clearing all drafts:", error);
      return false;
    }
  }
}

export default new DraftService();