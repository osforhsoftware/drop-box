import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "../lib/cart";
import { resolveMediaUrl } from "../lib/api";
import { replaceDraft } from "../lib/draft";
import { formatPrice } from "../constants/templateProducts";
import { SHIPPING_FEE } from "../constants/shipping";

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const [selectedItems, setSelectedItems] = useState(
    cartItems.reduce((acc, item) => ({ ...acc, [item.cart_id]: true }), {})
  );

  useEffect(() => {
    setSelectedItems((prev) =>
      cartItems.reduce(
        (acc, item) => ({ ...acc, [item.cart_id]: prev[item.cart_id] ?? true }),
        {}
      )
    );
  }, [cartItems]);

  const toggleSelect = (cartId) => {
    setSelectedItems((prev) => ({ ...prev, [cartId]: !prev[cartId] }));
  };

  const handleCheckout = () => {
    const itemsToCheckout = cartItems.filter((i) => selectedItems[i.cart_id]);
    if (itemsToCheckout.length === 0) return;

    replaceDraft({
      source: "cart",
      items: itemsToCheckout,
    });
    navigate("/checkout");
  };

  const selectedLineCount = cartItems.filter((i) => selectedItems[i.cart_id]).length;
  const totalItemCount = cartItems.length;
  const subtotal = cartItems
    .filter((i) => selectedItems[i.cart_id])
    .reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const total = subtotal + SHIPPING_FEE;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-8 h-8 text-white/40" />
        </div>
        <h2 className="font-display text-3xl">Your cart is empty</h2>
        <p className="text-white/60 mt-4 mb-8">
          Looks like you haven't added any designs to your cart yet.
        </p>
        <Link to="/shop" className="btn-primary">
          Browse Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="label-eyebrow">Shopping Cart</div>
      <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl mt-3 mb-6 sm:mb-10">Review items</h1>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-16">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 px-1 sm:px-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLineCount === cartItems.length && cartItems.length > 0}
                onChange={(e) => {
                  const val = e.target.checked;
                  setSelectedItems(
                    cartItems.reduce((acc, item) => ({ ...acc, [item.cart_id]: val }), {})
                  );
                }}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-brand focus:ring-brand"
              />
              <span className="text-sm text-white/60">Select All</span>
            </label>
            <span className="text-sm text-white/60">{totalItemCount} items</span>
          </div>

          {cartItems.map((item) => (
            <div
              key={item.cart_id}
              className="glass rounded-2xl p-3 sm:p-4 flex flex-row gap-3 sm:gap-4 items-start"
            >
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={!!selectedItems[item.cart_id]}
                  onChange={() => toggleSelect(item.cart_id)}
                  className="absolute -top-1 -left-1 z-10 w-4 h-4 rounded bg-black/60 border-white/20 text-brand focus:ring-brand backdrop-blur-sm"
                />
                <div className="w-14 h-[4.25rem] sm:w-20 sm:h-24 max-h-24 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                  <img
                    src={resolveMediaUrl(item.preview_url || item.design_url)}
                    alt="Design Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-start gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm sm:text-lg text-white line-clamp-2">
                      {item.template_product?.title || item.product.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/50 mt-0.5 sm:mt-1 truncate">
                      {item.brand.name} • {item.model.name}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.cart_id)}
                    className="p-1.5 sm:p-2 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 glass-2 rounded-lg p-0.5 sm:p-1 border border-white/10">
                    <button
                      onClick={() => updateQuantity(item.cart_id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-1 sm:p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded disabled:opacity-30"
                    >
                      <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <span className="w-5 sm:w-6 text-center text-xs sm:text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cart_id, item.quantity + 1)}
                      className="p-1 sm:p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>

                  <div className="font-mono text-sm sm:text-lg text-brand flex-shrink-0">
                    {formatPrice(item.product.price * item.quantity)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="glass rounded-2xl p-6 lg:p-8 sticky top-24">
            <h3 className="font-display text-2xl mb-6">Order Summary</h3>

            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between text-white/60">
                <span>Selected Items ({selectedLineCount})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Shipping</span>
                <span>{formatPrice(SHIPPING_FEE)}</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between font-medium text-lg text-white">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={selectedLineCount === 0}
              className="btn-primary w-full flex justify-center items-center gap-2 text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
