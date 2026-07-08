"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBizStore } from "@/store/useBizStore";
import Link from "next/link";

export default function InventoryPage() {
    const { products, setProducts, setBusiness } = useBizStore();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [restockId, setRestockId] = useState<string | null>(null);
    const [restockQty, setRestockQty] = useState("");
    const [restockLoading, setRestockLoading] = useState(false);
    const [bizId, setBizId] = useState("");

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
                setBizId(biz.id);

                const { data: prods } = await supabase
                    .from("products")
                    .select("*")
                    .eq("business_id", biz.id)
                    .order("created_at", { ascending: false });

                if (prods) setProducts(prods);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleRestock(productId: string) {
        if (!restockQty || parseInt(restockQty) <= 0) return;

        setRestockLoading(true);
        const supabase = createClient();

        const product = products.find((p) => p.id === productId);
        if (!product) return;

        const newQty = product.stock_quantity + parseInt(restockQty);

        const { error } = await supabase
            .from("products")
            .update({ stock_quantity: newQty })
            .eq("id", productId);

        if (!error) {
            // Update local state instantly
            setProducts(
                products.map((p) =>
                    p.id === productId ? { ...p, stock_quantity: newQty } : p
                )
            );
            setRestockId(null);
            setRestockQty("");
        }
        setRestockLoading(false);
    }

    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    const lowStockItems = products.filter(
        (p) => p.stock_quantity <= p.low_stock_threshold
    );
    const outOfStockItems = products.filter((p) => p.stock_quantity === 0);

    return (
        <div className="px-8 py-10 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">📦 Inventory</h1>
                    <p className="text-gray-400 mt-1">
                        {products.length} products •{" "}
                        {lowStockItems.length > 0 && (
                            <span className="text-red-400">
                                {lowStockItems.length} low stock
                            </span>
                        )}
                    </p>
                </div>
                <Link
                    href="/dashboard/inventory/new"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
                >
                    + Add Product
                </Link>
            </div>

            {/* Out of Stock Alert */}
            {outOfStockItems.length > 0 && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-2xl px-5 py-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🚨</span>
                        <div>
                            <p className="text-red-300 font-semibold">
                                {outOfStockItems.length} item{outOfStockItems.length > 1 ? "s" : ""} out of stock!
                            </p>
                            <p className="text-red-400/70 text-sm">
                                These products cannot be sold until restocked.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {outOfStockItems.map((p) => (
                            <span
                                key={p.id}
                                className="text-xs bg-red-900/30 border border-red-800 text-red-300 px-3 py-1 rounded-full"
                            >
                                {p.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && outOfStockItems.length === 0 && (
                <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-2xl px-5 py-4 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="text-yellow-300 font-semibold">
                            {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} running low
                        </p>
                        <p className="text-yellow-400/70 text-sm">
                            Reorder soon to avoid stockouts.
                        </p>
                    </div>
                </div>
            )}

            {/* Search */}
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 max-w-sm"
            />

            {/* Products */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-16"
                        />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 flex flex-col items-center gap-4">
                    <span className="text-5xl">📦</span>
                    <p className="text-gray-400 text-lg font-medium">No products yet</p>
                    <Link
                        href="/dashboard/inventory/new"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
                    >
                        Add your first product
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtered.map((product) => {
                        const isOut = product.stock_quantity === 0;
                        const isLow =
                            product.stock_quantity <= product.low_stock_threshold &&
                            product.stock_quantity > 0;
                        const isRestocking = restockId === product.id;

                        return (
                            <div
                                key={product.id}
                                className={`bg-gray-900 border rounded-2xl p-5 transition flex flex-col gap-3
                  ${isOut
                                        ? "border-red-800/70"
                                        : isLow
                                            ? "border-yellow-800/70"
                                            : "border-gray-800"
                                    }`}
                            >
                                {/* Product Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{product.name}</p>
                                            {isOut && (
                                                <span className="text-xs bg-red-900/40 border border-red-800 text-red-300 px-2 py-0.5 rounded-full">
                                                    Out of Stock
                                                </span>
                                            )}
                                            {isLow && (
                                                <span className="text-xs bg-yellow-900/40 border border-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full">
                                                    Low Stock
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs">
                                            {product.category || "No category"} •
                                            Cost: ₹{product.cost_price} •
                                            Selling: ₹{product.selling_price}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Stock count */}
                                        <div className="text-right">
                                            <p
                                                className={`text-xl font-bold ${isOut
                                                        ? "text-red-400"
                                                        : isLow
                                                            ? "text-yellow-400"
                                                            : "text-gray-300"
                                                    }`}
                                            >
                                                {product.stock_quantity}
                                            </p>
                                            <p className="text-gray-600 text-xs">in stock</p>
                                        </div>

                                        {/* Restock Button */}
                                        {(isOut || isLow) && (
                                            <button
                                                onClick={() => {
                                                    setRestockId(isRestocking ? null : product.id);
                                                    setRestockQty("");
                                                }}
                                                className={`text-sm px-4 py-2 rounded-xl font-semibold transition border
                          ${isRestocking
                                                        ? "bg-gray-800 border-gray-600 text-gray-400"
                                                        : isOut
                                                            ? "bg-red-600 hover:bg-red-500 border-red-500 text-white"
                                                            : "bg-yellow-600 hover:bg-yellow-500 border-yellow-500 text-white"
                                                    }`}
                                            >
                                                {isRestocking ? "Cancel" : "🔄 Restock"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Restock Form — inline */}
                                {isRestocking && (
                                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
                                        <p className="text-sm text-gray-400">
                                            Current stock:{" "}
                                            <span className="font-semibold text-white">
                                                {product.stock_quantity} units
                                            </span>
                                        </p>
                                        <div className="flex gap-3 items-center">
                                            <input
                                                type="number"
                                                min="1"
                                                value={restockQty}
                                                onChange={(e) => setRestockQty(e.target.value)}
                                                placeholder="How many units to add?"
                                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleRestock(product.id)}
                                                disabled={restockLoading || !restockQty}
                                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
                                            >
                                                {restockLoading ? "Updating..." : "Confirm Restock"}
                                            </button>
                                        </div>

                                        {/* Quick quantity buttons */}
                                        <div className="flex gap-2">
                                            {[5, 10, 20, 50, 100].map((qty) => (
                                                <button
                                                    key={qty}
                                                    onClick={() => setRestockQty(qty.toString())}
                                                    className="text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    +{qty}
                                                </button>
                                            ))}
                                        </div>

                                        {restockQty && (
                                            <p className="text-emerald-400 text-sm">
                                                New stock after restock:{" "}
                                                <span className="font-bold">
                                                    {product.stock_quantity + parseInt(restockQty || "0")} units
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}