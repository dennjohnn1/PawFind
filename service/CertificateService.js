import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";
import { Asset } from "expo-asset";
import QRCode from "qrcode-generator";
import CloudinaryService from "./CloudinaryService";
import * as FileSystem from "expo-file-system/legacy";

class CertificateService {
  generateCertificateNumber(petId) {
    const timestamp = Date.now().toString().slice(-6);
    return `PAW-${new Date().getFullYear()}-${timestamp}`;
  }

  async getAppLogoBase64() {
    try {
      const asset = Asset.fromModule(require("../assets/images/app_symbol.png"));
      await asset.downloadAsync(); // ensure it's loaded
      
      // Fix: Use the correct encoding constant
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: "base64", // Changed from FileSystem.EncodingType.Base64
      });
      
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error("Error loading app logo:", error);
      // Return a fallback empty data URI if logo fails to load
      return "data:image/png;base64,";
    }
  }

  async generateQRCodeBase64(data) {
    try {
      // typeNumber: 0 = auto size, errorCorrectionLevel: 'H'
      const qr = QRCode(0, "H");
      qr.addData(data);
      qr.make();

      // Create SVG
      const svgTag = qr.createSvgTag({ cellSize: 8, margin: 2 });

      // Encode as base64 using btoa (browser-friendly)
      const base64 =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgTag)));

      return base64;
    } catch (err) {
      console.error("Error generating QR code:", err);
      throw err;
    }
  }

  async generateCertificatePDF(pet, certificateNumber) {
    const appLogoBase64 = await this.getAppLogoBase64();

    // Unique verification URL
    const verificationUrl = `https://your-backend.com/verify?cert=${certificateNumber}`;
    const qrBase64 = await this.generateQRCodeBase64(verificationUrl);

    const formatDate = (dob) => {
      if (!dob) return "N/A";
      if (dob.year && dob.month && dob.day) {
        return new Date(dob.year, dob.month - 1, dob.day).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "short", day: "numeric" }
        );
      }
      if (dob.seconds) {
        return new Date(dob.seconds * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      if (dob instanceof Date) {
        return dob.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      return "N/A";
    };

    // Calculate validity date (1 year from now)
    const validityDate = new Date();
    validityDate.setFullYear(validityDate.getFullYear() + 1);

    const html = `
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500&display=swap');
          
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          body { 
            font-family: 'Open Sans', sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
          }
          
          .certificate-container { 
            width: 1423px; 
            height: 994px; 
            background: white; 
            border-radius: 10px; 
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2); 
            position: relative; 
            overflow: hidden; 
            padding: 40px; 
            border: 15px solid transparent;
            background-clip: padding-box;
            background-image: 
              radial-gradient(circle at 0% 0%, rgba(245, 149, 73, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 100% 0%, rgba(245, 149, 73, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 0% 100%, rgba(245, 149, 73, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 100% 100%, rgba(245, 149, 73, 0.1) 0%, transparent 50%);
          }
          
          .border-decoration {
            position: absolute;
            border: 2px solid #F59549;
          }
          
          .border-top {
            top: 0;
            left: 50px;
            right: 50px;
            height: 0;
          }
          
          .border-bottom {
            bottom: 0;
            left: 50px;
            right: 50px;
            height: 0;
          }
          
          .border-left {
            left: 0;
            top: 50px;
            bottom: 50px;
            width: 0;
          }
          
          .border-right {
            right: 0;
            top: 50px;
            bottom: 50px;
            width: 0;
          }
          
          .corner-decoration {
            position: absolute;
            width: 30px;
            height: 30px;
            border: 2px solid #F59549;
          }
          
          .corner-top-left { 
            top: 15px; 
            left: 15px; 
            border-top: 2px solid #F59549; 
            border-left: 2px solid #F59549; 
            border-top-left-radius: 8px;
          }
          
          .corner-top-right { 
            top: 15px; 
            right: 15px; 
            border-top: 2px solid #F59549; 
            border-right: 2px solid #F59549; 
            border-top-right-radius: 8px;
          }
          
          .corner-bottom-left { 
            bottom: 15px; 
            left: 15px; 
            border-bottom: 2px solid #F59549; 
            border-left: 2px solid #F59549; 
            border-bottom-left-radius: 8px;
          }
          
          .corner-bottom-right { 
            bottom: 15px; 
            right: 15px; 
            border-bottom: 2px solid #F59549; 
            border-right: 2px solid #F59549; 
            border-bottom-right-radius: 8px;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            position: relative;
            padding-bottom: 15px;
          }
          
          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 25%;
            right: 25%;
            height: 3px;
            background: linear-gradient(90deg, transparent, #F59549, transparent);
          }
          
          .logo-title-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 10px;
          }
          
          .logo-icon { 
            width: 60px; 
            height: 60px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            overflow: hidden; 
          }
          
          .logo-icon img { 
            width: 100%; 
            height: 100%; 
            object-fit: contain; 
          }
          
          .title-text {
            text-align: left;
          }
          
          .certificate-title { 
            font-family: 'Montserrat', sans-serif; 
            font-size: 36px; 
            font-weight: 700; 
            color: #2c3e50; 
            letter-spacing: 2px;
            margin: 0;
          }
          
          .certificate-subtitle { 
            font-size: 14px; 
            color: #7f8c8d; 
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-top: 5px;
          }
          
          .certificate-number { 
            background: linear-gradient(135deg, #F59549 0%, #FFB347 100%); 
            color: white; 
            padding: 15px 30px; 
            border-radius: 8px; 
            text-align: center; 
            margin: 0 auto 40px; 
            width: 80%; 
            max-width: 500px;
            box-shadow: 0 5px 15px rgba(245, 149, 73, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          
          .certificate-number .label { 
            font-size: 14px; 
            opacity: 0.9; 
            letter-spacing: 2px; 
            margin-bottom: 5px; 
            text-transform: uppercase;
          }
          
          .certificate-number .number { 
            font-family: 'Montserrat', sans-serif; 
            font-size: 24px; 
            font-weight: 700; 
            letter-spacing: 1px; 
          }
          
          .main-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          
          .pet-photo-section {
            text-align: center;
          }
          
          .pet-photo-container {
            margin-bottom: 20px;
          }
          
          .pet-photo { 
            width: 220px; 
            height: 220px; 
            object-fit: cover; 
            border-radius: 5px; 
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); 
            border: 8px solid white;
            outline: 2px solid #F59549;
          }
          
          .photo-label {
            font-size: 14px;
            color: #7f8c8d;
            font-style: italic;
            margin-top: 10px;
          }
          
          .info-section { 
            margin-bottom: 25px;
          }
          
          .section-title { 
            font-family: 'Montserrat', sans-serif; 
            font-size: 18px; 
            font-weight: 600; 
            color: #2c3e50; 
            padding-bottom: 10px;
            margin-bottom: 15px;
            border-bottom: 2px solid #F59549;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .section-title::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #F59549;
            border-radius: 50%;
          }
          
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
          }
          
          .info-item { 
            padding: 8px 0;
            border-bottom: 1px dotted #e0e0e0;
          }
          
          .info-label { 
            font-size: 12px; 
            color: #7f8c8d; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            margin-bottom: 4px;
          }
          
          .info-value { 
            font-size: 16px; 
            color: #2c3e50; 
            font-weight: 500; 
            word-break: break-word; 
          }
          
          .info-value strong { 
            color: #F59549; 
            font-weight: 600; 
          }
          
          .full-width {
            grid-column: span 2;
          }
          
          .registration-section {
            margin-top: 20px;
          }
          
          .qr-section { 
            background: #f8f9fa; 
            border-radius: 10px; 
            padding: 25px; 
            border: 2px solid #e9ecef;
            margin-top: 20px;
            display: flex;
            align-items: center;
            gap: 25px;
          }
          
          .qr-image-container { 
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .qr-image-container img { 
            width: 160px; 
            height: 160px; 
            padding: 10px;
            background: white;
            border-radius: 5px;
            border: 1px solid #ddd;
          }
          
          .qr-text-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .qr-title { 
            color: #F59549; 
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 10px;
            font-family: 'Montserrat', sans-serif;
          }
          
          .qr-description { 
            font-size: 13px; 
            color: #7f8c8d; 
            line-height: 1.5;
          }
          
          .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #e9ecef; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end;
            font-size: 12px;
            color: #7f8c8d;
          }
          
          .validity-info {
            flex: 1;
          }
          
          .validity-date { 
            color: #27ae60; 
            font-weight: 600; 
            font-size: 14px;
          }
          
          .signature-section {
            flex: 1;
            text-align: center;
          }
          
          .signature-line {
            width: 200px;
            height: 1px;
            background: #2c3e50;
            margin: 15px auto 5px;
          }
          
          .signature-text {
            font-size: 12px;
            color: #2c3e50;
          }
          
          .contact-info { 
            flex: 1;
            text-align: right; 
          }
          
          .contact-info strong { 
            color: #F59549; 
            font-weight: 600;
          }
          
          .watermark { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%) rotate(-45deg); 
            font-size: 180px; 
            font-weight: 900; 
            color: rgba(245, 149, 73, 0.03); 
            font-family: 'Montserrat', sans-serif; 
            pointer-events: none; 
            z-index: 0; 
            white-space: nowrap; 
            letter-spacing: 20px;
            text-transform: uppercase;
          }
          
          .seal {
            position: absolute;
            bottom: 40px;
            right: 40px;
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #F59549, #FFB347);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            border: 3px solid white;
          }
          
          @media print { 
            body { 
              background: white !important; 
              padding: 0 !important; 
            } 
            
            .certificate-container { 
              box-shadow: none !important; 
              border-radius: 0 !important; 
              border: 1px solid #ccc !important;
            } 
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <!-- Border decorations -->
          <div class="border-decoration border-top"></div>
          <div class="border-decoration border-bottom"></div>
          <div class="border-decoration border-left"></div>
          <div class="border-decoration border-right"></div>
          
          <!-- Corner decorations -->
          <div class="corner-decoration corner-top-left"></div>
          <div class="corner-decoration corner-top-right"></div>
          <div class="corner-decoration corner-bottom-left"></div>
          <div class="corner-decoration corner-bottom-right"></div>
          
          <!-- Watermark -->
          <div class="watermark">PAWFIND</div>
          
          <!-- Official seal -->
          <div class="seal">✓</div>

          <!-- Header -->
          <div class="header">
            <div class="logo-title-container">
              ${appLogoBase64 ? `<div class="logo-icon">
                <img src="${appLogoBase64}" alt="App Logo" />
              </div>` : ''}
              <div class="title-text">
                <h1 class="certificate-title">PET REGISTRATION CERTIFICATE</h1>
                <div class="certificate-subtitle">Official Registration Document</div>
              </div>
            </div>
          </div>

          <!-- Certificate Number -->
          <div class="certificate-number">
            <div class="label">Certificate Number</div>
            <div class="number">${certificateNumber}</div>
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <!-- Left Column: Pet Photo and Pet Information -->
            <div class="left-column">
              <div class="pet-photo-section">
                <div class="pet-photo-container">
                  ${
                    pet.photoUrl
                      ? `<img src="${pet.photoUrl}" alt="Pet Photo" class="pet-photo" />`
                      : `<div style="width: 220px; height: 220px; background: #f8f9fa; border-radius: 5px; display: flex; align-items: center; justify-content: center; border: 8px solid white; outline: 2px solid #F59549;">
                          <div style="color: #7f8c8d; font-size: 14px;">No Photo Available</div>
                        </div>`
                  }
                </div>
                <div class="photo-label">Registered Pet Photograph</div>
              </div>

              <div class="info-section">
                <div class="section-title">
                  <span>Pet Information</span>
                </div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Pet Name</div>
                    <div class="info-value"><strong>${pet.name}</strong></div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Species</div>
                    <div class="info-value">${pet.species}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Breed</div>
                    <div class="info-value">${pet.breed || "Not specified"}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Sex</div>
                    <div class="info-value">${pet.sex || "Unknown"}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Date of Birth</div>
                    <div class="info-value">${formatDate(pet.dateOfBirth)}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Color</div>
                    <div class="info-value">${pet.color || "Not specified"}</div>
                  </div>
                  ${
                    pet.distinguishingMarks
                      ? `<div class="info-item full-width">
                          <div class="info-label">Distinguishing Marks</div>
                          <div class="info-value">${pet.distinguishingMarks}</div>
                        </div>`
                      : ""
                  }
                </div>
              </div>
            </div>

            <!-- Right Column: Owner Information and Registration -->
            <div class="right-column">
              <div class="info-section">
                <div class="section-title">
                  <span>Owner Information</span>
                </div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Owner Name</div>
                    <div class="info-value"><strong>${pet.ownerName || "Not provided"}</strong></div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Email Address</div>
                    <div class="info-value">${pet.ownerEmail || "Not provided"}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Phone Number</div>
                    <div class="info-value">${pet.ownerPhone || "Not provided"}</div>
                  </div>
                  ${
                    pet.ownerAddress
                      ? `<div class="info-item full-width">
                          <div class="info-label">Address</div>
                          <div class="info-value">${pet.ownerAddress}</div>
                        </div>`
                      : ""
                  }
                </div>
              </div>

              <div class="registration-section">
                <div class="info-section">
                  <div class="section-title">
                    <span>Registration Details</span>
                  </div>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Issued By</div>
                      <div class="info-value">PawFind Pet Registry</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Date Issued</div>
                      <div class="info-value">${new Date().toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Registration ID</div>
                      <div class="info-value">${certificateNumber}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Valid Until</div>
                      <div class="info-value" style="color: #27ae60; font-weight: 600;">
                        ${validityDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- QR Section with QR on left, text on right -->
                <div class="qr-section">
                  <div class="qr-image-container">
                    <img src="${qrBase64}" alt="QR Code" />
                  </div>
                  <div class="qr-text-container">
                    <div class="qr-title">SCAN TO VERIFY</div>
                    <div class="qr-description">
                      This certificate's authenticity can be verified by scanning the QR code with any smartphone camera or QR scanner app. Visit our official verification portal to confirm the registration details.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 1123,
      height: 794,
    });

    return uri;
  }

  async uploadCertificate(pdfUri) {
    try {
      const url = await CloudinaryService.uploadFile(pdfUri, "pdf");
      return url;
    } catch (error) {
      throw error;
    }
  }

  async generateAndDownloadCertificate(pet) {
    // Use existing certificate number if available, otherwise generate new one
    const certificateNumber = pet.certificate?.number || this.generateCertificateNumber(
      pet.id || `pet_${Date.now()}`
    );
    const pdfUri = await this.generateCertificatePDF(pet, certificateNumber);

    const safePetName = pet.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const fileName = `${safePetName}_certificate_${certificateNumber}.pdf`;
    const finalUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.copyAsync({ from: pdfUri, to: finalUri });
    await this.sharePDF(finalUri, pet.name);

    return { success: true, fileUri: finalUri, certificateNumber };
  }

  async sharePDF(fileUri, petName) {
    try {
      const shareOptions = {
        mimeType: "application/pdf",
        dialogTitle: `${petName}'s Certificate`,
        UTI: "com.adobe.pdf",
      };
      if (Platform.OS === "android") {
        try {
          const contentUri = await FileSystem.getContentUriAsync(fileUri);
          await IntentLauncher.startActivityAsync(
            "android.intent.action.VIEW",
            { data: contentUri, type: "application/pdf", flags: 1 }
          );
          return;
        } catch {
          // fallback to sharing API
        }
      }
      await Sharing.shareAsync(fileUri, shareOptions);
    } catch (error) {
      console.error("[CertificateService] Error sharing PDF:", error);
      throw error;
    }
  }
}

export default new CertificateService();