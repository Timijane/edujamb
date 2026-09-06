export type ProfileDesignConfig = {
  version: number;
  designId: string;
  name: string;
  status: "draft" | "published";

  layout: {
    hero: "banner" | "split" | "centered" | "minimal";
    content: "single" | "two-column";
    mobile: "stacked" | "compact";
  };

  hero: {
    visible: boolean;
    title: string;
    subtitle: string;
    eyebrow: string;

    backgroundType:
      | "gradient"
      | "image"
      | "mixed"
      | "solid";

    backgroundColor: string;
    secondaryColor: string;
    accentColor: string;

    backgroundImage: string;
    backgroundImageMediaId: string;
    backgroundPosition: string;

    overlayOpacity: number;
    decorations: boolean;
    pattern: boolean;
    showProgress: boolean;
  };

  colors: {
    pageBackground: string;
    primary: string;
    primaryHover: string;
    text: string;
    mutedText: string;
    cardBackground: string;
  };

  cards: {
    opacity: number;
    blur: number;
    radius: number;
    borderColor: string;
    borderWidth: number;
    shadow: string;
  };

  typography: {
    headingWeight: number;
    bodyWeight: number;
    headingScale: number;
    bodyScale: number;
  };

  sections: {
    identity: boolean;
    personalInformation: boolean;
    education: boolean;
    jambPreparation: boolean;
    completionChecklist: boolean;
  };

  assets: {
    logo: string;
    logoMediaId: string;

    heroImage: string;
    heroImageMediaId: string;

    backgroundImage: string;
    backgroundImageMediaId: string;
  };

  updatedAt?: unknown;
  publishedAt?: unknown;
};

export const defaultProfileDesign: ProfileDesignConfig = {
  version: 1,
  designId: "edujamb-default",
  name: "EduJAMB Default",
  status: "published",

  layout: {
    hero: "banner",
    content: "two-column",
    mobile: "stacked",
  },

  hero: {
    visible: true,
    title: "Build your EduJAMB profile",
    subtitle:
      "Set up your learning identity and unlock your personalized JAMB preparation experience.",
    eyebrow: "Student onboarding",

    backgroundType: "mixed",

    backgroundColor: "#6d28d9",
    secondaryColor: "#312e81",
    accentColor: "#c084fc",

    backgroundImage: "",
    backgroundImageMediaId: "",
    backgroundPosition: "center",

    overlayOpacity: 0.28,
    decorations: true,
    pattern: true,
    showProgress: true,
  },

  colors: {
    pageBackground: "#f7f5ff",
    primary: "#7c3aed",
    primaryHover: "#6d28d9",
    text: "#0f172a",
    mutedText: "#64748b",
    cardBackground: "#ffffff",
  },

  cards: {
    opacity: 0.96,
    blur: 14,
    radius: 28,
    borderColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    shadow: "0 20px 60px rgba(76,29,149,0.10)",
  },

  typography: {
    headingWeight: 900,
    bodyWeight: 500,
    headingScale: 1,
    bodyScale: 1,
  },

  sections: {
    identity: true,
    personalInformation: true,
    education: true,
    jambPreparation: true,
    completionChecklist: true,
  },

  assets: {
    logo: "",
    logoMediaId: "",
    heroImage: "",
    heroImageMediaId: "",
    backgroundImage: "",
    backgroundImageMediaId: "",
  },
};
