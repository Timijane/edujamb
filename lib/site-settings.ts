import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export type SiteSettings = {
  logo?: string;
  logoMediaId?: string;
  favicon?: string;
  faviconMediaId?: string;

  // --------------------------------------------------
  // AUTHENTICATION EXPERIENCE
  // --------------------------------------------------

  loginBackgroundType?: "gradient" | "color" | "image";
  loginBackgroundColor?: string;
  loginBackgroundImage?: string;
  loginBackgroundImageMediaId?: string;
  loginOverlayOpacity?: number;
  loginBackgroundPosition?: string;

  // Shared authentication frame
  authCardWidth?: string;
  authCardOpacity?: number;
  authCardBlur?: number;
  authCardRadius?: number;
  authCardPosition?: "center" | "left" | "right";

  // Authentication branding
  authLogoVisible?: boolean;
  authLogoSize?: number;
  authLogoMobileSize?: number;
  authLogoPosition?: "left" | "center" | "right";

  // Login copy
  loginEyebrow?: string;
  loginTitle?: string;
  loginSubtitle?: string;

  // Register copy
  registerEyebrow?: string;
  registerTitle?: string;
  registerSubtitle?: string;
};

export const defaultSiteSettings: SiteSettings = {
  logo: "",
  logoMediaId: "",
  favicon: "",
  faviconMediaId: "",

  // Background
  loginBackgroundType: "gradient",
  loginBackgroundColor: "#f8fafc",
  loginBackgroundImage: "",
  loginBackgroundImageMediaId: "",
  loginOverlayOpacity: 0.18,
  loginBackgroundPosition: "center",

  // Authentication card
  authCardWidth: "1180px",
  authCardOpacity: 0.95,
  authCardBlur: 20,
  authCardRadius: 32,
  authCardPosition: "center",

  // Authentication branding
  authLogoVisible: true,
  authLogoSize: 200,
  authLogoMobileSize: 190,
  authLogoPosition: "left",

  // Login
  loginEyebrow: "EDUJAMB • JAMB PREPARATION PLATFORM",
  loginTitle: "Welcome back",
  loginSubtitle: "Continue your preparation journey with EduJAMB.",

  // Register
  registerEyebrow: "GET STARTED",
  registerTitle: "Create your account",
  registerSubtitle:
    "Join EduJAMB and start building a better JAMB preparation routine.",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snapshot = await getDoc(
      doc(db, "siteSettings", "site")
    );

    if (!snapshot.exists()) {
      return defaultSiteSettings;
    }

    return {
      ...defaultSiteSettings,
      ...(snapshot.data() as SiteSettings),
    };
  } catch (error) {
    console.error(
      "Failed to load site settings:",
      error
    );

    return defaultSiteSettings;
  }
}
