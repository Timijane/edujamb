"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import {
  assignMediaToHomepage,
  deleteMediaItem,
  getMediaItems,
  MEDIA_PURPOSES,
  MediaItem,
  MediaPurpose,
  saveMediaItem,
} from "@/lib/media";

import { defaultHomepage } from "@/lib/default-homepage";

const CLOUDINARY_CLOUD_NAME = "dmbjrohtn";
const CLOUDINARY_UPLOAD_PRESET = "pelumi";

type AssetLocation = {
  id: string;
  label: string;
  description: string;
  type: "site" | "homepage";
  purpose: MediaPurpose;
  image: string;
  mediaId: string;
  assigned: boolean;
};

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
};

export default function MediaManagerPage() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [assetLocations, setAssetLocations] =
    useState<AssetLocation[]>([]);

  const [loadingMedia, setLoadingMedia] = useState(true);
  const [loadingAssignments, setLoadingAssignments] =
    useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [selectedPurpose, setSelectedPurpose] =
    useState<MediaPurpose>("other");

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [selectedMedia, setSelectedMedia] =
    useState<MediaItem | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/admin/login");
          return;
        }

        try {
          const adminRef = doc(
            db,
            "adminUsers",
            currentUser.uid
          );

          const adminSnapshot = await getDoc(adminRef);

          if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().active !== true
          ) {
            await signOut(auth);

            router.replace(
              "/admin/login?error=unauthorized"
            );

            return;
          }

          setUser(currentUser);
          setCheckingAuth(false);

          await loadEverything();
        } catch (err) {
          console.error(
            "Admin verification error:",
            err
          );

          await signOut(auth);

          router.replace(
            "/admin/login?error=authorization"
          );
        }
      }
    );

    return () => unsubscribe();
  }, [router]);

  async function loadEverything() {
    await Promise.all([
      loadMedia(),
      loadAssetLocations(),
    ]);
  }

  async function loadMedia() {
    setLoadingMedia(true);

    try {
      const items = await getMediaItems();
      setMedia(items);
    } catch (err) {
      console.error(
        "Failed to load media:",
        err
      );

      setError(
        "Unable to load the media library."
      );
    } finally {
      setLoadingMedia(false);
    }
  }

  async function loadAssetLocations() {
    setLoadingAssignments(true);

    try {
      const homepageSnapshot = await getDoc(
        doc(db, "siteSettings", "homepage")
      );

      const siteSnapshot = await getDoc(
        doc(db, "siteSettings", "site")
      );

      const homepage = homepageSnapshot.exists()
        ? {
            ...defaultHomepage,
            ...(homepageSnapshot.data() as Partial<
              typeof defaultHomepage
            >),
          }
        : defaultHomepage;

      const site = siteSnapshot.exists()
        ? siteSnapshot.data()
        : {};

      const heroImages =
        homepage.hero?.images ?? [];

      const heroMediaIds =
        homepage.hero?.imageMediaIds ?? [];

      const locations: AssetLocation[] = [
        {
          id: "logo",
          label: "Logo",
          description:
            "Main JAMBMASTER brand logo used across the website.",
          type: "site",
          purpose: "logo",
          image: site.logo || "",
          mediaId: site.logoMediaId || "",
          assigned: Boolean(site.logoMediaId),
        },

        {
          id: "favicon",
          label: "Favicon",
          description:
            "Browser tab and website favicon.",
          type: "site",
          purpose: "favicon",
          image: site.favicon || "",
          mediaId: site.faviconMediaId || "",
          assigned: Boolean(
            site.faviconMediaId
          ),
        },

        {
          id: "hero_1",
          label: "Hero Image 1",
          description:
            "Primary rotating image in the homepage hero.",
          type: "homepage",
          purpose: "hero_1",
          image:
            heroImages[0] ||
            defaultHomepage.hero.images[0] ||
            "",
          mediaId: heroMediaIds[0] || "",
          assigned: Boolean(
            heroMediaIds[0]
          ),
        },

        {
          id: "hero_2",
          label: "Hero Image 2",
          description:
            "Second rotating image in the homepage hero.",
          type: "homepage",
          purpose: "hero_2",
          image:
            heroImages[1] ||
            defaultHomepage.hero.images[1] ||
            "",
          mediaId: heroMediaIds[1] || "",
          assigned: Boolean(
            heroMediaIds[1]
          ),
        },

        {
          id: "hero_3",
          label: "Hero Image 3",
          description:
            "Third rotating image in the homepage hero.",
          type: "homepage",
          purpose: "hero_3",
          image:
            heroImages[2] ||
            defaultHomepage.hero.images[2] ||
            "",
          mediaId: heroMediaIds[2] || "",
          assigned: Boolean(
            heroMediaIds[2]
          ),
        },

        createHomepageAsset(
          "about",
          "About",
          homepage.about,
          "about"
        ),

        createHomepageAsset(
          "learning",
          "Learning",
          homepage.learning,
          "learning"
        ),

        createHomepageAsset(
          "cbt",
          "CBT Practice",
          homepage.cbt,
          "cbt"
        ),

        createHomepageAsset(
          "battle",
          "Battle Arena",
          homepage.battle,
          "battle"
        ),

        createHomepageAsset(
          "aiCoach",
          "AI JAMB Coach",
          homepage.aiCoach,
          "aiCoach"
        ),

        createHomepageAsset(
          "analytics",
          "Analytics",
          homepage.analytics,
          "analytics"
        ),

        createHomepageAsset(
          "community",
          "Community",
          homepage.community,
          "community"
        ),

        createHomepageAsset(
          "mission",
          "Mission",
          homepage.mission,
          "mission"
        ),
      ];

      setAssetLocations(locations);
    } catch (err) {
      console.error(
        "Failed to load asset assignments:",
        err
      );

      setError(
        "Unable to load current website asset assignments."
      );
    } finally {
      setLoadingAssignments(false);
    }
  }

  function createHomepageAsset(
    id: string,
    label: string,
    section:
      | {
          image?: string;
          imageMediaId?: string;
        }
      | undefined,
    purpose: MediaPurpose
  ): AssetLocation {
    const defaultSection =
      defaultHomepage[
        id as keyof typeof defaultHomepage
      ];

    const defaultImage =
      defaultSection &&
      typeof defaultSection === "object" &&
      "image" in defaultSection
        ? String(
            (
              defaultSection as {
                image?: string;
              }
            ).image || ""
          )
        : "";

    return {
      id,
      label,
      description:
        `${label} section image on the JAMBMASTER homepage.`,
      type: "homepage",
      purpose,
      image:
        section?.image ||
        defaultImage ||
        "",
      mediaId:
        section?.imageMediaId ||
        "",
      assigned: Boolean(
        section?.imageMediaId
      ),
    };
  }

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const selected = Array.from(files);

    setSelectedFiles(selected);
    setMessage("");
    setError("");
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      setError(
        "Please choose at least one image."
      );

      return;
    }

    if (selectedPurpose === "other") {
      setError(
        "Please choose a specific website location before uploading."
      );

      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage("");
    setError("");

    try {
      for (
        let index = 0;
        index < selectedFiles.length;
        index++
      ) {
        const file = selectedFiles[index];

        validateImage(file);

        const uploaded =
          await uploadToCloudinary(file);

        const location =
          selectedPurpose === "logo" ||
          selectedPurpose === "favicon"
            ? "site"
            : "homepage";

        const homepageSlot =
          getHomepageSlot(
            selectedPurpose
          );

        const mediaId =
          await saveMediaItem({
            url: uploaded.secure_url,
            publicId:
              uploaded.public_id,
            fileName: file.name,
            resourceType:
              uploaded.resource_type ||
              "image",
            format:
              uploaded.format || "",
            bytes:
              uploaded.bytes ||
              file.size,
            width:
              uploaded.width,
            height:
              uploaded.height,
            purpose:
              selectedPurpose,
            location,
            homepageSlot,
            uploadedBy:
              user?.email || "",
          });

        const savedMedia: MediaItem = {
          id: mediaId,
          url: uploaded.secure_url,
          publicId:
            uploaded.public_id,
          fileName: file.name,
          resourceType:
            uploaded.resource_type ||
            "image",
          format:
            uploaded.format || "",
          bytes:
            uploaded.bytes ||
            file.size,
          width:
            uploaded.width,
          height:
            uploaded.height,
          purpose:
            selectedPurpose,
          location,
          homepageSlot,
          uploadedBy:
            user?.email || "",
        };

        await assignMediaToHomepage(
          savedMedia
        );

        setUploadProgress(
          Math.round(
            ((index + 1) /
              selectedFiles.length) *
              100
          )
        );
      }

      const label =
        getPurposeLabel(
          selectedPurpose
        );

      setMessage(
        `${selectedFiles.length} ${
          selectedFiles.length === 1
            ? "image"
            : "images"
        } uploaded successfully and assigned to ${label}.`
      );

      clearSelection();

      await loadEverything();
    } catch (err) {
      console.error(
        "Upload error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "The upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(
    item: MediaItem
  ) {
    const confirmed =
      window.confirm(
        `Delete "${item.fileName}"?\n\nThis will remove the media record and remove its active website assignment if it is currently assigned.\n\nThe physical Cloudinary file will remain until secure server-side deletion is implemented.`
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await deleteMediaItem(item.id);

      setMedia((current) =>
        current.filter(
          (mediaItem) =>
            mediaItem.id !== item.id
        )
      );

      if (
        selectedMedia?.id ===
        item.id
      ) {
        setSelectedMedia(null);
      }

      await loadAssetLocations();

      setMessage(
        "Media deleted and its website assignment has been updated."
      );
    } catch (err) {
      console.error(
        "Delete error:",
        err
      );

      setError(
        "Unable to delete this media item."
      );
    }
  }

  async function copyUrl(
    url: string
  ) {
    try {
      await navigator.clipboard.writeText(
        url
      );

      setMessage(
        "Image URL copied to clipboard."
      );

      window.setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (err) {
      console.error(
        "Clipboard error:",
        err
      );

      setError(
        "Unable to copy the image URL."
      );
    }
  }

  function selectPurpose(
    purpose: MediaPurpose
  ) {
    setSelectedPurpose(purpose);

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function clearSelection() {
    setSelectedFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const assignedCount =
    assetLocations.filter(
      (item) => item.assigned
    ).length;

  const defaultCount =
    assetLocations.filter(
      (item) => !item.assigned
    ).length;

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5ff]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" />

          <p className="font-bold text-violet-700">
            Securing Media Manager...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5ff]">
      <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            className="text-left"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
              JAMBMASTER CMS
            </p>

            <h1 className="text-xl font-black text-gray-950 sm:text-2xl">
              Media Manager
            </h1>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/homepage"
                )
              }
              className="hidden rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 sm:block"
            >
              Homepage CMS
            </button>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800"
            >
              Choose Image
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                Website Asset Control
              </p>

              <h2 className="mt-2 text-2xl font-black text-gray-950 sm:text-3xl">
                Website image assignments
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
                Manage the exact images used throughout
                the JAMBMASTER website. Replace an image
                for a specific location without changing
                the rest of the website.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="rounded-full bg-green-50 px-4 py-2 text-xs font-black text-green-700">
                {assignedCount} Assigned
              </div>

              <div className="rounded-full bg-gray-100 px-4 py-2 text-xs font-black text-gray-600">
                {defaultCount} Default
              </div>
            </div>
          </div>

          {loadingAssignments ? (
            <LoadingBox text="Checking website assignments..." />
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assetLocations.map(
                (asset) => (
                  <AssetLocationCard
                    key={asset.id}
                    asset={asset}
                    onReplace={() =>
                      selectPurpose(
                        asset.purpose
                      )
                    }
                  />
                )
              )}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-sm font-black text-violet-950">
              How image replacement works
            </p>

            <div className="mt-3 grid gap-3 text-xs leading-5 text-violet-700 sm:grid-cols-3">
              <Step
                number="01"
                text="Choose the exact website location."
              />

              <Step
                number="02"
                text="Select the new image from your device."
              />

              <Step
                number="03"
                text="Upload and make it the active asset."
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm md:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
              Add Website Media
            </p>

            <h2 className="mt-2 text-2xl font-black text-gray-950 sm:text-3xl">
              Upload and assign an image
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              Select a website location first. Your image
              will be uploaded to Cloudinary, recorded in
              Firebase and assigned to that exact location.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800">
                Website location
              </label>

              <select
                value={selectedPurpose}
                onChange={(event) => {
                  setSelectedPurpose(
                    event.target
                      .value as MediaPurpose
                  );

                  setMessage("");
                  setError("");
                }}
                disabled={uploading}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {MEDIA_PURPOSES.map(
                  (purpose) => (
                    <option
                      key={purpose.value}
                      value={
                        purpose.value
                      }
                    >
                      {purpose.label}
                    </option>
                  )
                )}
              </select>

              <p className="mt-2 text-xs leading-5 text-gray-400">
                {MEDIA_PURPOSES.find(
                  (item) =>
                    item.value ===
                    selectedPurpose
                )?.description ||
                  "Select a specific website location."}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800">
                Image files
              </label>

              <button
                type="button"
                disabled={uploading}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex min-h-[58px] w-full items-center justify-between rounded-xl border border-dashed border-violet-200 bg-violet-50 px-4 py-3 text-left transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-violet-800">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} image${
                          selectedFiles.length !==
                          1
                            ? "s"
                            : ""
                        } selected`
                      : "Choose image"}
                  </p>

                  <p className="mt-1 text-xs text-violet-500">
                    JPG, PNG, WEBP and other
                    supported image formats
                  </p>
                </div>

                <span className="ml-4 text-xl font-bold text-violet-700">
                  +
                </span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={
              selectedPurpose !== "hero_1" &&
              selectedPurpose !== "hero_2" &&
              selectedPurpose !== "hero_3"
            }
            className="hidden"
            onChange={handleFileSelection}
          />

          {selectedFiles.length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Selected Files
                </p>

                {!uploading && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {selectedFiles.map(
                  (file) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3"
                    >
                      <p className="min-w-0 truncate text-sm font-semibold text-gray-800">
                        {file.name}
                      </p>

                      <p className="shrink-0 text-xs text-gray-400">
                        {formatBytes(
                          file.size
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleUpload}
              disabled={
                uploading ||
                selectedFiles.length === 0 ||
                selectedPurpose === "other"
              }
              className="rounded-xl bg-gradient-to-r from-violet-700 to-purple-900 px-7 py-3.5 font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading
                ? `Uploading ${uploadProgress}%...`
                : "Upload to Website"}
            </button>

            {selectedFiles.length > 0 &&
              !uploading && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                >
                  Clear Selection
                </button>
              )}
          </div>

          {uploading && (
            <div className="mt-6">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500">
                  Uploading and assigning...
                </span>

                <span className="text-violet-700">
                  {uploadProgress}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-full rounded-full bg-violet-700 transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                Media Library
              </p>

              <h2 className="mt-1 text-2xl font-black text-gray-950">
                Uploaded Website Images
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Every uploaded image is stored here with
                its website purpose and Cloudinary details.
              </p>
            </div>

            <div className="shrink-0 rounded-full bg-violet-100 px-4 py-2 text-xs font-black text-violet-700">
              {media.length}{" "}
              {media.length === 1
                ? "item"
                : "items"}
            </div>
          </div>

          {loadingMedia ? (
            <LoadingBox text="Loading media library..." />
          ) : media.length === 0 ? (
            <EmptyLibrary
              onChoose={() =>
                fileInputRef.current?.click()
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {media.map(
                (item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onSelect={() =>
                      setSelectedMedia(
                        item
                      )
                    }
                    onCopy={() =>
                      copyUrl(
                        item.url
                      )
                    }
                    onDelete={() =>
                      handleDelete(
                        item
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </section>

      {selectedMedia && (
        <MediaDetails
          item={selectedMedia}
          onClose={() =>
            setSelectedMedia(null)
          }
          onCopy={() =>
            copyUrl(
              selectedMedia.url
            )
          }
        />
      )}

      <footer className="mt-12 border-t border-violet-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-5 text-center">
          <p className="text-sm font-bold text-gray-700">
            JAMBMASTER Media Manager
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Managed by Triangletech
          </p>
        </div>
      </footer>
    </main>
  );
}

function AssetLocationCard({
  asset,
  onReplace,
}: {
  asset: AssetLocation;
  onReplace: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-200">
        {asset.image ? (
          <img
            src={asset.image}
            alt={asset.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">
            No image assigned
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow ${
              asset.assigned
                ? "bg-green-600/90"
                : "bg-gray-700/90"
            }`}
          >
            {asset.assigned
              ? "Assigned"
              : "Default"}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-gray-950">
              {asset.label}
            </h3>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              {asset.description}
            </p>
          </div>

          <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wide text-gray-400">
            {asset.type}
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
            Current source
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-gray-700">
            {asset.assigned
              ? "Custom media asset"
              : "JAMBMASTER default asset"}
          </p>
        </div>

        <button
          type="button"
          onClick={onReplace}
          className="mt-3 w-full rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-800"
        >
          {asset.assigned
            ? "Replace Image"
            : "Assign Image"}
        </button>
      </div>
    </div>
  );
}

