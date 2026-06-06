import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Plus, Trash2 } from "lucide-react";

export default function AdminCatalog() {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const loadAll = async () => {
    const [b, p] = await Promise.all([api.get("/brands"), api.get("/products")]);
    setBrands(b.data); setProducts(p.data);
  };
  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (selectedBrand) api.get(`/models?brand_id=${selectedBrand.id}`).then((r) => setModels(r.data));
    else setModels([]);
  }, [selectedBrand]);

  const addBrand = async () => {
    const name = prompt("Brand name?"); if (!name) return;
    await api.post("/brands", { name }); loadAll();
  };
  const delBrand = async (id) => {
    if (!confirm("Delete brand and its models?")) return;
    await api.delete(`/brands/${id}`); setSelectedBrand(null); loadAll();
  };
  const addModel = async () => {
    if (!selectedBrand) return;
    const name = prompt("Model name?"); if (!name) return;
    await api.post("/models", { brand_id: selectedBrand.id, name });
    api.get(`/models?brand_id=${selectedBrand.id}`).then((r) => setModels(r.data));
  };
  const delModel = async (id) => {
    await api.delete(`/models/${id}`);
    api.get(`/models?brand_id=${selectedBrand.id}`).then((r) => setModels(r.data));
  };
  const addProduct = async () => {
    const name = prompt("Case type name?"); if (!name) return;
    const price = parseFloat(prompt("Price (₹)?") || "0");
    const description = prompt("Description?") || "";
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await api.post("/products", { name, slug, price, description }); loadAll();
  };
  const delProduct = async (id) => {
    if (!confirm("Delete case type?")) return;
    await api.delete(`/products/${id}`); loadAll();
  };

  return (
    <div data-testid="admin-catalog">
      <div className="label-eyebrow">Catalog</div>
      <h1 className="font-display text-3xl mt-2 mb-6">Brands, Models & Products</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-xl p-5">
          <Header title="Brands" onAdd={addBrand} testid="add-brand" />
          <div className="space-y-2 mt-4">
            {brands.map((b) => (
              <div key={b.id} onClick={() => setSelectedBrand(b)}
                data-testid={`brand-row-${b.id}`}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer ${selectedBrand?.id === b.id ? "bg-[#ff4f00]/10 border border-[#ff4f00]/30":"hover:bg-white/[0.04]"}`}>
                <span className="text-sm">{b.name}</span>
                <button onClick={(e) => { e.stopPropagation(); delBrand(b.id); }} className="text-white/40 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <Header title={selectedBrand ? `${selectedBrand.name} Models` : "Models"} onAdd={addModel} testid="add-model" disabled={!selectedBrand} />
          <div className="space-y-2 mt-4">
            {!selectedBrand && <div className="text-white/40 text-sm">Pick a brand to view models.</div>}
            {models.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04]">
                <span className="text-sm">{m.name}</span>
                <button onClick={() => delModel(m.id)} className="text-white/40 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <Header title="Case Types" onAdd={addProduct} testid="add-product" />
          <div className="space-y-2 mt-4">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04]">
                <div>
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-white/40">₹{p.price}</div>
                </div>
                <button onClick={() => delProduct(p.id)} className="text-white/40 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ title, onAdd, testid, disabled }) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-display text-lg">{title}</div>
      <button data-testid={testid} disabled={disabled} onClick={onAdd}
        className={`p-1.5 rounded-md ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-white/[0.06]"}`}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
