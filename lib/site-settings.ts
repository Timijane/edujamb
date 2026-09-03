import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export type SiteSettings = {
  logo?: string;
  logoMediaId?: string;
  favicon?: string;
  faviconMediaId?: string;
};

export const defaultSiteSettings: SiteSettings = {
  logo: "",
  logoMediaId: "",
  favicon: "",
  faviconMediaId: "",
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
