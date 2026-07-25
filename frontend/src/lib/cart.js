import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

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

      if (existing) {
        toast.success("Item quantity increased in cart");
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
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
      prev.map((i) => (i.cart_id === cartId ? { ...i, quantity } : i))
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
