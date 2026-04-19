import { supabase } from "@/app/lib/database";

export default async function Home() {
  const { data: products, error } = await supabase.from("products").select("*");

  return (
    <div>{products?.map((product) =>(<li key={product.id} className="border p-3 rounded-lg shadow-sm">
            <h2 className="font-bold">{product.name}</h2>
            <p className="text-sm text-gray-600">{product.stock}</p>
          </li>
        ))}</div>
  );
}
