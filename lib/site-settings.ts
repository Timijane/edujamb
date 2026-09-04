import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export type SiteSettings = {
  logo?: string;
  logoMediaId?: string;
  favicon?: string;
  faviconMediaId?: string;
  loginBackgroundType?: "gradient" | "color" | "image";
  loginBackgroundColor?: string;
  loginBackgroundImage?: string;
  loginBackgroundImageMediaId?: string;
  loginOverlayOpacity?: number;
  loginEyebrow?: string;
  loginTitle?: string;
  loginSubtitle?: string;
};

export const defaultSiteSettings: SiteSettings = {
  logo: "",
  logoMediaId: "",
  favicon: "",
  faviconMediaId: "",
  loginBackgroundType: "gradient",
  loginBackgroundColor: "#f8fafc",
  loginBackgroundImage: "",
  loginBackgroundImageMediaId: "",
  loginOverlayOpacity: 0.18,
  loginEyebrow: "EDUJAMB • JAMB PREPARATION PLATFORM",
  loginTitle: "Welcome back",
  loginSubtitle: "Continue your preparation journey with EduJAMB.",
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
