"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, LineChart, Line,
    Cell, PieChart, Pie, Legend
} from "recharts";

type Range = "today" | "week" | "month" | "year" | "all";

interface SaleRow {
    id: string;
    total_amount: number;
    quantity: number;
    payment_status: string;
    sale_date: string;
    products: { name: string; cost_price: number; selling_price: number } | null;
    customers: { name: string } | null;
}

export default function ReportsPage() {
    const [range, setRange] = useState<Range>("week");
    const [sales, setSales] = useState<SaleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [bizId, setBizId] = useState("");

    useEffect(() => {
        async function getBiz() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: biz } = await supabase
                .from("businesses")
                .select("id")
                .eq("user_id", user.id)
                .single();
            if (biz) setBizId(biz.id);
        }
        getBiz();
    }, []);

    useEffect(() => {
        if (!bizId) return;
        fetchSales();
    }, [bizId, range]);

    async function fetchSales() {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("sales")
            .select(`
        id, total_amount, quantity, payment_status, sale_date,
        products(name, cost_price, selling_price),
        customers(name)
      `)
            .eq("business_id", bizId)
            .order("sale_date", { ascending: false });

        const now = new Date();
        if (range === "today") {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            query = query.gte("sale_date", start.toISOString());
        } else if (range === "week") {
            const start = new Date();
            start.setDate(now.getDate() - 7);
            query = query.gte("sale_date", start.toISOString());
        } else if (range === "month") {
            const start = new Date();
            start.setMonth(now.getMonth() - 1);
            query = query.gte("sale_date", start.toISOString());
        } else if (range === "year") {
            const start = new Date();
            start.setFullYear(now.getFullYear() - 1);
            query = query.gte("sale_date", start.toISOString());
        }

        const { data } = await query;
        if (data) setSales(data as any);
        setLoading(false);
    }

    // ── Computed Stats ──────────────────────────────
    const totalRevenue = sales.reduce((s, r) => s + r.total_amount, 0);

    const totalCost = sales.reduce((s, r) => {
        const cost = (r.products?.cost_price ?? 0) * r.quantity;
        return s + cost;
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0
        ? ((totalProfit / totalRevenue) * 100).toFixed(1)
        : "0";

    const paidSales = sales.filter((s) => s.payment_status === "paid");
    const creditSales = sales.filter((s) => s.payment_status === "credit");
    const paidRevenue = paidSales.reduce((s, r) => s + r.total_amount, 0);
    const creditRevenue = creditSales.reduce((s, r) => s + r.total_amount, 0);
    const totalUnits = sales.reduce((s, r) => s + r.quantity, 0);

    // ── Chart Data ──────────────────────────────────

    // Daily revenue trend
    const dailyMap: Record<string, number> = {};
    sales.forEach((s) => {
        const day = new Date(s.sale_date).toLocaleDateString("en-IN", {
            day: "numeric", month: "short",
        });
        dailyMap[day] = (dailyMap[day] ?? 0) + s.total_amount;
    });
    const dailyData = Object.entries(dailyMap)
        .map(([date, revenue]) => ({ date, revenue }))
        .reverse();

    // Top products by revenue
    const productMap: Record<string, { revenue: number; units: number; profit: number }> = {};
    sales.forEach((s) => {
        const name = s.products?.name ?? "Unknown";
        const profit = ((s.products?.selling_price ?? 0) - (s.products?.cost_price ?? 0)) * s.quantity;
        if (!productMap[name]) productMap[name] = { revenue: 0, units: 0, profit: 0 };
        productMap[name].revenue += s.total_amount;
        productMap[name].units += s.quantity;
        productMap[name].profit += profit;
    });
    const topProducts = Object.entries(productMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([name, d]) => ({ name, ...d }));

    // Payment breakdown for pie
    const pieData = [
        { name: "Paid", value: paidRevenue, color: "#10b981" },
        { name: "Credit", value: creditRevenue, color: "#f59e0b" },
    ].filter((d) => d.value > 0);

    // ── Range Labels ────────────────────────────────
    const rangeLabels: Record<Range, string> = {
        today: "Today",
        week: "Last 7 Days",
        month: "Last 30 Days",
        year: "Last 12 Months",
        all: "All Time",
    };

    const COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6"];

    return (
        <div className="px-8 py-10 flex flex-col gap-8">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">📊 Reports & Analytics</h1>
                    <p className="text-gray-400 mt-1">
                        Track performance, profit, and trends for your business.
                    </p>
                </div>

                {/* Range Selector */}
                <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
                    {(["today", "week", "month", "year", "all"] as Range[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${range === r
                                    ? "bg-emerald-600 text-white"
                                    : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {rangeLabels[r]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse h-28" />
                    ))}
                </div>
            ) : sales.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 flex flex-col items-center gap-3">
                    <span className="text-5xl">📭</span>
                    <p className="text-gray-400 text-lg font-medium">
                        No sales data for {rangeLabels[range].toLowerCase()}
                    </p>
                    <p className="text-gray-600 text-sm">Try a different time range</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                label: "Total Revenue",
                                value: `₹${totalRevenue.toLocaleString("en-IN")}`,
                                icon: "💰",
                                color: "from-emerald-900/30 to-emerald-800/10",
                                border: "border-emerald-800/50",
                                sub: `${sales.length} transactions`,
                            },
                            {
                                label: "Total Profit",
                                value: `₹${totalProfit.toLocaleString("en-IN")}`,
                                icon: totalProfit >= 0 ? "📈" : "📉",
                                color: totalProfit >= 0
                                    ? "from-teal-900/30 to-teal-800/10"
                                    : "from-red-900/30 to-red-800/10",
                                border: totalProfit >= 0
                                    ? "border-teal-800/50"
                                    : "border-red-800/50",
                                sub: `${profitMargin}% margin`,
                            },
                            {
                                label: "Cash Collected",
                                value: `₹${paidRevenue.toLocaleString("en-IN")}`,
                                icon: "✅",
                                color: "from-blue-900/30 to-blue-800/10",
                                border: "border-blue-800/50",
                                sub: `${paidSales.length} paid sales`,
                            },
                            {
                                label: "Credit Given",
                                value: `₹${creditRevenue.toLocaleString("en-IN")}`,
                                icon: "📒",
                                color: "from-yellow-900/30 to-yellow-800/10",
                                border: "border-yellow-800/50",
                                sub: `${creditSales.length} credit sales`,
                            },
                        ].map((card) => (
                            <div
                                key={card.label}
                                className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-5 flex flex-col gap-2`}
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-gray-400 text-sm">{card.label}</p>
                                    <span className="text-2xl">{card.icon}</span>
                                </div>
                                <p className="text-2xl font-bold">{card.value}</p>
                                <p className="text-gray-500 text-xs">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Extra Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            {
                                label: "Total Units Sold",
                                value: totalUnits,
                                icon: "📦",
                            },
                            {
                                label: "Avg Sale Value",
                                value: `₹${sales.length > 0 ? Math.round(totalRevenue / sales.length).toLocaleString("en-IN") : 0}`,
                                icon: "🧮",
                            },
                            {
                                label: "Total Cost",
                                value: `₹${totalCost.toLocaleString("en-IN")}`,
                                icon: "🏷️",
                            },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4"
                            >
                                <span className="text-3xl">{s.icon}</span>
                                <div>
                                    <p className="text-gray-400 text-sm">{s.label}</p>
                                    <p className="text-xl font-bold">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Revenue Trend */}
                        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
                            <h2 className="text-lg font-semibold">📈 Revenue Trend</h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={dailyData}>
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: "#6b7280", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "#6b7280", fontSize: 11 }}
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
                                        formatter={(v: any) => [
                                            `₹${v.toLocaleString("en-IN")}`,
                                            "Revenue",
                                        ]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        dot={{ fill: "#10b981", r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Payment Breakdown Pie */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
                            <h2 className="text-lg font-semibold">💳 Payment Split</h2>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            dataKey="value"
                                            paddingAngle={3}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#111827",
                                                border: "1px solid #1f2937",
                                                borderRadius: "12px",
                                                color: "#fff",
                                            }}
                                            formatter={(v: any) => [`₹${v.toLocaleString("en-IN")}`]}
                                        />
                                        <Legend
                                            formatter={(value) => (
                                                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                                                    {value}
                                                </span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                                    No data
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Products Table */}
                    {topProducts.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-800">
                                <h2 className="text-lg font-semibold">🏆 Top Products Performance</h2>
                            </div>
                            <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-widest">
                                <span className="col-span-2">Product</span>
                                <span>Units Sold</span>
                                <span>Revenue</span>
                                <span>Profit</span>
                            </div>
                            {topProducts.map((p, i) => (
                                <div
                                    key={p.name}
                                    className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition items-center"
                                >
                                    <div className="col-span-2 flex items-center gap-3">
                                        <span
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold`}
                                            style={{ backgroundColor: COLORS[i] + "33", color: COLORS[i] }}
                                        >
                                            {i + 1}
                                        </span>
                                        <span className="font-medium truncate">{p.name}</span>
                                    </div>
                                    <span className="text-gray-300">{p.units}</span>
                                    <span className="text-emerald-400 font-semibold">
                                        ₹{p.revenue.toLocaleString("en-IN")}
                                    </span>
                                    <span className={p.profit >= 0 ? "text-teal-400 font-semibold" : "text-red-400 font-semibold"}>
                                        ₹{p.profit.toLocaleString("en-IN")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Full Sales Table */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">🧾 All Transactions</h2>
                            <span className="text-gray-500 text-sm">{sales.length} records</span>
                        </div>
                        <div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-widest">
                            <span className="col-span-2">Product</span>
                            <span>Customer</span>
                            <span>Qty</span>
                            <span>Amount</span>
                            <span>Status</span>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {sales.map((sale) => {
                                const cost = (sale.products?.cost_price ?? 0) * sale.quantity;
                                const profit = sale.total_amount - cost;
                                return (
                                    <div
                                        key={sale.id}
                                        className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition items-center"
                                    >
                                        <div className="col-span-2">
                                            <p className="font-medium text-sm">
                                                {sale.products?.name ?? "Unknown"}
                                            </p>
                                            <p className="text-gray-600 text-xs">
                                                {new Date(sale.sale_date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                        <span className="text-gray-400 text-sm">
                                            {sale.customers?.name ?? "Walk-in"}
                                        </span>
                                        <span className="text-gray-300 text-sm">{sale.quantity}</span>
                                        <div>
                                            <p className="text-emerald-400 font-semibold text-sm">
                                                ₹{sale.total_amount.toLocaleString("en-IN")}
                                            </p>
                                            <p className={`text-xs ${profit >= 0 ? "text-teal-500" : "text-red-500"}`}>
                                                {profit >= 0 ? "+" : ""}₹{profit.toLocaleString("en-IN")} profit
                                            </p>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full border w-fit ${sale.payment_status === "paid"
                                                    ? "bg-emerald-900/30 border-emerald-700 text-emerald-300"
                                                    : "bg-yellow-900/30 border-yellow-700 text-yellow-300"
                                                }`}
                                        >
                                            {sale.payment_status === "paid" ? "Paid" : "Credit"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}