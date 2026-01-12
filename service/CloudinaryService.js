import * as FileSystem from "expo-file-system";

const CLOUD_NAME = "dwa7agaju";
const UPLOAD_PRESET = "pawfind";

class CloudinaryService {
  // Add a new method specifically for PDF uploads
  async uploadPdfToCloudinary(dataUrl) {
    try {
      console.log("[CloudinaryService] Uploading PDF...");

      // Extract base64 data from data URL
      const base64Data = dataUrl.split(",")[1];

      const formData = new FormData();

      // Use 'raw' resource type for PDFs
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("file", `data:application/pdf;base64,${base64Data}`);
      formData.append("folder", "pawfind");
      formData.append("resource_type", "raw");
      formData.append("type", "upload");
      formData.append("access_mode", "public"); // Make it publicly accessible

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
        {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.secure_url) {
        console.error("Cloudinary upload error:", data);
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      console.log(
        "[CloudinaryService] PDF upload successful:",
        data.secure_url
      );
      return data.secure_url;
    } catch (error) {
      console.error("[CloudinaryService][uploadPdfToCloudinary] Error:", error);
      throw error;
    }
  }

  // Update the existing uploadFile method for backward compatibility
  async uploadFile(fileUri, fileType = "image") {
    try {
      console.log("[CloudinaryService] Starting upload", { fileUri, fileType });

      const formData = new FormData();

      let resourceType = "image";
      let endpointType = "image";

      if (fileType === "video") {
        resourceType = "video";
        endpointType = "video";
      } else if (fileType === "pdf") {
        resourceType = "raw";
        endpointType = "raw";
      }

      // Direct file upload works for all types including PDF/raw
      formData.append("file", {
        uri: fileUri,
        type:
          fileType === "pdf"
            ? "application/pdf"
            : fileType === "video"
            ? "video/mp4"
            : "image/jpeg",
        name:
          fileType === "pdf"
            ? "upload.pdf"
            : fileType === "video"
            ? "upload.mp4"
            : "upload.jpg",
      });

      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "pawfind");
      formData.append("resource_type", resourceType);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpointType}/upload`,
        {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.secure_url) {
        console.error("Cloudinary upload error:", data);
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      console.log("[CloudinaryService] Upload successful:", data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error("[CloudinaryService][uploadFile] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Remove getDownloadableUrl since we don't need complex URL manipulation
  getOptimizedUrl(url, width = 400, height = 400) {
    if (!url || !url.includes("cloudinary.com")) return url;

    const parts = url.split("/upload/");
    if (parts.length !== 2) return url;

    return `${parts[0]}/upload/w_${width},h_${height},c_fill,q_auto,f_auto/${parts[1]}`;
  }

  async deleteFile(publicId) {
    try {
      console.log("[CloudinaryService][deleteFile]", publicId);
      return { success: true };
    } catch (error) {
      console.error("[CloudinaryService][deleteFile]", error);
      return { success: false, error: error.message };
    }
  }
}

export default new CloudinaryService();
