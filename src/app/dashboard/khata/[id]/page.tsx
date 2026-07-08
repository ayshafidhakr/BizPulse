"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Customer {
    id: string;
    name: string;
    phone: string;
    total_credit: number;
}

interface Sale {
    id: string;
    total_amount: number;
    quantity: number;
    sale_date: string;
    products: { name: string } | null;
}

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
}

export default function CustomerDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            const supabase = createClient();

            // Get customer
            const { data: cust } = await supabase
                .from("customers")
                .select("*")
                .eq("id", id)
                .single();

            if (cust) setCustomer(cust);

            // Get credit sales
            const { data: salesData } = await supabase
                .from("sales")
                .select("id, total_amount, quantity, sale_date, products(name)")
                .eq("customer_id", id)
                .eq("payment_status", "credit")
                .order("sale_date", { ascending: false });

            if (salesData) setSales(salesData as any);

            // Get payments
            const { data: paymentsData } = await supabase
                .from("payments")
                .select("*")
                .eq("customer_id", id)
                .order("payment_date", { ascending: false });

            if (paymentsData) setPayments(paymentsData);
        }
        load();
    }, [id]);

    async function handlePayment() {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setError("Please enter a valid payment amount.");
            return;
        }

        if (parseFloat(paymentAmount) > (customer?.total_credit ?? 0)) {
            setError("Payment cannot exceed the pending amount.");
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

        // Record payment
        const { error: payError } = await supabase.from("payments").insert({
            business_id: biz.id,
            customer_id: id,
            amount: parseFloat(paymentAmount),
        });

        if (payError) {
            setError(payError.message);
            setLoading(false);
            return;
        }

        // Reduce customer credit
        const { error: updateError } = await supabase
            .from("customers")
            .update({
                total_credit: (customer?.total_credit ?? 0) - parseFloat(paymentAmount),
            })
            .eq("id", id);

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        // Refresh
        setCustomer((prev) =>
            prev
                ? { ...prev, total_credit: prev.total_credit - parseFloat(paymentAmount) }
                : null
        );
        setPayments((prev) => [
            {
                id: Date.now().toString(),
                amount: parseFloat(paymentAmount),
                payment_date: new Date().toISOString(),
            },
            ...prev,
        ]);
        setPaymentAmount("");
        setLoading(false);
    }

    if (!customer) {
        return (
            <div className="px-8 py-10">
                <p className="text-gray-400">Loading...</p>
            </div>
        );
    }

    return (
        <div className="px-8 py-10 max-w-3xl flex flex-col gap-6">
            {/* Header */}
            <div>
                <Link
                    href="/dashboard/khata"
                    className="text-sm text-gray-500 hover:text-emerald-400 transition"
                >
                    ← Back to Khata
                </Link>
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center font-bold text-emerald-400 text-xl">
                            {customer.name[0].toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{customer.name}</h1>
                            <p className="text-gray-400 text-sm">{customer.phone || "No phone"}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-sm">Total Pending</p>
                        <p className={`text-3xl font-bold ${customer.total_credit > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                            ₹{customer.total_credit.toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Record Payment */}
            {customer.total_credit > 0 && (
                <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border border-emerald-800/50 rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">💳 Record Payment</h2>
                    {error && (
                        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={`Max ₹${customer.total_credit.toLocaleString("en-IN")}`}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold transition"
                        >
                            {loading ? "Saving..." : "Record Payment"}
                        </button>
                    </div>
                    {/* Quick amount buttons */}
                    <div className="flex gap-2 flex-wrap">
                        {[100, 500, 1000, customer.total_credit].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setPaymentAmount(amt.toString())}
                                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition"
                            >
                                ₹{amt.toLocaleString("en-IN")}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {customer.total_credit === 0 && (
                <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-5 flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <p className="text-emerald-300 font-medium">
                        All cleared! {customer.name} has no pending dues.
                    </p>
                </div>
            )}

            {/* Credit Sales */}
            {sales.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold text-gray-300">Credit Purchases</h2>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        {sales.map((sale) => (
                            <div
                                key={sale.id}
                                className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50"
                            >
                                <div>
                                    <p className="font-medium">{sale.products?.name ?? "Product"}</p>
                                    <p className="text-gray-500 text-xs">
                                        Qty: {sale.quantity} •{" "}
                                        {new Date(sale.sale_date).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                                <span className="text-yellow-400 font-semibold">
                                    ₹{sale.total_amount.toLocaleString("en-IN")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment History */}
            {payments.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold text-gray-300">Payment History</h2>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        {payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50"
                            >
                                <div>
                                    <p className="font-medium text-emerald-400">Payment received</p>
                                    <p className="text-gray-500 text-xs">
                                        {new Date(payment.payment_date).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                                <span className="text-emerald-400 font-semibold">
                                    + ₹{payment.amount.toLocaleString("en-IN")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}