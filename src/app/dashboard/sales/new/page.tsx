"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
    id: string;
    name: string;
    selling_price: number;
    stock_quantity: number;
}

interface Customer {
    id: string;
    name: string;
    total_credit: number;
}

export default function NewSalePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [paymentStatus, setPaymentStatus] = useState("paid");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [bizId, setBizId] = useState("");
    const [saleDate, setSaleDate] = useState("");

    // New customer inline form
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [customerError, setCustomerError] = useState("");

    const router = useRouter();

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
            setBizId(biz.id);

            const { data: prods } = await supabase
                .from("products")
                .select("id, name, selling_price, stock_quantity")
                .eq("business_id", biz.id)
                .gt("stock_quantity", 0)
                .order("name");

            const { data: custs } = await supabase
                .from("customers")
                .select("id, name, total_credit")
                .eq("business_id", biz.id)
                .order("name");

            if (prods) setProducts(prods);
            if (custs) setCustomers(custs);
        }
        load();
    }, []);

    const selectedProductData = products.find((p) => p.id === selectedProduct);
    const totalAmount = selectedProductData
        ? selectedProductData.selling_price * parseInt(quantity || "1")
        : 0;

    async function handleCreateCustomer() {
        if (!newCustomerName.trim()) {
            setCustomerError("Customer name is required.");
            return;
        }

        setCreatingCustomer(true);
        setCustomerError("");

        const supabase = createClient();

        const { data, error } = await supabase
            .from("customers")
            .insert({
                business_id: bizId,
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim(),
                total_credit: 0,
            })
            .select()
            .single();

        if (error) {
            setCustomerError(error.message);
            setCreatingCustomer(false);
            return;
        }

        if (data) {
            // Add to local list and auto select
            setCustomers((prev) => [...prev, data]);
            setSelectedCustomer(data.id);
            setShowNewCustomer(false);
            setNewCustomerName("");
            setNewCustomerPhone("");
        }

        setCreatingCustomer(false);
    }

    async function handleSale() {
        if (!selectedProduct || !quantity) {
            setError("Please select a product and quantity.");
            return;
        }

        if (
            selectedProductData &&
            parseInt(quantity) > selectedProductData.stock_quantity
        ) {
            setError(
                `Only ${selectedProductData.stock_quantity} units available in stock.`
            );
            return;
        }

        if (paymentStatus === "credit" && !selectedCustomer) {
            setError("Please select or create a customer for credit sales.");
            return;
        }

        setLoading(true);
        setError("");

        const supabase = createClient();

        // Step 1 — Record the sale
        const { error: saleError } = await supabase.from("sales").insert({
            business_id: bizId,
            product_id: selectedProduct,
            customer_id: selectedCustomer || null,
            quantity: parseInt(quantity),
            total_amount: totalAmount,
            payment_status: paymentStatus,
            sale_date: saleDate ? new Date(saleDate).toISOString() : new Date().toISOString(),
        });

        if (saleError) {
            setError(saleError.message);
            setLoading(false);
            return;
        }

        // Step 2 — Deduct stock
        const { error: stockError } = await supabase
            .from("products")
            .update({
                stock_quantity:
                    selectedProductData!.stock_quantity - parseInt(quantity),
            })
            .eq("id", selectedProduct);

        if (stockError) {
            setError(stockError.message);
            setLoading(false);
            return;
        }

        // Step 3 — Update credit if khata sale
        if (paymentStatus === "credit" && selectedCustomer) {
            const currentCustomer = customers.find((c) => c.id === selectedCustomer);
            const currentCredit = currentCustomer?.total_credit ?? 0;

            await supabase
                .from("customers")
                .update({ total_credit: currentCredit + totalAmount })
                .eq("id", selectedCustomer);
        }

        router.push("/dashboard/sales");
    }

    return (
        <div className="px-8 py-10 max-w-2xl flex flex-col gap-6">
            {/* Header */}
            <div>
                <Link
                    href="/dashboard/sales"
                    className="text-sm text-gray-500 hover:text-emerald-400 transition"
                >
                    ← Back to Sales
                </Link>
                <h1 className="text-3xl font-bold mt-3">Record Sale</h1>
                <p className="text-gray-400 mt-1">Add a new sales transaction.</p>
            </div>

            {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                    {error}
                </p>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">

                {/* Product */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">
                        Product <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} — ₹{p.selling_price} ({p.stock_quantity} in stock)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quantity */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">
                        Quantity <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>

                {/* Payment Status */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-400">Payment</label>
                    <div className="flex gap-3">
                        {["paid", "credit"].map((status) => (
                            <button
                                key={status}
                                onClick={() => {
                                    setPaymentStatus(status);
                                    if (status === "paid") {
                                        setShowNewCustomer(false);
                                        setSelectedCustomer("");
                                    }
                                }}
                                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition border
                  ${paymentStatus === status
                                        ? status === "paid"
                                            ? "bg-emerald-600 border-emerald-500 text-white"
                                            : "bg-yellow-600 border-yellow-500 text-white"
                                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                                    }`}
                            >
                                {status === "paid" ? "✅ Paid" : "📒 Credit (Khata)"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Customer Section — only shown for credit */}
                {paymentStatus === "credit" && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-400">
                                Customer <span className="text-red-400">*</span>
                            </label>
                            <button
                                onClick={() => {
                                    setShowNewCustomer(!showNewCustomer);
                                    setSelectedCustomer("");
                                    setCustomerError("");
                                }}
                                className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-600 px-3 py-1 rounded-lg transition"
                            >
                                {showNewCustomer ? "← Select existing" : "+ Create new customer"}
                            </button>
                        </div>

                        {/* Existing customer dropdown */}
                        {!showNewCustomer && (
                            <select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                            >
                                <option value="">Select customer...</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                        {c.total_credit > 0
                                            ? ` — ₹${c.total_credit.toLocaleString("en-IN")} pending`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Inline new customer form */}
                        {showNewCustomer && (
                            <div className="bg-gray-800/50 border border-emerald-800/40 rounded-xl p-4 flex flex-col gap-3">
                                <p className="text-sm text-emerald-400 font-medium">
                                    🆕 Create New Customer
                                </p>

                                {customerError && (
                                    <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                                        {customerError}
                                    </p>
                                )}

                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={newCustomerName}
                                        onChange={(e) => setNewCustomerName(e.target.value)}
                                        placeholder="Customer name *"
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                                        autoFocus
                                    />
                                    <input
                                        type="tel"
                                        value={newCustomerPhone}
                                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                                        placeholder="Phone number (optional)"
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <button
                                    onClick={handleCreateCustomer}
                                    disabled={creatingCustomer || !newCustomerName.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg font-semibold text-sm transition"
                                >
                                    {creatingCustomer ? "Creating..." : "Create & Select Customer →"}
                                </button>
                            </div>
                        )}

                        {/* Show selected customer confirmation */}
                        {selectedCustomer && !showNewCustomer && (
                            <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-4 py-2.5 flex items-center gap-2">
                                <span className="text-emerald-400 text-sm">✓</span>
                                <p className="text-emerald-300 text-sm font-medium">
                                    {customers.find((c) => c.id === selectedCustomer)?.name}
                                </p>
                            </div>
                        )}

                        {selectedCustomer && showNewCustomer === false &&
                            (customers.find((c) => c.id === selectedCustomer)?.total_credit ?? 0) > 0 && (
                                <p className="text-yellow-400 text-xs">
                                    ⚠️ This customer already has ₹
                                    {customers
                                        .find((c) => c.id === selectedCustomer)
                                        ?.total_credit.toLocaleString("en-IN")}{" "}
                                    pending
                                </p>
                            )}
                    </div>
                )}

                {/* Custom Sale Date */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Sale Date & Time</label>
                        <span className="text-xs text-gray-600">
                            Leave empty to use current time
                        </span>
                    </div>
                    <input
                        type="datetime-local"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 16)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                    {saleDate && (
                        <div className="flex items-center justify-between">
                            <p className="text-emerald-400 text-xs">
                                ✓ Sale will be recorded for{" "}
                                {new Date(saleDate).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                            <button
                                onClick={() => setSaleDate("")}
                                className="text-xs text-gray-500 hover:text-gray-300 transition"
                            >
                                Reset to now
                            </button>
                        </div>
                    )}
                </div>

                {/* Total Preview */}
                {selectedProduct && (
                    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-4 py-3">
                        <p className="text-emerald-300 text-sm">
                            Total Amount:{" "}
                            <span className="font-bold text-lg">
                                ₹{totalAmount.toLocaleString("en-IN")}
                            </span>
                        </p>
                    </div>
                )}
            </div>

            <button
                onClick={handleSale}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-900/30"
            >
                {loading ? "Recording..." : "Record Sale →"}
            </button>
        </div>
    );
}