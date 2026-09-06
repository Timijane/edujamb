import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
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
): Promise<ProfileDesignConfig> {
  const snapshot = await getDoc(
    doc(db, PROFILE_DESIGNS_COLLECTION, designId)
  );

  if (!snapshot.exists()) {
    return {
      ...defaultProfileDesign,
      designId,
    };
  }

  return normalizeProfileDesign({
    ...(snapshot.data() as Partial<ProfileDesignConfig>),
    designId,
  });
}

export async function listProfileDesigns(): Promise<ProfileDesignConfig[]> {
  const snapshot = await getDocs(
    collection(db, PROFILE_DESIGNS_COLLECTION)
  );

  return snapshot.docs.map((item) =>
    normalizeProfileDesign({
      ...(item.data() as Partial<ProfileDesignConfig>),
      designId: item.id,
    })
  );
}

export async function saveProfileDesign(
  design: ProfileDesignConfig
): Promise<void> {
  const normalized = normalizeProfileDesign(design);

  await setDoc(
    doc(db, PROFILE_DESIGNS_COLLECTION, normalized.designId),
    {
      ...normalized,
      status: "draft",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function publishProfileDesign(
  designId: string
): Promise<void> {
  const designRef = doc(
    db,
    PROFILE_DESIGNS_COLLECTION,
    designId
  );

  const snapshot = await getDoc(designRef);

  if (!snapshot.exists()) {
    throw new Error("Profile design not found.");
  }

  await setDoc(
    designRef,
    {
      status: "published",
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
export async function ensureDefaultProfileDesign(): Promise<void> {
  const designRef = doc(
    db,
    PROFILE_DESIGNS_COLLECTION,
    defaultProfileDesign.designId
  );

  const snapshot = await getDoc(designRef);

  if (snapshot.exists()) {
    return;
  }

  await setDoc(designRef, {
    ...defaultProfileDesign,
    status: "published",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
  });
}
