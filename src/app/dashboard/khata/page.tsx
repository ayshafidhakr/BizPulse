"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Customer {
    id: string;
    name: string;
    phone: string;
    total_credit: number;
    created_at: string;
}

export default function KhataPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPending, setTotalPending] = useState(0);

    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: biz } = await supabase
                    .from("businesses")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (!biz) return;

                const { data } = await supabase
                    .from("customers")
                    .select("*")
                    .eq("business_id", biz.id)
                    .order("total_credit", { ascending: false });

                if (data) {
                    setCustomers(data);
                    setTotalPending(
                        data.reduce((sum, c) => sum + c.total_credit, 0)
                    );
                }
                setLoading(false);
            } catch (err) {
                console.error("Network error, retrying...", err);
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <div className="px-8 py-10 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">📒 Khata</h1>
                    <p className="text-gray-400 mt-1">
                        {customers.length} customers •{" "}
                        <span className="text-yellow-400">
                            ₹{totalPending.toLocaleString("en-IN")} total pending
                        </span>
                    </p>
                </div>
                <Link
                    href="/dashboard/khata/new"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
                >
                    + Add Customer
                </Link>
            </div>

            {/* Total Pending Card */}
            {totalPending > 0 && (
                <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-800/50 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Total Credit Pending</p>
                        <p className="text-3xl font-bold text-yellow-400">
                            ₹{totalPending.toLocaleString("en-IN")}
                        </p>
                    </div>
                    <span className="text-4xl">💸</span>
                </div>
            )}

            {/* Customers List */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : customers.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 flex flex-col items-center gap-4">
                    <span className="text-5xl">📒</span>
                    <p className="text-gray-400 text-lg font-medium">No customers yet</p>
                    <Link
                        href="/dashboard/khata/new"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
                    >
                        Add your first customer
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {customers.map((customer) => (
                        <Link
                            key={customer.id}
                            href={`/dashboard/khata/${customer.id}`}
                            className="bg-gray-900 border border-gray-800 hover:border-emerald-700 rounded-2xl p-5 flex items-center justify-between transition group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center font-bold text-emerald-400">
                                    {customer.name[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold group-hover:text-emerald-400 transition">
                                        {customer.name}
                                    </p>
                                    <p className="text-gray-500 text-sm">
                                        {customer.phone || "No phone"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span
                                    className={`text-lg font-bold ${customer.total_credit > 0
                                            ? "text-yellow-400"
                                            : "text-emerald-400"
                                        }`}
                                >
                                    ₹{customer.total_credit.toLocaleString("en-IN")}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {customer.total_credit > 0 ? "pending" : "all clear ✅"}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}