import { getAuth } from "firebase/auth";
import {
  doc,
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseApp } from "../firebase";

class PetService {
  constructor() {
    this.auth = getAuth(firebaseApp);
    this.db = getFirestore(firebaseApp);
    this.MAX_PETS_PER_OWNER = 50; // Configurable pet limit per owner
  }

  get user() {
    return this.auth.currentUser;
  }

  // ============================================================
  // VALIDATION METHODS
  // ============================================================

  /**
   * Validate species value
   */
  validateSpecies(species) {
    const validSpecies = ["Dog", "Cat"];
    if (!validSpecies.includes(species)) {
      throw new Error("Invalid species. Must be Dog or Cat.");
    }
  }

  /**
   * Validate sex value
   */
  validateSex(sex) {
    const validSex = ["Male", "Female"];
    if (!validSex.includes(sex)) {
      throw new Error("Invalid sex. Must be Male or Female.");
    }
  }

  /**
   * Sanitize and validate pet data
   */
  sanitizePetData(petData) {
    const sanitized = { ...petData };

    const stringFields = [
      "name",
      "species",
      "breed",
      "sex",
      "color",
      "distinguishingMarks",
      "ownerName",
      "ownerPhone",
      "ownerEmail",
      "ownerAddress",
      "allergies",
      "medicalNotes",
    ];

    stringFields.forEach((field) => {
      if (sanitized[field] && typeof sanitized[field] === "string") {
        sanitized[field] = sanitized[field].trim();
      }
    });

    // Validate required fields
    if (!sanitized.name || sanitized.name.length < 2) {
      throw new Error("Pet name must be at least 2 characters");
    }

    if (sanitized.name.length > 50) {
      throw new Error("Pet name must not exceed 50 characters");
    }

    // Validate name contains at least one letter
    if (!/[a-zA-Z]/.test(sanitized.name)) {
      throw new Error("Pet name must contain at least one letter");
    }

    // Validate species and sex
    if (sanitized.species) {
      this.validateSpecies(sanitized.species);
    }

    if (sanitized.sex) {
      this.validateSex(sanitized.sex);
    }

    return sanitized;
  }

  /**
   * Check if pet count limit is reached
   */
  async checkPetLimit() {
    if (!this.user) throw new Error("Not authenticated");

    const ref = collection(this.db, "users", this.user.uid, "pets");
    const snapshot = await getDocs(ref);

    if (snapshot.size >= this.MAX_PETS_PER_OWNER) {
      throw new Error(`Maximum pet limit (${this.MAX_PETS_PER_OWNER}) reached`);
    }
  }

  /**
   * Check for duplicate pet registration
   * Based on: name + dateOfBirth + ownerId
   */
  async checkDuplicatePet(petName, dateOfBirth, excludePetId = null) {
    if (!this.user) return false;

    const ref = collection(this.db, "users", this.user.uid, "pets");
    const snapshot = await getDocs(ref);

    const pets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // DEBUG LOGGING
    console.log("=== DUPLICATE CHECK START ===");
    console.log("Checking for pet:", {
      petName,
      dateOfBirth,
      excludePetId,
    });
    console.log("Existing pets count:", pets.length);

    // Check for duplicate, excluding a specific pet (for edit mode)
    const duplicate = pets.find((pet) => {
      // Skip the excluded pet (when editing)
      if (excludePetId && pet.id === excludePetId) {
        console.log("Skipping excluded pet:", pet.id);
        return false;
      }

      // Compare names (case-insensitive)
      const nameMatches =
        pet.name?.toLowerCase().trim() === petName?.toLowerCase().trim();

      if (!nameMatches) return false;

      console.log("Name matches for pet:", pet.name);
      console.log("Existing pet DOB:", pet.dateOfBirth);
      console.log("New pet DOB:", dateOfBirth);

      // If no date of birth for existing pet, can't be duplicate
      if (!pet.dateOfBirth) {
        console.log("Existing pet has no DOB");
        return false;
      }

      // If no date of birth provided for new pet, can't be duplicate
      if (!dateOfBirth) {
        console.log("New pet has no DOB");
        return false;
      }

      let petDob, checkDob;

      // Handle different date formats for existing pet
      if (pet.dateOfBirth.seconds) {
        petDob = new Date(pet.dateOfBirth.seconds * 1000);
        console.log("Existing pet DOB (from seconds):", petDob);
      } else if (pet.dateOfBirth.year) {
        petDob = new Date(
          pet.dateOfBirth.year,
          pet.dateOfBirth.month - 1,
          pet.dateOfBirth.day
        );
        console.log("Existing pet DOB (from year/month/day):", petDob);
      }

      // Handle different date formats for new pet
      if (dateOfBirth.year) {
        checkDob = new Date(
          dateOfBirth.year,
          dateOfBirth.month - 1,
          dateOfBirth.day
        );
        console.log("New pet DOB (from year/month/day):", checkDob);
      } else if (dateOfBirth instanceof Date) {
        checkDob = dateOfBirth;
        console.log("New pet DOB (Date object):", checkDob);
      }

      // If we can't parse either date, can't be duplicate
      if (!petDob || !checkDob) {
        console.log("Couldn't parse dates");
        return false;
      }

      console.log("Comparing dates:");
      console.log("Pet DOB:", petDob.toISOString());
      console.log("Check DOB:", checkDob.toISOString());
      console.log(
        "Year match:",
        petDob.getFullYear() === checkDob.getFullYear()
      );
      console.log("Month match:", petDob.getMonth() === checkDob.getMonth());
      console.log("Day match:", petDob.getDate() === checkDob.getDate());

      // Compare dates (year, month, day only)
      const isDuplicate =
        petDob.getFullYear() === checkDob.getFullYear() &&
        petDob.getMonth() === checkDob.getMonth() &&
        petDob.getDate() === checkDob.getDate();

      console.log("Is duplicate?", isDuplicate);

      return isDuplicate;
    });

    console.log("=== DUPLICATE CHECK END ===");
    console.log("Found duplicate?", !!duplicate);

    return !!duplicate;
  }

