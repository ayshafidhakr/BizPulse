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

interface SaleItem {
    productId: string;
    productName: string;
    sellingPrice: number;
    maxStock: number;
    quantity: number;
}

export default function NewSalePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("paid");
    const [saleDate, setSaleDate] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [bizId, setBizId] = useState("");

    // New customer
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

    // Add product to sale
    function handleAddItem() {
        if (!selectedProduct) return;

        const product = products.find((p) => p.id === selectedProduct);
        if (!product) return;

        // Check if already in list
        const exists = saleItems.find((i) => i.productId === selectedProduct);
        if (exists) {
            setError("This product is already added. Change the quantity below.");
            return;
        }

        setSaleItems((prev) => [
            ...prev,
            {
                productId: product.id,
                productName: product.name,
                sellingPrice: product.selling_price,
                maxStock: product.stock_quantity,
                quantity: 1,
            },
        ]);
        setSelectedProduct("");
        setError("");
    }

    function handleQtyChange(productId: string, qty: number) {
        setSaleItems((prev) =>
            prev.map((item) =>
                item.productId === productId
                    ? { ...item, quantity: Math.min(Math.max(1, qty), item.maxStock) }
                    : item
            )
        );
    }

    function handleRemoveItem(productId: string) {
        setSaleItems((prev) => prev.filter((i) => i.productId !== productId));
    }

    const totalAmount = saleItems.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0
    );

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
            setCustomers((prev) => [...prev, data]);
            setSelectedCustomer(data.id);
            setShowNewCustomer(false);
            setNewCustomerName("");
            setNewCustomerPhone("");
        }

        setCreatingCustomer(false);
    }

    async function handleSale() {
        if (saleItems.length === 0) {
            setError("Please add at least one product.");
            return;
        }

        if (paymentStatus === "credit" && !selectedCustomer) {
            setError("Please select or create a customer for credit sales.");
            return;
        }

        // Validate stock
        for (const item of saleItems) {
            if (item.quantity > item.maxStock) {
                setError(`Only ${item.maxStock} units of ${item.productName} available.`);
                return;
            }
        }

        setLoading(true);
        setError("");

        const supabase = createClient();
        const saleDateISO = saleDate
            ? new Date(saleDate).toISOString()
            : new Date().toISOString();

        // Insert all sale items
        for (const item of saleItems) {
            const { error: saleError } = await supabase.from("sales").insert({
                business_id: bizId,
                product_id: item.productId,
                customer_id: selectedCustomer || null,
                quantity: item.quantity,
                total_amount: item.sellingPrice * item.quantity,
                payment_status: paymentStatus,
                sale_date: saleDateISO,
            });

            if (saleError) {
                setError(saleError.message);
                setLoading(false);
                return;
            }

            // Deduct stock
            await supabase
                .from("products")
                .update({ stock_quantity: item.maxStock - item.quantity })
                .eq("id", item.productId);
        }

        // Update credit if khata
        if (paymentStatus === "credit" && selectedCustomer) {
            const customer = customers.find((c) => c.id === selectedCustomer);
            const currentCredit = customer?.total_credit ?? 0;
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
                <p className="text-gray-400 mt-1">Add one or more products to this sale.</p>
            </div>

            {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                    {error}
                </p>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">

                {/* Add Product Row */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-400 font-medium">Add Products</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                        >
                            <option value="">Select product...</option>
                            {products
                                .filter((p) => !saleItems.find((i) => i.productId === p.id))
                                .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — ₹{p.selling_price} ({p.stock_quantity} in stock)
                                    </option>
                                ))}
                        </select>
                        <button
                            onClick={handleAddItem}
                            disabled={!selectedProduct}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition"
                        >
                            + Add
                        </button>
                    </div>
                </div>

                {/* Sale Items List */}
                {saleItems.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400 font-medium">
                            Items in this sale ({saleItems.length})
                        </label>
                        <div className="flex flex-col gap-2">
                            {saleItems.map((item) => (
                                <div
                                    key={item.productId}
                                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3"
                                >
                                    {/* Product name */}
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.productName}</p>
                                        <p className="text-gray-500 text-xs">
                                            ₹{item.sellingPrice} each • max {item.maxStock}
                                        </p>
                                    </div>

                                    {/* Quantity controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleQtyChange(item.productId, item.quantity - 1)}
                                            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center font-bold transition"
                                        >
                                            −
                                        </button>
                                        <span className="w-8 text-center font-semibold text-sm">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => handleQtyChange(item.productId, item.quantity + 1)}
                                            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center font-bold transition"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Line total */}
                                    <span className="text-emerald-400 font-semibold text-sm w-20 text-right">
                                        ₹{(item.sellingPrice * item.quantity).toLocaleString("en-IN")}
                                    </span>

                                    {/* Remove */}
                                    <button
                                        onClick={() => handleRemoveItem(item.productId)}
                                        className="text-gray-600 hover:text-red-400 transition text-lg leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
                            <span className="text-gray-400 text-sm">
                                {saleItems.reduce((s, i) => s + i.quantity, 0)} items total
                            </span>
                            <span className="text-emerald-300 font-bold text-lg">
                                ₹{totalAmount.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>
                )}

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

                {/* Customer — only for credit */}
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

                        {showNewCustomer && (
                            <div className="bg-gray-800/50 border border-emerald-800/40 rounded-xl p-4 flex flex-col gap-3">
                                <p className="text-sm text-emerald-400 font-medium">🆕 Create New Customer</p>
                                {customerError && (
                                    <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                                        {customerError}
                                    </p>
                                )}
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
                                <button
                                    onClick={handleCreateCustomer}
                                    disabled={creatingCustomer || !newCustomerName.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg font-semibold text-sm transition"
                                >
                                    {creatingCustomer ? "Creating..." : "Create & Select Customer →"}
                                </button>
                            </div>
                        )}

                        {selectedCustomer && !showNewCustomer && (
                            <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-4 py-2.5 flex items-center gap-2">
                                <span className="text-emerald-400 text-sm">✓</span>
                                <p className="text-emerald-300 text-sm font-medium">
                                    {customers.find((c) => c.id === selectedCustomer)?.name}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Custom Sale Date */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Sale Date & Time</label>
                        <span className="text-xs text-gray-600">Leave empty to use current time</span>
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
                                ✓ Recording for{" "}
                                {new Date(saleDate).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "long", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
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
            </div>

            <button
                onClick={handleSale}
                disabled={loading || saleItems.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-900/30"
            >
                {loading
                    ? "Recording..."
                    : `Record Sale${saleItems.length > 0 ? ` — ₹${totalAmount.toLocaleString("en-IN")}` : ""} →`}
            </button>
        </div>
    );
}