import Product from "../models/Product.js";

export const addProduct = async (req, res) => {
  
  try {
    const { name, description, category, productPrice, salePrice, quantity } =
      req.body;

    if (!req.files || !req.files.mainImage) {
      return res.status(400).json({ message: "Main product image is required" });
    }

    const mainImage = `${process.env.BACKEND_URL}/uploads/products/${req.files.mainImage[0].filename}`;

    const featureImages = req.files.featureImages
      ? req.files.featureImages.map(
          (file) =>
            `${process.env.BACKEND_URL}/uploads/products/${file.filename}`
        )
      : [];

    const product = new Product({
      name,
      description,
      category,
      productPrice: Number(productPrice),
      salePrice: Number(salePrice),
      quantity: Number(quantity),
      mainImage,
      featureImages,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 100;

    const products = await Product.paginate(
      {},
      {
        page,
        limit,
        sort: { createdAt: -1 },
      }
    );

    res.status(200).json({
        success: true,
        products: products.docs,
        pagination: {
        totalDocs: products.totalDocs,
        totalPages: products.totalPages,
        page: products.page,
        limit: products.limit,
        hasNextPage: products.hasNextPage,
        hasPrevPage: products.hasPrevPage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ 
      slug: req.params.slug,
      isPublished: true 
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const togglePublish = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isPublished = !product.isPublished;
    await product.save();
    res.json({
      message: "Publish status updated",
      isPublished: product.isPublished,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPublicProducts = async (req, res) => {
  try {
    const products = await Product.find({ isPublished: true })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      productPrice: req.body.productPrice,
      salePrice: req.body.salePrice,
      quantity: req.body.quantity,
    };

 
if (req.files?.mainImage?.[0]) {
  updateData.mainImage = `${process.env.BACKEND_URL}/uploads/products/${req.files.mainImage[0].filename}`;
}

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


