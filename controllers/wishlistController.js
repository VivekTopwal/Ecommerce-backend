import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";


export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        products: [],
      });
    }


    if (wishlist.products.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    wishlist.products.push(productId);
    await wishlist.save();
    await wishlist.populate("products");

    res.json({
      success: true,
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );

    await wishlist.save();
    await wishlist.populate("products");

    res.json({
      success: true,
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// const getWishlistQuery = (req) => {
//   if (req.user) return { user: req.user._id };
//   if (req.sessionId) return { sessionId: req.sessionId };
//   return null;
// };


export const getWishlist = async (req, res) => {
  try {
    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.sessionId };

    const wishlist = await Wishlist.findOne(query).populate("items");

    res.json({
      success: true,
      wishlist: wishlist || { items: [], products: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.sessionId };

    let wishlist = await Wishlist.findOne(query);

    if (!wishlist) {
      wishlist = new Wishlist({
        ...(req.user ? { user: req.user._id } : { sessionId: req.sessionId }),
        items: [],
      });
    }

    const existingIndex = wishlist.items.findIndex(
      (id) => id.toString() === productId
    );

    let isWishlisted;
    if (existingIndex > -1) {
      wishlist.items.splice(existingIndex, 1);
      isWishlisted = false;
    } else {
      wishlist.items.push(productId);
      isWishlisted = true;
    }

    await wishlist.save();

    res.json({
      success: true,
      isWishlisted,
      message: isWishlisted ? "Added to wishlist" : "Removed from wishlist",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const mergeWishlist = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.json({ success: true });

    const guestWishlist = await Wishlist.findOne({ sessionId });
    if (!guestWishlist || guestWishlist.items.length === 0) {
      return res.json({ success: true });
    }

    let userWishlist = await Wishlist.findOne({ user: req.user._id });

    if (!userWishlist) {
      guestWishlist.user = req.user._id;
      guestWishlist.sessionId = undefined;
      await guestWishlist.save();
      return res.json({ success: true });
    }

    for (const itemId of guestWishlist.items) {
      if (!userWishlist.items.some((id) => id.toString() === itemId.toString())) {
        userWishlist.items.push(itemId);
      }
    }

    await userWishlist.save();
    await Wishlist.deleteOne({ sessionId });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};