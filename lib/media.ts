import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export type MediaPurpose =
  | "logo"
  | "favicon"
  | "hero_1"
  | "hero_2"
  | "hero_3"
  | "about"
  | "learning"
  | "cbt"
  | "battle"
  | "aiCoach"
  | "analytics"
  | "community"
  | "mission"
  | "other";

export type MediaItem = {
  id: string;
  url: string;
  publicId: string;
  fileName: string;
  resourceType: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  purpose: MediaPurpose;
  location: string;
  homepageSlot?: number | null;
  createdAt?: Timestamp | null;
  uploadedBy?: string;
};

export const MEDIA_PURPOSES: {
  value: MediaPurpose;
  label: string;
  description: string;
}[] = [
  {
    value: "logo",
    label: "Logo",
    description: "Main JAMBMASTER website logo.",
  },
  {
    value: "favicon",
    label: "Favicon",
    description: "Small icon displayed in the browser tab.",
  },
  {
    value: "hero_1",
    label: "Hero Image 1",
    description: "First rotating homepage hero image.",
  },
  {
    value: "hero_2",
    label: "Hero Image 2",
    description: "Second rotating homepage hero image.",
  },
  {
    value: "hero_3",
    label: "Hero Image 3",
    description: "Third rotating homepage hero image.",
  },
  {
    value: "about",
    label: "About Section",
    description: "Homepage About JAMBMASTER image.",
  },
  {
    value: "learning",
    label: "Learning Section",
    description: "Homepage Learning section image.",
  },
  {
    value: "cbt",
    label: "CBT Section",
    description: "Homepage CBT Practice section image.",
  },
  {
    value: "battle",
    label: "Battle Arena",
    description: "Homepage Battle Arena section image.",
  },
  {
    value: "aiCoach",
    label: "AI JAMB Coach",
    description: "Homepage AI Coach section image.",
  },
  {
    value: "analytics",
    label: "Analytics Section",
    description: "Homepage Analytics section image.",
  },
  {
    value: "community",
    label: "Community Section",
    description: "Homepage Community section image.",
  },
  {
    value: "mission",
    label: "Mission Section",
    description: "Homepage Mission section image.",
  },
  {
    value: "other",
    label: "Other",
    description: "General website media.",
  },
];

export async function getMediaItems(): Promise<MediaItem[]> {
  const mediaQuery = query(
    collection(db, "media"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(mediaQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<MediaItem, "id">),
  }));
}

export async function saveMediaItem(
  item: Omit<MediaItem, "id" | "createdAt">
) {
  const mediaRef = await addDoc(collection(db, "media"), {
    ...item,
    createdAt: serverTimestamp(),
  });

  return mediaRef.id;
}

/**
 * Assign an uploaded media item to its intended website location.
 */
