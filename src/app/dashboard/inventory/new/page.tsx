"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const categories = [
    "Clothing", "Electronics", "Food & Grocery", "Medicine",
    "Beauty & Personal Care", "Home & Kitchen", "Stationery",
    "Raw Materials", "Other"
];

export default function AddProductPage() {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [sellingPrice, setSellingPrice] = useState("");
    const [stockQuantity, setStockQuantity] = useState("");
    const [lowStockThreshold, setLowStockThreshold] = useState("5");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleAdd() {
        if (!name || !sellingPrice || !stockQuantity) {
            setError("Product name, selling price and stock quantity are required.");
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

        const { error } = await supabase.from("products").insert({
            business_id: biz.id,
            name,
            category,
            cost_price: parseFloat(costPrice) || 0,
            selling_price: parseFloat(sellingPrice),
            stock_quantity: parseInt(stockQuantity),
            low_stock_threshold: parseInt(lowStockThreshold) || 5,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push("/dashboard/inventory");
        }
    }

    return (
        <div className="px-8 py-10 max-w-2xl flex flex-col gap-6">
            {/* Header */}
            <div>
                <Link
                    href="/dashboard/inventory"
                    className="text-sm text-gray-500 hover:text-emerald-400 transition"
                >
                    ← Back to Inventory
                </Link>
                <h1 className="text-3xl font-bold mt-3">Add Product</h1>
                <p className="text-gray-400 mt-1">Add a new product to your inventory.</p>
            </div>

            {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                    {error}
                </p>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
                {/* Name */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">
                        Product Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Blue Silk Saree"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                        <option value="">Select category...</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Cost Price (₹)</label>
                        <input
                            type="number"
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            placeholder="0"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">
                            Selling Price (₹) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            value={sellingPrice}
                            onChange={(e) => setSellingPrice(e.target.value)}
                            placeholder="0"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">
                            Stock Quantity <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            value={stockQuantity}
                            onChange={(e) => setStockQuantity(e.target.value)}
                            placeholder="0"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">
                            Low Stock Alert At
                        </label>
                        <input
                            type="number"
                            value={lowStockThreshold}
                            onChange={(e) => setLowStockThreshold(e.target.value)}
                            placeholder="5"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* Profit Preview */}
                {costPrice && sellingPrice && (
                    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-4 py-3">
                        <p className="text-emerald-300 text-sm">
                            Profit per unit:{" "}
                            <span className="font-bold">
                                ₹{(parseFloat(sellingPrice) - parseFloat(costPrice)).toLocaleString("en-IN")}
                            </span>
                            {" "}
                            ({Math.round(((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(sellingPrice)) * 100)}% margin)
                        </p>
                    </div>
                )}
            </div>

            <button
                onClick={handleAdd}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-900/30"
            >
                {loading ? "Adding product..." : "Add to Inventory →"}
            </button>
        </div>
    );
}