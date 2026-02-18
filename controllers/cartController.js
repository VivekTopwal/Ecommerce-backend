
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const getCartQuery = (req) => {
  if (req.user) return { user: req.user._id };
  if (req.sessionId) return { sessionId: req.sessionId };
  return null;
};

export const getCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) return res.json({ success: true, cart: { items: [], totalAmount: 0 } });

    const cart = await Cart.findOne(query).populate("items.product");
    res.json({ success: true, cart: cart || { items: [], totalAmount: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isPublished) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.sessionId };

    let cart = await Cart.findOne(query);

    if (!cart) {
      cart = new Cart({
        ...(req.user ? { user: req.user._id } : { sessionId: req.sessionId }),
        items: [],
        totalAmount: 0,
        totalItems: 0,
      });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
         price: product.salePrice, 
        salePrice: product.salePrice,
        productPrice: product.productPrice,
      });
    }

    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.salePrice * item.quantity, 0
    );
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    await cart.save();
    await cart.populate("items.product");

    res.json({ success: true, message: "Added to cart", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const query = getCartQuery(req);
    if (!query) return res.status(400).json({ success: false, message: "No cart found" });

    const cart = await Cart.findOne(query);
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not in cart" });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.salePrice * item.quantity, 0
    );
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    await cart.save();
    await cart.populate("items.product");

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const query = getCartQuery(req);
    if (!query) return res.status(400).json({ success: false, message: "No cart found" });

    const cart = await Cart.findOne(query);
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.salePrice * item.quantity, 0
    );
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    await cart.save();
    await cart.populate("items.product");

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) return res.json({ success: true });

    await Cart.findOneAndUpdate(query, {
      $set: { items: [], totalAmount: 0, totalItems: 0 },
    });

    res.json({ success: true, message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const mergeCart = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.json({ success: true });

    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      return res.json({ success: true });
    }

    let userCart = await Cart.findOne({ user: req.user._id });

    if (!userCart) {
      guestCart.user = req.user._id;
      guestCart.sessionId = undefined;
      await guestCart.save();
      await guestCart.populate("items.product");
      return res.json({ success: true, cart: guestCart });
    }

    for (const guestItem of guestCart.items) {
      const existingIndex = userCart.items.findIndex(
        (item) => item.product.toString() === guestItem.product.toString()
      );

      if (existingIndex > -1) {
        userCart.items[existingIndex].quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    }

    userCart.totalAmount = userCart.items.reduce(
      (sum, item) => sum + item.salePrice * item.quantity, 0
    );
    userCart.totalItems = userCart.items.reduce(
      (sum, item) => sum + item.quantity, 0
    );

    await userCart.save();
    await Cart.deleteOne({ sessionId });
    await userCart.populate("items.product");

    res.json({ success: true, cart: userCart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};