export type CategoryType = 'PRODUCT' | 'SERVICE';
export type FieldType = 'string' | 'number' | 'boolean' | 'select';

export interface CategoryAttribute {
  fieldName: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
}

export interface ICategory {
  _id: string;
  name: string;
  type: CategoryType;
  description?: string;
  image: string;
  attributes: CategoryAttribute[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
