"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSignup() {
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    }

    if (success) {
        return (
            <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
                    <span className="text-5xl">📧</span>
                    <div>
                        <h1 className="text-2xl font-bold">Check your email!</h1>
                        <p className="text-gray-400 mt-2 text-sm">
                            We sent a confirmation link to{" "}
                            <span className="text-emerald-400 font-medium">{email}</span>.
                            Click it to activate your account and you&apos;ll be redirected
                            to your dashboard automatically.
                        </p>
                    </div>
                    <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl px-4 py-3 w-full">
                        <p className="text-emerald-300 text-xs">
                            ✓ Once confirmed you&apos;ll be taken straight to your dashboard
                        </p>
                    </div>
                    <Link
                        href="/login"
                        className="text-sm text-gray-500 hover:text-gray-300 transition"
                    >
                        Already confirmed? Login →
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col gap-6">
                <div>
                    <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        BizPulse
                    </span>
                    <h1 className="text-2xl font-bold mt-3">Create your account</h1>
                    <p className="text-gray-400 text-sm mt-1">Start managing your business smarter</p>
                </div>

                {error && (
                    <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
                        {error}
                    </p>
                )}

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSignup}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition"
                >
                    {loading ? "Creating account..." : "Sign up"}
                </button>

                <p className="text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-emerald-400 hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </main>
    );
}