"use client";

import { FormEvent, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = credential.user;

      if (!user.email) {
        await signOut(auth);
        throw new Error("This account does not have an email address.");
      }

      const adminSnapshot = await getDoc(
        doc(db, "adminUsers", user.uid)
      );

      if (!adminSnapshot.exists()) {
        await signOut(auth);
        throw new Error("This account is not authorized to access the admin portal.");
      }

      const adminData = adminSnapshot.data();

      if (adminData.active !== true) {
        await signOut(auth);
        throw new Error("This administrator account is inactive.");
      }

      router.push("/admin");
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to sign in.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ff] px-5 py-10">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] bg-white p-8 shadow-[0_25px_80px_rgba(76,29,149,0.12)] sm:p-10">

          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 text-2xl font-black text-white shadow-lg">
              J
            </div>

            <h1 className="text-3xl font-black tracking-tight text-gray-950">
              JAMBMASTER
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Administration Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Admin email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                Unable to sign in. Please check your email and password.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-700 to-purple-900 px-5 py-4 font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in to Admin"}
            </button>

          </form>

          <div className="mt-8 border-t border-gray-100 pt-6 text-center">
            <p className="text-xs leading-5 text-gray-400">
              JAMBMASTER Administration
              <br />
              Managed by Triangletech
            </p>
          </div>

        </div>
      </div>
    </main>
  );
                }
