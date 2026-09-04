"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type AdminProfile = {
  email: string;
  role: string;
  active: boolean;
};

type AdminCardProps = {
  title: string;
  description: string;
  href?: string;
  icon: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/admin/login");
        return;
      }

      setUser(currentUser);

      try {
        const adminRef = doc(db, "adminUsers", currentUser.uid);
        const adminSnapshot = await getDoc(adminRef);

        if (!adminSnapshot.exists()) {
          await signOut(auth);
          router.replace("/admin/login?error=unauthorized");
          return;
        }

        const adminData = adminSnapshot.data() as AdminProfile;

        if (!adminData.active) {
          await signOut(auth);
          router.replace("/admin/login?error=disabled");
          return;
        }

        if (adminData.role !== "super_admin") {
          await signOut(auth);
          router.replace("/staff/login?error=portal");
          return;
        }

        setAdmin(adminData);
        setChecking(false);
      } catch (error) {
        console.error("Admin authorization error:", error);

        await signOut(auth);
        router.replace("/admin/login?error=authorization");
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut(auth);
      router.replace("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5ff] px-5">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" />

          <h1 className="text-lg font-black text-gray-950">
            JAMBMASTER
          </h1>

          <p className="mt-2 text-sm font-semibold text-violet-700">
            Securing Admin Dashboard...
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Verifying your administrator access
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5ff]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="text-left"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-950">
              EduJAMB
            </h1>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-gray-400">
                Signed in as
              </p>

              <p className="max-w-[220px] truncate text-sm font-bold text-gray-800">
                {user?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD */}
      <section className="mx-auto max-w-7xl px-5 py-10">
        {/* INTRO */}
        <div className="mb-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Welcome back,{" "}
                <span className="font-bold text-violet-700">
                  {admin?.role === "super_admin"
                    ? "Super Admin"
                    : "Admin"}
                </span>
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                Admin Dashboard
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                Manage JAMBMASTER content, website design, media,
                students, academic resources, blog content and
                platform settings from one central administration
                system.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-fit rounded-xl border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
            >
              View Website →
            </button>
          </div>
        </div>

        {/* MANAGEMENT GRID */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AdminCard
            title="Homepage CMS"
            description="Edit homepage text, buttons, repeatable content, announcements and display settings."
            href="/admin/homepage"
            icon="⌂"
          />

          <AdminCard
            title="Login Experience"
            description="Control the shared login page background, colours, copy and visual experience."
            href="/admin/login-settings"
            icon="◌"
          />

          <AdminCard
            title="Media Manager"
            description="Upload and assign the logo, favicon, hero images and homepage section images."
            href="/admin/media"
            icon="▣"
          />

          {admin?.role === "super_admin" && (
            <AdminCard
              title="Team Management"
              description="Create and disable delegated co-admin, supporter and teacher accounts without sharing the Super Admin account."
              href="/admin/team"
              icon="♙"
            />
          )}

          <AdminCard
            title="Authentication"
            description="Firebase Authentication powers the shared login. The backend resolves each authenticated account to its authorized role."
            icon="✓"
          />

          <AdminCard
            title="Content System"
            description="Homepage content is stored in Firestore and displayed directly by the public website."
            icon="▤"
          />

          <AdminCard
            title="Platform Database"
            description="Firestore is configured as the central application data layer for JAMBMASTER."
            icon="◈"
          />

          <AdminCard
            title="Website"
            description="Open the live public JAMBMASTER homepage and verify published changes."
            href="/"
            icon="↗"
          />
        </div>

        {/* QUICK ACCESS */}
        <div className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
              Quick Access
            </p>

            <h3 className="mt-1 text-xl font-black text-gray-950">
              JAMBMASTER Management
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              title="Edit Homepage"
              description="Update public website content"
              onClick={() => router.push("/admin/homepage")}
            />

            <QuickAction
              title="Upload Media"
              description="Manage website images"
              onClick={() => router.push("/admin/media")}
            />

            <QuickAction
              title="Website"
              description="Open public JAMBMASTER site"
              onClick={() => router.push("/")}
            />
          </div>
        </div>

        {/* ADMIN ACCOUNT */}
        <div className="mt-10 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Administrator Account
              </p>

              <h3 className="mt-2 text-xl font-black text-gray-950">
                Account Information
              </h3>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-bold text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Active administrator
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <AccountInfo
              label="Email"
              value={user?.email || "Not available"}
            />

            <AccountInfo
              label="Role"
              value={admin?.role || "Admin"}
            />

            <AccountInfo
              label="Status"
              value={admin?.active ? "Active" : "Inactive"}
            />
          </div>
        </div>

        {/* PLATFORM STATUS */}
        <div className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-700 to-purple-900 p-6 text-white shadow-xl shadow-violet-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                Platform
              </p>

              <h3 className="mt-1 text-xl font-black">
                JAMBMASTER Administration
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100">
                Your administrator account is authenticated and
                authorized to manage JAMBMASTER.
              </p>
            </div>

            <div className="rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur">
              <p className="text-xs text-violet-200">
                Access level
              </p>

              <p className="mt-1 font-black">
                {admin?.role === "super_admin"
                  ? "SUPER ADMIN"
                  : "ADMIN"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-10 border-t border-violet-100 bg-white py-7">
        <div className="mx-auto max-w-7xl px-5 text-center">
          <p className="text-sm font-bold text-gray-700">
            JAMBMASTER
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Managed by Triangletech
          </p>

          <p className="mt-2 text-xs text-gray-400">
            Administration Portal
          </p>
        </div>
      </footer>
    </main>
  );
}

function AdminCard({
  title,
  description,
  href,
  icon,
}: AdminCardProps) {
  const router = useRouter();

  const isAvailable = Boolean(href);

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => {
        if (href) {
          router.push(href);
        }
      }}
      className={`group w-full rounded-3xl border bg-white p-6 text-left shadow-sm transition ${
        isAvailable
          ? "cursor-pointer border-violet-100 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl"
          : "cursor-default border-gray-100 opacity-70"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black transition ${
            isAvailable
              ? "bg-violet-100 text-violet-700 group-hover:bg-violet-700 group-hover:text-white"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {icon}
        </div>

        {isAvailable && (
          <span className="text-lg text-violet-300 transition group-hover:translate-x-1 group-hover:text-violet-700">
            →
          </span>
        )}
      </div>

      <h3 className="mt-6 text-lg font-black text-gray-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <div className="mt-5">
        {isAvailable ? (
          <span className="text-xs font-bold text-violet-700">
            Open manager →
          </span>
        ) : (
          <span className="text-xs font-bold text-gray-400">
            Not available yet
          </span>
        )}
      </div>
    </button>
  );
}

function QuickAction({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
    >
      <h4 className="font-black text-gray-950">
        {title}
      </h4>

      <p className="mt-1 text-xs leading-5 text-gray-500">
        {description}
      </p>

      <span className="mt-4 inline-block text-xs font-bold text-violet-700">
        Open →
      </span>
    </button>
  );
}

function AccountInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}