function MediaCard({
  item,
  onSelect,
  onCopy,
  onDelete,
}: {
  item: MediaItem;
  onSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={item.url}
            alt={item.fileName}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />

          <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">
            {getPurposeLabel(
              item.purpose
            )}
          </div>
        </div>
      </button>

      <div className="p-4">
        <p
          className="truncate text-sm font-black text-gray-900"
          title={item.fileName}
        >
          {item.fileName}
        </p>

        <p className="mt-1 text-xs text-gray-400">
          {formatBytes(item.bytes)}

          {item.width &&
          item.height
            ? ` • ${item.width} × ${item.height}`
            : ""}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="flex-1 rounded-xl bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
          >
            Details
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-600 transition hover:border-violet-200 hover:text-violet-700"
          >
            Copy
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-red-100 px-3 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaDetails({
  item,
  onClose,
  onCopy,
}: {
  item: MediaItem;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
              Media Details
            </p>

            <h2
              className="mt-1 max-w-xl truncate text-lg font-black text-gray-950"
              title={item.fileName}
            >
              {item.fileName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 transition hover:bg-gray-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            <img
              src={item.url}
              alt={item.fileName}
              className="max-h-[450px] w-full object-contain"
            />
          </div>

          <div className="space-y-4">
            <Detail
              label="Purpose"
              value={getPurposeLabel(
                item.purpose
              )}
            />

            <Detail
              label="Location"
              value={item.location}
            />

            <Detail
              label="File name"
              value={item.fileName}
            />

            <Detail
              label="Format"
              value={
                item.format ||
                "Unknown"
              }
            />

            <Detail
              label="File size"
              value={formatBytes(
                item.bytes
              )}
            />

            {item.width &&
              item.height && (
                <Detail
                  label="Dimensions"
                  value={`${item.width} × ${item.height}px`}
                />
              )}

            <Detail
              label="Cloudinary ID"
              value={item.publicId}
            />

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                Image URL
              </p>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="break-all text-xs leading-5 text-gray-600">
                  {item.url}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCopy}
              className="w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white transition hover:bg-violet-800"
            >
              Copy Image URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
}

function Step({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-white/70 p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-[10px] font-black text-white">
        {number}
      </span>

      <p>{text}</p>
    </div>
  );
}

function LoadingBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-8 rounded-2xl bg-gray-50 p-10 text-center">
      <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" />

      <p className="text-sm font-bold text-gray-600">
        {text}
      </p>
    </div>
  );
}

function EmptyLibrary({
  onChoose,
}: {
  onChoose: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-2xl text-violet-700">
        ▣
      </div>

      <h3 className="mt-5 text-xl font-black text-gray-950">
        No media yet
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        Upload your first JAMBMASTER website image
        using the assignment system above.
      </p>

      <button
        type="button"
        onClick={onChoose}
        className="mt-6 rounded-xl bg-violet-700 px-6 py-3 text-sm font-black text-white transition hover:bg-violet-800"
      >
        Choose Image
      </button>
    </div>
  );
}

async function uploadToCloudinary(
  file: File
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      "Cloudinary cloud name is missing."
    );
  }

  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary upload preset is missing."
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result =
    (await response.json()) as CloudinaryUploadResult & {
      error?: {
        message?: string;
      };
    };

  if (!response.ok) {
    console.error(
      "Cloudinary response:",
      result
    );

    throw new Error(
      result?.error?.message ||
        "Cloudinary upload failed."
    );
  }

  if (
    !result.secure_url ||
    !result.public_id
  ) {
    throw new Error(
      "Cloudinary returned an incomplete upload response."
    );
  }

  return result;
}

function validateImage(
  file: File
) {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      `"${file.name}" is not a supported image file.`
    );
  }

  const maxSize =
    10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      `"${file.name}" is larger than the 10 MB upload limit.`
    );
  }
}

function getHomepageSlot(
  purpose: MediaPurpose
): number | null {
  if (purpose === "hero_1") {
    return 0;
  }

  if (purpose === "hero_2") {
    return 1;
  }

  if (purpose === "hero_3") {
    return 2;
  }

  return null;
}

function getPurposeLabel(
  purpose: MediaPurpose
): string {
  return (
    MEDIA_PURPOSES.find(
      (item) =>
        item.value === purpose
    )?.label || "Other"
  );
}

function formatBytes(
  bytes: number
): string {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    bytes /
    Math.pow(1024, index);

  return `${parseFloat(
    value.toFixed(2)
  )} ${units[index]}`;
}
