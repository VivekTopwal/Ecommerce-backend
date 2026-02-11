import User from "../models/User.js";
import Order from "../models/Order.js";

export const getAllCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    let query = { role: "user" };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const totalDocs = await User.countDocuments(query);
    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalDocs / limit);

    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const ordersCount = await Order.countDocuments({ user: customer._id });
        const totalSpent = await Order.aggregate([
          {
            $match: {
              user: customer._id,
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" },
            },
          },
        ]);

        return {
          ...customer.toObject(),
          ordersCount,
          totalSpent: totalSpent[0]?.total || 0,
        };
      })
    );

    const totalCustomers = await User.countDocuments({ role: "user" });
    const activeCustomers = await User.countDocuments({
      role: "user",
      isActive: true,
    });
    const newThisMonth = await User.countDocuments({
      role: "user",
      createdAt: {
        $gte: new Date(new Date().setDate(1)), 
      },
    });

    res.json({
      success: true,
      customers: customersWithStats,
      pagination: {
        totalDocs,
        totalPages,
        page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: {
        totalCustomers,
        activeCustomers,
        newThisMonth,
        inactiveCustomers: totalCustomers - activeCustomers,
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const orders = await Order.find({ user: customer._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const totalSpent = await Order.aggregate([
      {
        $match: {
          user: customer._id,
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    res.json({
      success: true,
      customer: {
        ...customer.toObject(),
        ordersCount: orders.length,
        totalSpent: totalSpent[0]?.total || 0,
        recentOrders: orders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleCustomerStatus = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    res.json({
      success: true,
      message: customer.isActive
        ? "Customer activated successfully"
        : "Customer deactivated successfully",
      isActive: customer.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkDeleteCustomers = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No customer IDs provided" });
    }

    await User.deleteMany({ _id: { $in: ids }, role: "user" });

    res.json({
      success: true,
      message: `${ids.length} customer(s) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};