import mongoose from "mongoose";
import slugify from "slugify";
import mongoosePaginate from "mongoose-paginate-v2";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  slug: { type: String, unique: true },
  productPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  mainImage: { type: String, required: true },
  featureImages: {
      type: [String], 
      validate: [arr => arr.length <= 5, "Maximum 5 feature images allowed"],
    },
    isPublished: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

productSchema.pre("save", function () {
  if (!this.slug) {
    this.slug = `${slugify(this.name, { lower: true })}-${Math.floor(Math.random() * 1000)}`;
  }
});

productSchema.plugin(mongoosePaginate);
const Product = mongoose.model('Product', productSchema);
export default Product;