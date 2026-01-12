import { getAuth } from "firebase/auth"
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
} from "firebase/firestore"
import { firebaseApp } from "../firebase"


class PetService {
  constructor() {
    this.auth = getAuth(firebaseApp)
    this.db = getFirestore(firebaseApp)
  }


  get user() {
    return this.auth.currentUser
  }


  async addPet(petData) {
    if (!this.user) throw new Error("Not authenticated")


    const ref = collection(this.db, "users", this.user.uid, "pets")


    const docRef = await addDoc(ref, {
      ...petData,
      ownerId: this.user.uid,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })


    return docRef.id
  }


  async updatePet(petId, data) {
    if (!this.user) throw new Error("Not authenticated")


    const ref = doc(this.db, "users", this.user.uid, "pets", petId)


    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }


  async getPetById(petId) {
    if (!this.user) throw new Error("Not authenticated")


    const ref = doc(this.db, "users", this.user.uid, "pets", petId)
    const snapshot = await getDoc(ref)


    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
      }
    }


    return null
  }


  async getMyPets() {
    if (!this.user) return []


    const ref = collection(this.db, "users", this.user.uid, "pets")
    const q = query(ref, orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)


    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  }


  async deletePet(petId) {
    if (!this.user) throw new Error("Not authenticated")


    const ref = doc(this.db, "users", this.user.uid, "pets", petId)
    await deleteDoc(ref)
  }


  async addReport(reportData) {
    if (!this.user) throw new Error("Not authenticated")


    // Get user profile to include current name
    const userDoc = await getDoc(doc(this.db, "users", this.user.uid))
    const userData = userDoc.exists() ? userDoc.data() : {}


    const reportsRef = collection(this.db, "reports")
    const docRef = await addDoc(reportsRef, {
      ...reportData,
      // Ensure coordinates are properly structured
      coordinates: reportData.coordinates || null,
      reporterId: this.user.uid,
      reporterName: reportData.reporterName || userData.fullName || "",
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })


    // If it's a lost report for a registered pet, update the pet's status
    if (reportData.reportType === "lost" && reportData.petId) {
      const petRef = doc(this.db, "users", this.user.uid, "pets", reportData.petId)
      await updateDoc(petRef, {
        status: "lost",
        lastReportId: docRef.id,
        updatedAt: serverTimestamp(),
      })
    }


    return docRef.id
  }


  async getAllReports() {
    const reportsRef = collection(this.db, "reports")
    const q = query(reportsRef, orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)


    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  }


  async getMyReports() {
    if (!this.user) return []


    const reportsRef = collection(this.db, "reports")
    const snapshot = await getDocs(reportsRef)


    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((report) => report.reporterId === this.user.uid)
  }
}


export default new PetService()