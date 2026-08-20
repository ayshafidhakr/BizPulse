"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell
} from "recharts";

interface DailySale {
    day: string;
    revenue: number;
}

interface TopProduct {
    name: string;
    quantity: number;
}

export default function DashboardPage() {
    // const [business, setBusiness] = useState<any>(null);
    interface Business {
        id: string;
        business_name: string;
        business_type: string;
        owner_name: string;
    }

    const [business, setBusiness] = useState<Business | null>(null);
    const [stats, setStats] = useState({
        todaySales: 0,
        totalProducts: 0,
        lowStock: 0,
        totalCredit: 0,
    });
    const [weeklyData, setWeeklyData] = useState<DailySale[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: biz } = await supabase
                    .from("businesses")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (!biz) return;
                setBusiness(biz);

                // Today's sales
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const { data: todaySalesData } = await supabase
                    .from("sales")
                    .select("total_amount")
                    .eq("business_id", biz.id)
                    .gte("sale_date", today.toISOString());

                const todaySales = todaySalesData?.reduce(
                    (sum, s) => sum + s.total_amount, 0
                ) ?? 0;

                // Products stats
                const { data: products } = await supabase
                    .from("products")
                    .select("id, stock_quantity, low_stock_threshold")
                    .eq("business_id", biz.id);

                const totalProducts = products?.length ?? 0;
                const lowStock = products?.filter(
                    (p) => p.stock_quantity <= p.low_stock_threshold
                ).length ?? 0;

                // Total credit
                const { data: customers } = await supabase
                    .from("customers")
                    .select("total_credit")
                    .eq("business_id", biz.id);

                const totalCredit = customers?.reduce(
                    (sum, c) => sum + c.total_credit, 0
                ) ?? 0;

                setStats({ todaySales, totalProducts, lowStock, totalCredit });

                // Last 7 days sales data
                const days = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    date.setHours(0, 0, 0, 0);
                    const nextDate = new Date(date);
                    nextDate.setDate(nextDate.getDate() + 1);

                    const { data: daySales } = await supabase
                        .from("sales")
                        .select("total_amount")
                        .eq("business_id", biz.id)
                        .gte("sale_date", date.toISOString())
                        .lt("sale_date", nextDate.toISOString());

                    const revenue = daySales?.reduce(
                        (sum, s) => sum + s.total_amount, 0
                    ) ?? 0;

                    days.push({
                        day: date.toLocaleDateString("en-IN", { weekday: "short" }),
                        revenue,
                    });
                }
                setWeeklyData(days);

                // Top 5 selling products
                const { data: allSales } = await supabase
                    .from("sales")
                    .select("quantity, products(name)")
                    .eq("business_id", biz.id);

                if (allSales) {
                    const productMap: Record<string, number> = {};
                    allSales.forEach((s) => {
                        const product = Array.isArray(s.products)
                            ? s.products[0]
                            : s.products;

                        const name = product?.name ?? "Unknown";
                        productMap[name] = (productMap[name] ?? 0) + s.quantity;
                    });

                    const sorted = Object.entries(productMap)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([name, quantity]) => ({ name, quantity }));

                    setTopProducts(sorted);
                }

                setLoading(false);
            } catch (err) {
                console.error("Dashboard load error:", err);
                setLoading(false);
            }
        }
        load();
    }, []);

    const greeting =
        new Date().getHours() < 12
            ? "Good morning"
            : new Date().getHours() < 17
                ? "Good afternoon"
                : "Good evening";

    const statCards = [
        {
            label: "Today's Revenue",
            value: `₹${stats.todaySales.toLocaleString("en-IN")}`,
            icon: "💰",
            color: "from-emerald-900/30 to-emerald-800/10",
            border: "border-emerald-800/50",
            href: "/dashboard/sales",
        },
        {
            label: "Total Products",
            value: stats.totalProducts,
            icon: "📦",
            color: "from-teal-900/30 to-teal-800/10",
            border: "border-teal-800/50",
            href: "/dashboard/inventory",
        },
        {
            label: "Low Stock Items",
            value: stats.lowStock,
            icon: "⚠️",
            color: stats.lowStock > 0
                ? "from-red-900/30 to-red-800/10"
                : "from-gray-900/30 to-gray-800/10",
            border: stats.lowStock > 0
                ? "border-red-800/50"
                : "border-gray-800/50",
            href: "/dashboard/inventory",
        },
        {
            label: "Credit Pending",
            value: `₹${stats.totalCredit.toLocaleString("en-IN")}`,
            icon: "📒",
            color: "from-yellow-900/30 to-yellow-800/10",
            border: "border-yellow-800/50",
            href: "/dashboard/khata",
        },
    ];

    return (
        <div className="px-8 py-10 flex flex-col gap-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">
                    {greeting},{" "}
                    {business?.owner_name?.split(" ")[0] ?? "there"} 👋
                </h1>
                <p className="text-gray-400 mt-1">
                    Here&apos;s your business pulse for today —{" "}
                    {new Date().toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                    })}
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-5 flex flex-col gap-3 hover:scale-[1.02] transition`}
                    >
                        <span className="text-3xl">{card.icon}</span>
                        <p className="text-gray-400 text-sm">{card.label}</p>
                        <p className="text-2xl font-bold">{card.value}</p>
                    </Link>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Weekly Revenue Chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">📈 Revenue — Last 7 Days</h2>
                    {weeklyData.every((d) => d.revenue === 0) ? (
                        <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                            No sales data yet
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={weeklyData}>
                                <XAxis
                                    dataKey="day"
                                    tick={{ fill: "#6b7280", fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: "#6b7280", fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `₹${v}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#111827",
                                        border: "1px solid #1f2937",
                                        borderRadius: "12px",
                                        color: "#fff",
                                    }}
                                    formatter={(value) => [
                                        `₹${Number(value).toLocaleString("en-IN")}`,
                                        "Revenue",
                                    ]}
                                />
                                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                                    {weeklyData.map((entry, index) => (
                                        <Cell
                                            key={index}
                                            fill={
                                                entry.day ===
                                                    new Date().toLocaleDateString("en-IN", {
                                                        weekday: "short",
                                                    })
                                                    ? "#10b981"
                                                    : "#064e3b"
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Top Products */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">🏆 Top Selling Products</h2>
                    {topProducts.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                            No sales data yet
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {topProducts.map((product, index) => (
                                <div key={product.name} className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-300 truncate max-w-[200px]">
                                            {index + 1}. {product.name}
                                        </span>
                                        <span className="text-sm text-emerald-400 font-semibold">
                                            {product.quantity} sold
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all"
                                            style={{
                                                width: `${(product.quantity / topProducts[0].quantity) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Low Stock Warning */}
            {stats.lowStock > 0 && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-2xl px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="text-red-300 font-semibold">
                                {stats.lowStock} item{stats.lowStock > 1 ? "s" : ""} running low on stock
                            </p>
                            <p className="text-red-400/70 text-sm">
                                Reorder soon to avoid stockouts
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/inventory"
                        className="text-sm text-red-300 hover:text-red-200 border border-red-800 hover:border-red-600 px-4 py-2 rounded-lg transition"
                    >
                        View Inventory →
                    </Link>
                </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-gray-300">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            href: "/dashboard/sales/new",
                            label: "Record a Sale",
                            icon: "💰",
                            desc: "Add a new sales transaction",
                        },
                        {
                            href: "/dashboard/inventory/new",
                            label: "Add Product",
                            icon: "📦",
                            desc: "Add a new product to inventory",
                        },
                        {
                            href: "/dashboard/khata/new",
                            label: "Add Customer",
                            icon: "👤",
                            desc: "Add a customer to Khata",
                        },
                    ].map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="bg-gray-900 border border-gray-800 hover:border-emerald-700 rounded-2xl p-5 flex items-center gap-4 transition group"
                        >
                            <span className="text-3xl">{action.icon}</span>
                            <div>
                                <p className="font-semibold group-hover:text-emerald-400 transition">
                                    {action.label}
                                </p>
                                <p className="text-gray-500 text-sm">{action.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* AI Assistant CTA */}
            <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/10 border border-emerald-800/40 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg">🤖 Ask your AI Business Assistant</h3>
                    <p className="text-gray-400 text-sm">
                        &quot;How much did I earn this week?&quot; • &quot;Which product sells most?&quot; • &quot;Who owes me money?&quot;
                    </p>
                </div>
                <Link
                    href="/dashboard/assistant"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition whitespace-nowrap ml-4"
                >
                    Ask now →
                </Link>
            </div>
        </div>
    );
}