export async function assignMediaToHomepage(
  media: MediaItem
) {
  const homepageRef = doc(
    db,
    "siteSettings",
    "homepage"
  );

  /**
   * LOGO
   */
  if (media.purpose === "logo") {
    await setDoc(
      doc(db, "siteSettings", "site"),
      {
        logo: media.url,
        logoMediaId: media.id,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return;
  }

  /**
   * FAVICON
   */
  if (media.purpose === "favicon") {
    await setDoc(
      doc(db, "siteSettings", "site"),
      {
        favicon: media.url,
        faviconMediaId: media.id,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return;
  }

  /**
   * HERO IMAGES
   */
  if (
    media.purpose === "hero_1" ||
    media.purpose === "hero_2" ||
    media.purpose === "hero_3"
  ) {
    const slot =
      media.purpose === "hero_1"
        ? 0
        : media.purpose === "hero_2"
          ? 1
          : 2;

    const homepageSnapshot = await getDoc(
      homepageRef
    );

    const existingData = homepageSnapshot.exists()
      ? homepageSnapshot.data()
      : {};

    const existingHero =
      existingData.hero || {};

    const existingImages = Array.isArray(
      existingHero.images
    )
      ? [...existingHero.images]
      : [];

    const existingMediaIds = Array.isArray(
      existingHero.imageMediaIds
    )
      ? [...existingHero.imageMediaIds]
      : [];

    while (existingImages.length < 3) {
      existingImages.push("");
    }

    while (existingMediaIds.length < 3) {
      existingMediaIds.push(null);
    }

    existingImages[slot] = media.url;
    existingMediaIds[slot] = media.id;

    await setDoc(
      homepageRef,
      {
        hero: {
          ...existingHero,
          images: existingImages,
          imageMediaIds: existingMediaIds,
        },
      },
      { merge: true }
    );

    return;
  }

  /**
   * SINGLE IMAGE HOMEPAGE SECTIONS
   */
  const sectionMap: Record<
    string,
    string
  > = {
    about: "about",
    learning: "learning",
    cbt: "cbt",
    battle: "battle",
    aiCoach: "aiCoach",
    analytics: "analytics",
    community: "community",
    mission: "mission",
  };

  const section =
    sectionMap[media.purpose];

  if (!section) {
    return;
  }

  await setDoc(
    homepageRef,
    {
      [section]: {
        image: media.url,
        imageMediaId: media.id,
      },
    },
    { merge: true }
  );
}

/**
 * Remove the media assignment from the website
 * before deleting the media record.
 *
 * This is what allows the homepage to fall back
 * to its original/default image.
 */
async function removeMediaAssignment(
  media: MediaItem
) {
  const homepageRef = doc(
    db,
    "siteSettings",
    "homepage"
  );

  /**
   * LOGO
   */
  if (media.purpose === "logo") {
    const siteRef = doc(
      db,
      "siteSettings",
      "site"
    );

    const snapshot = await getDoc(siteRef);

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();

    if (
      data.logoMediaId === media.id ||
      data.logo === media.url
    ) {
      await setDoc(
        siteRef,
        {
          logo: "",
          logoMediaId: "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return;
  }

  /**
   * FAVICON
   */
  if (media.purpose === "favicon") {
    const siteRef = doc(
      db,
      "siteSettings",
      "site"
    );

    const snapshot = await getDoc(siteRef);

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();

    if (
      data.faviconMediaId === media.id ||
      data.favicon === media.url
    ) {
      await setDoc(
        siteRef,
        {
          favicon: "",
          faviconMediaId: "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return;
  }

  /**
   * HERO
   */
  if (
    media.purpose === "hero_1" ||
    media.purpose === "hero_2" ||
    media.purpose === "hero_3"
  ) {
    const slot =
      media.purpose === "hero_1"
        ? 0
        : media.purpose === "hero_2"
          ? 1
          : 2;

    const snapshot = await getDoc(
      homepageRef
    );

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();
    const hero = data.hero || {};

    const images = Array.isArray(hero.images)
      ? [...hero.images]
      : [];

    const mediaIds = Array.isArray(
      hero.imageMediaIds
    )
      ? [...hero.imageMediaIds]
      : [];

    const currentImage = images[slot];
    const currentMediaId = mediaIds[slot];

    /**
     * Only remove the assignment if this exact
     * media item is still assigned to that slot.
     *
     * This prevents deleting an old image from
     * accidentally removing a newer replacement.
     */
    if (
      currentMediaId === media.id ||
      currentImage === media.url
    ) {
      images[slot] = "";
      mediaIds[slot] = null;

      await setDoc(
        homepageRef,
        {
          hero: {
            ...hero,
            images,
            imageMediaIds: mediaIds,
          },
        },
        { merge: true }
      );
    }

    return;
  }

  /**
   * OTHER HOMEPAGE SECTIONS
   */
  const sectionMap: Record<
    string,
    string
  > = {
    about: "about",
    learning: "learning",
    cbt: "cbt",
    battle: "battle",
    aiCoach: "aiCoach",
    analytics: "analytics",
    community: "community",
    mission: "mission",
  };

  const section =
    sectionMap[media.purpose];

  if (!section) {
    return;
  }

  const snapshot = await getDoc(
    homepageRef
  );

  if (!snapshot.exists()) {
    return;
  }

  const data = snapshot.data();
  const sectionData =
    data[section] || {};

  if (
    sectionData.imageMediaId === media.id ||
    sectionData.image === media.url
  ) {
    await setDoc(
      homepageRef,
      {
        [section]: {
          ...sectionData,
          image: "",
          imageMediaId: "",
        },
      },
      { merge: true }
    );
  }
}

/**
 * Delete media safely.
 */
export async function deleteMediaItem(
  mediaId: string
) {
  const mediaRef = doc(
    db,
    "media",
    mediaId
  );

  const snapshot = await getDoc(
    mediaRef
  );

  if (!snapshot.exists()) {
    return;
  }

  const media = {
    id: mediaId,
    ...(snapshot.data() as Omit<
      MediaItem,
      "id"
    >),
  };

  /**
   * First remove the website assignment.
   */
  await removeMediaAssignment(media);

  /**
   * Then remove the Firestore media record.
   */
  await deleteDoc(mediaRef);
}
