"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [businessName, setBusinessName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        async function getBusiness() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from("businesses")
                .select("business_name, owner_name")
                .eq("user_id", user.id)
                .single();
            if (data) {
                setBusinessName(data.business_name);
                setOwnerName(data.owner_name);
            }
        }
        getBusiness();
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }


    const navLinks = [
        { href: "/dashboard", label: "🏠 Home" },
        { href: "/dashboard/inventory", label: "📦 Inventory" },
        { href: "/dashboard/sales", label: "💰 Sales" },
        { href: "/dashboard/khata", label: "📒 Khata" },
        { href: "/dashboard/assistant", label: "🤖 AI Assistant" },
        { href: "/dashboard/report", label: "📊 Reports" },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-800 flex flex-col fixed h-full bg-gray-950">
                {/* Logo */}
                <div className="px-6 py-5 border-b border-gray-800">
                    <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        BizPulse
                    </span>
                    {businessName && (
                        <p className="text-gray-400 text-xs mt-1 truncate">{businessName}</p>
                    )}
                </div>

                {/* Nav Links */}
                <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-4 py-2.5 rounded-xl text-sm transition
                ${pathname === link.href
                                    ? "bg-emerald-600/20 text-emerald-300 font-medium"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="px-4 py-4 border-t border-gray-800 flex flex-col gap-2">
                    {ownerName && (
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
                                {ownerName[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-300 truncate">{ownerName}</span>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-red-400 hover:bg-red-900/10 px-4 py-2 rounded-lg transition text-left"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 min-h-screen">
                {children}
            </main>
        </div>
    );
}