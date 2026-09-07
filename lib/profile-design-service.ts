import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
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

export async function listProfileDesigns(): Promise<
  ProfileDesignConfig[]
> {
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

  const allDesignsSnapshot = await getDocs(
    collection(db, PROFILE_DESIGNS_COLLECTION)
  );

  const batch = writeBatch(db);

  allDesignsSnapshot.docs.forEach((item) => {
    if (item.id !== designId) {
      const data = item.data();

      if (data.status === "published") {
        batch.update(item.ref, {
          status: "draft",
          updatedAt: serverTimestamp(),
        });
      }
    }
  });

  batch.update(designRef, {
    status: "published",
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
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
    ...(published.data() as Partial<ProfileDesignConfig>),
    designId: published.id,
  });
}
