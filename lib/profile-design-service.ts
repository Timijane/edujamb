import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  defaultProfileDesign,
  normalizeProfileDesign,
  type ProfileDesignConfig,
} from "@/lib/profile-design";

const PROFILE_DESIGNS_COLLECTION = "profileDesigns";

export async function getProfileDesign(
  designId: string
): Promise<ProfileDesignConfig | null> {
  const snapshot = await getDoc(
    doc(db, PROFILE_DESIGNS_COLLECTION, designId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeProfileDesign({
    ...(snapshot.data() as ProfileDesignConfig),
    designId,
  });
}

export async function listProfileDesigns(): Promise<
  ProfileDesignConfig[]
> {
  const snapshot = await getDocs(
    collection(db, PROFILE_DESIGNS_COLLECTION)
  );

  return snapshot.docs.map((item) =>
    normalizeProfileDesign({
      ...(item.data() as ProfileDesignConfig),
      designId: item.id,
    })
  );
}

/**
 * Saves a design as a draft.
 */
export async function saveProfileDesign(
  design: ProfileDesignConfig
) {
  const normalized = normalizeProfileDesign(design);

  await setDoc(
    doc(
      db,
      PROFILE_DESIGNS_COLLECTION,
      normalized.designId
    ),
    {
      ...normalized,
      status: "draft",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return normalized;
}

/**
 * Publishes exactly one design.
 * Every other design is moved back to draft.
 */
export async function publishProfileDesign(
  designId: string
) {
  const targetRef = doc(
    db,
    PROFILE_DESIGNS_COLLECTION,
    designId
  );

  const targetSnapshot = await getDoc(targetRef);

  if (!targetSnapshot.exists()) {
    throw new Error("Profile design not found.");
  }

  const allDesigns = await getDocs(
    collection(db, PROFILE_DESIGNS_COLLECTION)
  );

  const batch = writeBatch(db);

  allDesigns.docs.forEach((item) => {
    const isTarget = item.id === designId;

    batch.update(item.ref, {
      status: isTarget ? "published" : "draft",
      updatedAt: serverTimestamp(),
      ...(isTarget
        ? { publishedAt: serverTimestamp() }
        : {}),
    });
  });

  await batch.commit();

  return normalizeProfileDesign({
    ...(targetSnapshot.data() as ProfileDesignConfig),
    designId,
    status: "published",
  });
}

/**
 * Ensures the default profile design exists.
 */
export async function ensureDefaultProfileDesign() {
  const existing = await getProfileDesign(
    defaultProfileDesign.designId
  );

  if (existing) {
    return existing;
  }

  await setDoc(
    doc(
      db,
      PROFILE_DESIGNS_COLLECTION,
      defaultProfileDesign.designId
    ),
    {
      ...defaultProfileDesign,
      status: "published",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    }
  );

  return defaultProfileDesign;
}

/**
 * Student-safe published design lookup.
 *
 * IMPORTANT:
 * This intentionally queries ONLY published designs.
 * Students are not permitted to read draft designs.
 */
export async function getPublishedProfileDesign(): Promise<ProfileDesignConfig> {
  const publishedQuery = query(
    collection(db, PROFILE_DESIGNS_COLLECTION),
    where("status", "==", "published")
  );

  const snapshot = await getDocs(publishedQuery);

  if (snapshot.empty) {
    return defaultProfileDesign;
  }

  const published = snapshot.docs[0];

  return normalizeProfileDesign({
    ...(published.data() as ProfileDesignConfig),
    designId: published.id,
    status: "published",
  });
}
