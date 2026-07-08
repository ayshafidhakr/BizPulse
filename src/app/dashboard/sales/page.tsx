"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Sale {
    id: string;
    total_amount: number;
    quantity: number;
    payment_status: string;
    sale_date: string;
    products: { name: string } | null;
    customers: { name: string } | null;
}

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [todayTotal, setTodayTotal] = useState(0);
    const [weekTotal, setWeekTotal] = useState(0);

    useEffect(() => {
        async function load() {
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
                .from("sales")
                .select(`
                id, total_amount, quantity, payment_status, sale_date,
                products(name),
                customers(name)
                `)
                .eq("business_id", biz.id)
                .order("sale_date", { ascending: false });

            if (data) {
                setSales(data as any);

                //TODAY'S TOTAL
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todaySales = data.filter(
                    (s) => new Date(s.sale_date) >= today
                );

                //THIS WEEK'S TOTAL
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7)
                const weekSales = data.filter(
                    (s) => new Date(s.sale_date) >= weekAgo
                );
                setWeekTotal(
                    weekSales.reduce((sum, s) => sum + s.total_amount, 0)
                );
            }
            setLoading(false);
        }
        load();
    }, []);

    return (
        <div className="px-8 py-10 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">💰 Sales</h1>
                    <p className="text-gray-400 mt-1">{sales.length} total transactions</p>
                </div>
                <Link
                    href="/dashboard/sales/new"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
                >
                    + Record Sale
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 border border-emerald-800/50 rounded-2xl p-5 flex flex-col gap-1">
                    <p className="text-gray-400 text-sm">Today's Revenue</p>
                    <p className="text-3xl font-bold text-emerald-400">
                        ₹{todayTotal.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-teal-900/30 to-teal-800/10 border border-teal-800/50 rounded-2xl p-5 flex flex-col gap-1">
                    <p className="text-gray-400 text-sm">This Week's Revenue</p>
                    <p className="text-3xl font-bold text-teal-400">
                        ₹{weekTotal.toLocaleString("en-IN")}
                    </p>
                </div>
            </div>

            {/* Sales List */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-16" />
                    ))}
                </div>
            ) : sales.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 flex flex-col items-center gap-4">
                    <span className="text-5xl">💰</span>
                    <p className="text-gray-400 text-lg font-medium">No sales yet</p>
                    <Link
                        href="/dashboard/sales/new"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
                    >
                        Record your first sale
                    </Link>
                </div>
            ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-widest">
                        <span className="col-span-2">Product</span>
                        <span>Customer</span>
                        <span>Amount</span>
                        <span>Status</span>
                    </div>

                    {/* Rows */}
                    {sales.map((sale) => (
                        <div
                            key={sale.id}
                            className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition items-center"
                        >
                            <div className="col-span-2">
                                <p className="font-medium">
                                    {sale.products?.name ?? "Unknown Product"}
                                </p>
                                <p className="text-gray-500 text-xs">
                                    Qty: {sale.quantity} •{" "}
                                    {new Date(sale.sale_date).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                            <span className="text-gray-400 text-sm">
                                {sale.customers?.name ?? "Walk-in"}
                            </span>
                            <span className="text-emerald-400 font-semibold">
                                ₹{sale.total_amount.toLocaleString("en-IN")}
                            </span>
                            <span
                                className={`text-xs px-2 py-1 rounded-full border w-fit ${sale.payment_status === "paid"
                                        ? "bg-emerald-900/30 border-emerald-700 text-emerald-300"
                                        : "bg-yellow-900/30 border-yellow-700 text-yellow-300"
                                    }`}
                            >
                                {sale.payment_status === "paid" ? "Paid" : "Credit"}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}