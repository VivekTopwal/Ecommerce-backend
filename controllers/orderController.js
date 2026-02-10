import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

export const createOrder = async (req, res) => {
  try {
    const {
      sessionId,
      items,
      isBuyNow,
      customerInfo,
      shippingAddress,
      billingAddress,
      paymentMethod,
      orderNotes,
      sameAsShipping,
    } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please login to place an order",
      });
    }

    const userId = req.user._id;
    let orderItems = [];
    let itemsPrice = 0;

    if (isBuyNow && items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findById(item.product._id);
        
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found`,
          });
        }
        
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
          });
        }

        orderItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          price: item.salePrice,
          image: product.mainImage,
        });

        itemsPrice += item.salePrice * item.quantity;
      }
    } else {
      const cart = await Cart.findOne({ user: userId }).populate("items.product");

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      for (const item of cart.items) {
        const product = await Product.findById(item.product._id);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product ${item.product.name} not found`,
          });
        }
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`,
          });
        }
      }

      orderItems = cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.salePrice,
        image: item.product.mainImage,
      }));

      itemsPrice = cart.totalAmount;
    }

    const shippingPrice = itemsPrice > 500 ? 0 : 50;
    const taxPrice = Number((itemsPrice * 0.1).toFixed(2));
    const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

    // Create order
    const order = new Order({
      user: userId,
      items: orderItems,
      customerInfo,
      shippingAddress,
      billingAddress: sameAsShipping ? shippingAddress : billingAddress,
      paymentMethod,
      orderNotes,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      orderStatus: "pending",
      paymentStatus: "pending",
    });

    await order.save();

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: { quantity: -item.quantity },
        },
        { new: true }
      );
    }

    if (!isBuyNow) {
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cart.items = [];
        cart.totalAmount = 0;
        cart.totalItems = 0;
        await cart.save();
      }
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber || order._id,
        totalPrice: order.totalPrice,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber }).populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getUserOrders = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.user?._id;

    let query = {};
    if (userId) {
      query.user = userId;
    } else if (sessionId) {
      query.sessionId = sessionId;
    }

    const orders = await Order.find(query)
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalDocs = await Order.countDocuments();
    const orders = await Order.find()
      .populate("items.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalDocs / limit);

    res.json({
      success: true,
      orders,
      pagination: {
        totalDocs,
        totalPages,
        page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update order status (admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
      if (orderStatus === "delivered") {
        order.deliveredAt = Date.now();
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === "paid") {
        order.paidAt = Date.now();
      }
    }

    await order.save();

    res.json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel delivered order",
      });
    }

    // Restore product quantities
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity },
      });
    }

    order.orderStatus = "cancelled";
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};