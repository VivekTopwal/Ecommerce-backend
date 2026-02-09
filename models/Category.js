import mongoose from 'mongoose';
import slugify from "slugify";
import mongoosePaginate from 'mongoose-paginate-v2';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  description: { type: String },
  icon: { type: String },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });


categorySchema.plugin(mongoosePaginate);


categorySchema.pre("save", function () {
  if (!this.slug) {
    this.slug = `${slugify(this.name, { lower: true })}-${Math.floor(Math.random() * 1000)}`;
  }
});

export default mongoose.model('Category', categorySchema);