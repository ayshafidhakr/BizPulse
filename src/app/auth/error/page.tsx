import Link from "next/link";

export default function AuthErrorPage() {
    return (
        <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
                <span className="text-5xl">⚠️</span>
                <div>
                    <h1 className="text-2xl font-bold">Authentication Error</h1>
                    <p className="text-gray-400 mt-2 text-sm">
                        The confirmation link has expired or is invalid. Please try signing up again.
                    </p>
                </div>
                <div className="flex gap-3 w-full">
                    <Link
                        href="/signup"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold text-sm transition text-center"
                    >
                        Sign Up Again
                    </Link>
                    <Link
                        href="/login"
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl font-semibold text-sm transition text-center"
                    >
                        Login
                    </Link>
                </div>
            </div>
        </main>
    );
}