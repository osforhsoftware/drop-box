import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { maxPurchasableQuantity } from "../constants/templateProducts";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("form_cart") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("form_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item) => {
    setCartItems((prev) => {
      // Check if similar item exists (same design, brand, model, template)
      const existing = prev.find(
        (i) =>
          i.product.id === item.product.id &&
          i.brand.id === item.brand.id &&
          i.model.id === item.model.id &&
          i.design_url === item.design_url &&
          i.template_product_id === item.template_product_id &&
          (i.case_color || null) === (item.case_color || null)
      );

      const addQty = item.quantity || 1;
      const maxQty = item.template_product
        ? maxPurchasableQuantity(item.template_product, item.model?.name)
        : 99;

      if (existing) {
        const nextQty = existing.quantity + addQty;
        if (item.template_product && (maxQty <= 0 || nextQty > maxQty)) {
          toast.error(maxQty <= 0 ? "This material is out of stock" : `Only ${maxQty} available for this material`);
          return prev.map((i) => (i === existing ? { ...i, quantity: Math.max(i.quantity, maxQty) } : i));
        }
        toast.success("Item quantity increased in cart");
        return prev.map((i) =>
          i === existing ? { ...i, quantity: nextQty } : i
        );
      }

      if (item.template_product && (maxQty <= 0 || addQty > maxQty)) {
        toast.error(maxQty <= 0 ? "This material is out of stock" : `Only ${maxQty} available for this material`);
        return prev;
      }

      toast.success("Added to cart");
      return [
        ...prev,
        {
          ...item,
          cart_id: crypto.randomUUID(),
          quantity: item.quantity || 1,
        },
      ];
    });
  };

  const updateQuantity = (cartId, quantity) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((i) => {
        if (i.cart_id !== cartId) return i;
        const maxQty = i.template_product
          ? maxPurchasableQuantity(i.template_product, i.model?.name)
          : 99;
        if (maxQty > 0 && quantity > maxQty) {
          toast.error(`Only ${maxQty} available for this material`);
          return { ...i, quantity: maxQty };
        }
        return { ...i, quantity };
      })
    );
  };

  const removeFromCart = (cartId) => {
    setCartItems((prev) => prev.filter((i) => i.cart_id !== cartId));
    toast.success("Item removed from cart");
  };

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, updateQuantity, removeFromCart, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
