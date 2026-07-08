"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCustomerPage() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleAdd() {
        if (!name) {
            setError("Customer name is required.");
            return;
        }

        setLoading(true);
        setError("");

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: biz } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!biz) return;

        const { error } = await supabase.from("customers").insert({
            business_id: biz.id,
            name,
            phone,
            total_credit: 0,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push("/dashboard/khata");
        }
    }

    return (
        <div className="px-8 py-10 max-w-lg flex flex-col gap-6">
            <div>
                <Link
                    href="/dashboard/khata"
                    className="text-sm text-gray-500 hover:text-emerald-400 transition"
                >
                    ← Back to Khata
                </Link>
                <h1 className="text-3xl font-bold mt-3">Add Customer</h1>
                <p className="text-gray-400 mt-1">Add a customer to track their credit.</p>
            </div>

            {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                    {error}
                </p>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">
                        Customer Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Meera Nair"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">Phone (optional)</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 99999 99999"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            <button
                onClick={handleAdd}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-900/30"
            >
                {loading ? "Adding..." : "Add Customer →"}
            </button>
        </div>
    );
}