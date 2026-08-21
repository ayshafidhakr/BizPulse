import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface SaleProduct {
  name: string;
  cost_price: number;
}

interface Sale {
  total_amount: number;
  quantity: number;
  sale_date: string;
  payment_status: string;
  products: SaleProduct[];
}

interface Payment {
  amount: number;
  payment_date: string;
  customers: { name: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get business
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Fetch all relevant data
    const [productsRes, salesRes, customersRes, paymentsRes] =
      await Promise.all([
        supabase
          .from("products")
          .select("name, category, cost_price, selling_price, stock_quantity, low_stock_threshold")
          .eq("business_id", business.id),

        supabase
          .from("sales")
          .select("total_amount, quantity, payment_status, sale_date, products(name, cost_price)")
          .eq("business_id", business.id)
          .order("sale_date", { ascending: false })
          .limit(100),

        supabase
          .from("customers")
          .select("name, phone, total_credit")
          .eq("business_id", business.id),

        supabase
          .from("payments")
          .select("amount, payment_date, customers(name)")
          .eq("business_id", business.id)
          .order("payment_date", { ascending: false })
          .limit(50),
      ]);

    const products = productsRes.data ?? [];
    const sales = salesRes.data ?? [];
    const customers = customersRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    // Build computed summary
    const totalRevenue = sales.reduce((s, r) => s + r.total_amount, 0);
    const totalCost = sales.reduce(
      (s, r) => s + (r.products?.[0]?.cost_price ?? 0) * r.quantity,
      0
    );
    const totalProfit = totalRevenue - totalCost;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(
      (s) => new Date(s.sale_date) >= today
    );
    const todayRevenue = todaySales.reduce(
      (s, r) => s + r.total_amount, 0
    );

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSales = sales.filter(
      (s) => new Date(s.sale_date) >= weekAgo
    );
    const weekRevenue = weekSales.reduce(
      (s, r) => s + r.total_amount, 0
    );

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthSales = sales.filter(
      (s) => new Date(s.sale_date) >= monthAgo
    );
    const monthRevenue = monthSales.reduce(
      (s, r) => s + r.total_amount, 0
    );

    const lowStockItems = products.filter(
      (p) => p.stock_quantity <= p.low_stock_threshold
    );
    const outOfStockItems = products.filter(
      (p) => p.stock_quantity === 0
    );

    const totalCreditPending = customers.reduce(
      (s, c) => s + c.total_credit, 0
    );
    const customersWithCredit = customers.filter(
      (c) => c.total_credit > 0
    );

    // Product sales frequency
    const productSalesMap: Record<string, number> = {};
    sales.forEach((s: Sale) => {
      const name = s.products?.[0]?.name ?? "Unknown";
      productSalesMap[name] = (productSalesMap[name] ?? 0) + s.quantity;
    });
    const topSellingProducts = Object.entries(productSalesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => `${name} (${qty} units sold)`);

    // Build the context
    const context = `
You are BizPulse AI, a smart business assistant for ${business.business_name} (${business.business_type}).
Owner: ${business.owner_name}
Today's date: ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

=== BUSINESS SUMMARY ===
Total Revenue (all time): ₹${totalRevenue.toLocaleString("en-IN")}
Total Cost (all time): ₹${totalCost.toLocaleString("en-IN")}
Total Profit (all time): ₹${totalProfit.toLocaleString("en-IN")}
Today's Revenue: ₹${todayRevenue.toLocaleString("en-IN")} (${todaySales.length} sales)
This Week's Revenue: ₹${weekRevenue.toLocaleString("en-IN")} (${weekSales.length} sales)
This Month's Revenue: ₹${monthRevenue.toLocaleString("en-IN")} (${monthSales.length} sales)
Total Transactions: ${sales.length}

=== INVENTORY ===
Total Products: ${products.length}
Low Stock Items (${lowStockItems.length}): ${lowStockItems.map((p) => `${p.name} (${p.stock_quantity} left)`).join(", ") || "None"}
Out of Stock Items (${outOfStockItems.length}): ${outOfStockItems.map((p) => p.name).join(", ") || "None"}
All Products:
${products.map((p) => `- ${p.name}: ₹${p.selling_price} selling price, ₹${p.cost_price} cost, ${p.stock_quantity} in stock`).join("\n")}

=== TOP SELLING PRODUCTS ===
${topSellingProducts.join("\n") || "No sales yet"}

=== KHATA / CREDIT ===
Total Credit Pending: ₹${totalCreditPending.toLocaleString("en-IN")}
Customers with Pending Credit (${customersWithCredit.length}):
${customersWithCredit.map((c) => `- ${c.name}: ₹${c.total_credit.toLocaleString("en-IN")} pending ${c.phone ? `(${c.phone})` : ""}`).join("\n") || "None"}
All Customers: ${customers.length}

=== RECENT SALES (Last 10) ===
${sales.slice(0, 10).map((s: Sale) => `- ${s.products?.[0]?.name ?? "Unknown"}: ₹${s.total_amount} (${s.payment_status}) on ${new Date(s.sale_date).toLocaleDateString("en-IN")}`).join("\n") || "No sales yet"}
=== RECENT PAYMENTS RECEIVED ===
${payments.slice(0, 5).map((p: Payment) => `- ${p.customers?.[0]?.name ?? "Unknown"}: ₹${p.amount} on ${new Date(p.payment_date).toLocaleDateString("en-IN")}`).join("\n") || "No payments yet"}
`;

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: `${context}

Answer the owner's questions about their business using the data above.
Be concise and friendly. Use ₹ for currency.
Use **bold** for important numbers and names.
Use bullet points for lists.
Keep answers short — 2-4 sentences for simple questions, bullet list for comparisons.
Never say you are an AI language model — you are BizPulse AI.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    const answer =
      response.choices[0]?.message?.content ?? "Sorry, I couldn't answer that.";

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("Assistant error:", error);
    return NextResponse.json(
      { error: "Failed to get answer" },
      { status: 500 }
    );
  }
}