  /**
   * Verify user owns the pet (for updates/deletes)
   */
  async verifyPetOwnership(petId) {
    if (!this.user) throw new Error("Not authenticated");

    const ref = doc(this.db, "users", this.user.uid, "pets", petId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      throw new Error("Pet not found or you don't have permission");
    }

    const petData = snapshot.data();

    if (petData.ownerId !== this.user.uid) {
      throw new Error("Unauthorized: You can only modify your own pets");
    }

    return true;
  }

  // ============================================================
  // CRUD OPERATIONS (WITH VALIDATION)
  // ============================================================

  /**
   * Add a new pet with full validation
   */
  async addPet(petData) {
    if (!this.user) throw new Error("Not authenticated");

    // Check pet limit
    await this.checkPetLimit();

    // Sanitize and validate data
    const sanitizedData = this.sanitizePetData(petData);

    // Check for duplicates (only for current user)
    const isDuplicate = await this.checkDuplicatePet(
      sanitizedData.name,
      sanitizedData.dateOfBirth
    );

    console.log("Saving pet with DOB:", sanitizedData.dateOfBirth);

    if (isDuplicate) {
      throw new Error(
        "A pet with this name and date of birth already exists in your profile"
      );
    }

    const ref = collection(this.db, "users", this.user.uid, "pets");

    const docRef = await addDoc(ref, {
      ...sanitizedData,
      ownerId: this.user.uid, // Always use current user's ID
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  /**
   * Update pet with authorization and validation
   */
  async updatePet(petId, data) {
    if (!this.user) throw new Error("Not authenticated");

    // Verify ownership
    await this.verifyPetOwnership(petId);

    // Sanitize data if it contains pet information
    let updateData = { ...data };

    // Only sanitize if updating core pet fields
    if (data.name || data.species || data.sex) {
      updateData = this.sanitizePetData(data);
    } else {
      // Still trim string fields even for partial updates
      const stringFields = [
        "breed",
        "color",
        "distinguishingMarks",
        "ownerName",
        "ownerPhone",
        "ownerEmail",
        "ownerAddress",
        "allergies",
        "medicalNotes",
      ];

      stringFields.forEach((field) => {
        if (updateData[field] && typeof updateData[field] === "string") {
          updateData[field] = updateData[field].trim();
        }
      });
    }

    const ref = doc(this.db, "users", this.user.uid, "pets", petId);

    await updateDoc(ref, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete pet with authorization check
   */
  async deletePet(petId) {
    if (!this.user) throw new Error("Not authenticated");

    // Verify ownership
    await this.verifyPetOwnership(petId);

    const ref = doc(this.db, "users", this.user.uid, "pets", petId);
    await deleteDoc(ref);
  }

  /**
   * Get pet by ID (with ownership check)
   */
  async getPetById(petId) {
    if (!this.user) throw new Error("Not authenticated");

    const ref = doc(this.db, "users", this.user.uid, "pets", petId);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      const petData = snapshot.data();

      // Verify ownership
      if (petData.ownerId !== this.user.uid) {
        throw new Error("Unauthorized: You can only view your own pets");
      }

      return {
        id: snapshot.id,
        ...petData,
      };
    }

    return null;
  }

  /**
   * Get all pets for current user
   */
  async getMyPets() {
    if (!this.user) return [];

    const ref = collection(this.db, "users", this.user.uid, "pets");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  // ============================================================
  // REPORT METHODS
  // ============================================================

  /**
   * Add a report for lost/found pets
   */
  async addReport(reportData) {
    if (!this.user) throw new Error("Not authenticated");

    // Get user profile to include current name
    const userDoc = await getDoc(doc(this.db, "users", this.user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    const reportsRef = collection(this.db, "reports");
    const docRef = await addDoc(reportsRef, {
      ...reportData,
      coordinates: reportData.coordinates || null,
      reporterId: this.user.uid,
      reporterName: reportData.reporterName || userData.fullName || "",
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // If it's a lost report for a registered pet, update the pet's status
    if (reportData.reportType === "lost" && reportData.petId) {
      // Verify ownership before updating pet status
      try {
        await this.verifyPetOwnership(reportData.petId);

        const petRef = doc(
          this.db,
          "users",
          this.user.uid,
          "pets",
          reportData.petId
        );
        await updateDoc(petRef, {
          status: "lost",
          lastReportId: docRef.id,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error updating pet status:", error);
        // Continue even if pet update fails
      }
    }

    return docRef.id;
  }

  /**
   * Get all reports (public reports)
   */
  async getAllReports() {
    const reportsRef = collection(this.db, "reports");
    const q = query(reportsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Get reports created by current user
   */
  async getMyReports() {
    if (!this.user) return [];

    const reportsRef = collection(this.db, "reports");
    const snapshot = await getDocs(reportsRef);

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((report) => report.reporterId === this.user.uid);
  }
}

export default new PetService();
