import Category from "../models/Category.js";

export const addCategory = async (req, res) => {
  try {
    const { name, description, isPublished } = req.body;
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingCategory) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category with this name already exists' 
      });
    }

    const categoryData = {
      name,
      description,
      isPublished: isPublished === 'true' || isPublished === true,
    };

    if (req.file) {
      categoryData.icon = `${process.env.BACKEND_URL}/uploads/products/${req.file.filename}`;
    }

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const categories = await Category.paginate(
      {},
      {
        page,
        limit,
        sort: { createdAt: -1 },
      }
    );

    res.status(200).json({
      success: true,
      categories: categories.docs,
      pagination: {
        totalDocs: categories.totalDocs,
        totalPages: categories.totalPages,
        page: categories.page,
        limit: categories.limit,
        hasNextPage: categories.hasNextPage,
        hasPrevPage: categories.hasPrevPage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = await Category.findOne({ slug });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    
    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
    };

    if (updateData.name && updateData.name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingCategory) {
        return res.status(400).json({ 
          success: false, 
          message: 'Category with this name already exists' 
        });
      }
    }

    if (req.file) {
      updateData.icon = `${process.env.BACKEND_URL}/uploads/products/${req.file.filename}`;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ 
        success: false, 
        message: "Category not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    res.json({ 
      success: true,
      message: "Category deleted successfully" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const toggleCategoryPublish = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: "Category not found" 
      });
    }

    category.isPublished = !category.isPublished;
    await category.save();

    console.log("New publish status:", category.isPublished);

    res.json({
      success: true,
      message: "Publish status updated",
      isPublished: category.isPublished,
      category,
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isPublished: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};