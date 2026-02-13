import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

export const createOrder = async (req, res) => {
  try {

    const {
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
    const order = await Order.findById(req.params.id).populate(
      "user",
      "firstName lastName email phone"
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getOrderByNumber = async (req, res) => {
  try {
    const order = await Order.findOne({
      orderNumber: req.params.orderNumber,
    }).populate("user", "firstName lastName email");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllOrders = async (req, res) => {
 try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, status, paymentMethod, startDate, endDate, dateRange } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { "customerInfo.firstName": { $regex: search, $options: "i" } },
        { "customerInfo.lastName": { $regex: search, $options: "i" } },
        { orderNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }

    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDateTime = new Date();

      switch (dateRange) {
        case "5days":
          startDateTime.setDate(now.getDate() - 5);
          break;
        case "7days":
          startDateTime.setDate(now.getDate() - 7);
          break;
        case "15days":
          startDateTime.setDate(now.getDate() - 15);
          break;
        case "30days":
          startDateTime.setDate(now.getDate() - 30);
          break;
      }

      query.createdAt = { $gte: startDateTime };
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); 

      query.createdAt = { $gte: start, $lte: end };
    }

    const totalDocs = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalDocs / limit);
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

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
      stats,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


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

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel delivered order",
      });
    }

    order.status = "cancelled";
    await order.save();

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity },
      });
    }

    res.json({ success: true, message: "Order cancelled", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

