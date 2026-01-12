import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth"
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from "firebase/firestore"
import { firebaseApp } from "../firebase"

class AuthService {
  constructor() {
    this.auth = getAuth(firebaseApp)
    this.db = getFirestore(firebaseApp)
    this.currentUser = null

    // Listen to auth state changes
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user
    })
  }

  /**
   * Sign Up - Creates new user with complete schema
   */
  async signUp(email, password, extraData = {}, locationDetails = {}) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password)
      const user = userCredential.user

      // Send email verification
      await sendEmailVerification(user)

      const uid = user.uid

      // Complete user data schema
      const userData = {
        // Basic Information
        email,
        firstName: extraData.firstName || "",
        lastName: extraData.lastName || "",
        fullName: `${extraData.firstName || ""} ${extraData.lastName || ""}`.trim(),
        phone: extraData.phone || "",
        profileImage: null, // Cloudinary URL
        bio: "",
        isVerified: false, // Email verification status

        // Location Details
        location: {
          street: locationDetails.street || "",
          barangay: locationDetails.barangay || "",
          city: locationDetails.city || "",
          province: locationDetails.province || "",
          postalCode: locationDetails.postalCode || "",
          address: locationDetails.address || "",
          coordinates: locationDetails.coordinates || {
            latitude: 0,
            longitude: 0,
          },
        },

        // References to other collections
        registeredPets: [], // Array of pet IDs from 'pets' collection
        lostReports: [], // Array of report IDs from 'reports' collection
        foundReports: [], // Array of report IDs from 'reports' collection

        // In-app notifications (last 50, older ones archived)
        notifications: [],

        // Potential matches for user's lost pets
        matchAlerts: [], // Array of match IDs from 'matches' collection

        // User preferences
        settings: {
          notificationsEnabled: true,
          emailAlerts: true,
          pushAlerts: true,
          searchRadius: 10, // kilometers
          privacyMode: false,
        },

        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      }

      await setDoc(doc(this.db, "users", uid), userData)

      return { success: true, user }
    } catch (error) {
      console.error("[AuthService][signUp]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Sign In
   */
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password)
      const user = userCredential.user

      // Check email verification
      if (!user.emailVerified) {
        return {
          success: false,
          error: "Email not verified. Please verify your email before signing in.",
          needsVerification: true,
          user,
        }
      }

      // Update last login timestamp
      const userRef = doc(this.db, "users", user.uid)
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      })

      return { success: true, user }
    } catch (error) {
      console.error("[AuthService][signIn]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Forgot Password
   */
  async forgotPassword(email) {
    try {
      await sendPasswordResetEmail(this.auth, email)
      return { success: true, message: "Password reset email sent!" }
    } catch (error) {
      console.error("[AuthService][forgotPassword]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Sign Out
   */
  async signOut() {
    try {
      await signOut(this.auth)
      return { success: true }
    } catch (error) {
      console.error("[AuthService][signOut]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Get User Profile
   */
  async getUserProfile() {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      const userDoc = await getDoc(doc(this.db, "users", user.uid))

      if (!userDoc.exists()) {
        return { success: false, error: "User profile not found" }
      }

      return { success: true, data: userDoc.data() }
    } catch (error) {
      console.error("[AuthService][getUserProfile]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Update User Profile
   */
  async updateUserProfile(updates) {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      const userRef = doc(this.db, "users", user.uid)
      
      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      }

      // Check if name is being updated
      let newFullName = null
      if (updates.firstName || updates.lastName) {
        const currentData = await getDoc(userRef)
        const current = currentData.data()
        const firstName = updates.firstName || current.firstName
        const lastName = updates.lastName || current.lastName
        newFullName = `${firstName} ${lastName}`.trim()
        updateData.fullName = newFullName
      }

      await updateDoc(userRef, updateData)

      // If name was updated, also update all user's reports
      if (newFullName) {
        await this.updateReportsWithNewName(newFullName)
      }

      return { success: true }
    } catch (error) {
      console.error("[AuthService][updateUserProfile]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Update all user's reports with new name
   */
  async updateReportsWithNewName(newName) {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      // Get all reports by this user
      const reportsRef = collection(this.db, "reports")
      const q = query(reportsRef, where("reporterId", "==", user.uid))
      const snapshot = await getDocs(q)

      // Update each report
      const batch = writeBatch(this.db)
      snapshot.docs.forEach((doc) => {
        const reportRef = doc.ref
        batch.update(reportRef, { 
          reporterName: newName,
          updatedAt: serverTimestamp()
        })
      })

      await batch.commit()
      console.log(`[AuthService] Updated ${snapshot.docs.length} reports with new name: ${newName}`)
      return { success: true, updatedCount: snapshot.docs.length }
    } catch (error) {
      console.error("[AuthService][updateReportsWithNewName]", error)
      return { success: false, error: "Failed to update reports" }
    }
  }

  /**
   * Update User Settings
   */
  async updateUserSettings(settings) {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      const userRef = doc(this.db, "users", user.uid)
      await updateDoc(userRef, {
        settings: settings,
        updatedAt: serverTimestamp(),
      })

      return { success: true }
    } catch (error) {
      console.error("[AuthService][updateUserSettings]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Add Notification
   */
  async addNotification(notification) {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      const userRef = doc(this.db, "users", user.uid)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()

      // Keep only last 50 notifications
      const notifications = userData.notifications || []
      const newNotification = {
        id: `notif_${Date.now()}`,
        type: notification.type || "system",
        title: notification.title || "",
        message: notification.message || "",
        read: false,
        timestamp: new Date(),
        actionUrl: notification.actionUrl || null,
      }

      notifications.unshift(newNotification)
      const updatedNotifications = notifications.slice(0, 50)

      await updateDoc(userRef, {
        notifications: updatedNotifications,
        updatedAt: serverTimestamp(),
      })

      return { success: true, notification: newNotification }
    } catch (error) {
      console.error("[AuthService][addNotification]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Mark Notification as Read
   */
  async markNotificationRead(notificationId) {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      const userRef = doc(this.db, "users", user.uid)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()

      const notifications = userData.notifications || []
      const updatedNotifications = notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )

      await updateDoc(userRef, {
        notifications: updatedNotifications,
        updatedAt: serverTimestamp(),
      })

      return { success: true }
    } catch (error) {
      console.error("[AuthService][markNotificationRead]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Clear All Notifications
   */
  async clearAllNotifications() {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      const userRef = doc(this.db, "users", user.uid)
      await updateDoc(userRef, {
        notifications: [],
        updatedAt: serverTimestamp(),
      })

      return { success: true }
    } catch (error) {
      console.error("[AuthService][clearAllNotifications]", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  /**
   * Get Current User
   */
  getCurrentUser() {
    return this.auth.currentUser
  }

  /**
   * Get User ID
   */
  getUserId() {
    return this.auth.currentUser?.uid || null
  }

  /**
   * Check if User is Logged In
   */
  isLoggedIn() {
    return !!this.auth.currentUser
  }

  /**
   * Helper: Get user-friendly error messages
   */
  getErrorMessage(error) {
    const errorMessages = {
      "auth/email-already-in-use": "This email is already registered.",
      "auth/invalid-email": "Invalid email address.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/invalid-credential": "Invalid email or password.",
    }

    return errorMessages[error.code] || error.message || "An error occurred"
  }
}

const authService = new AuthService()
export default authService