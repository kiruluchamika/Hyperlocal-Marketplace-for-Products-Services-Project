import mongoose, { Schema, Document, Model } from "mongoose";

export type CategoryType = "PRODUCT" | "SERVICE";
export type FieldType = "string" | "number" | "boolean" | "select";

interface IAttribute {
  fieldName: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
}

export interface ICategory extends Document {
  name: string;
  type: CategoryType;
  description?: string;
  attributes: IAttribute[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const attributeSchema = new Schema<IAttribute>({
  fieldName: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ["string", "number", "boolean", "select"],
    required: true
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }]
});

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ["PRODUCT", "SERVICE"],
      required: true
    },
    description: { type: String, trim: true },
    attributes: [attributeSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Category: Model<ICategory> = mongoose.model<ICategory>("Category", categorySchema);

export default Category;
