import { create } from "zustand";

interface Business {
    id: string;
    business_name: string;
    owner_name: string;
    business_type: string;
    phone: string;
}

interface Product {
    id: string;
    business_id: string;
    name: string;
    category: string;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    low_stock_threshold: number;
    created_at: string;
}

interface BizStore {
    business: Business | null;
    setBusiness: (b: Business) => void;
    products: Product[];
    setProducts: (p: Product[]) => void;
}

export const useBizStore = create<BizStore>((set) => ({
    business: null,
    setBusiness: (b) => set({ business: b }),
    products: [],
    setProducts: (p) => set({ products: p }),
}));