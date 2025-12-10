'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
type Gender = 'male' | 'female' | 'unisex';

const categories: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'dress', label: 'Dress' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'bag', label: 'Bag' },
  { value: 'jewelry', label: 'Jewelry' },
];

const genders: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Women' },
  { value: 'male', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
];

const currencies = ['USD', 'EUR', 'GBP', 'KES', 'NGN'];

export interface ItemFormData {
  name: string;
  brand: string;
  description: string;
  category: Category;
  subcategory: string;
  gender: Gender;
  price: string;
  currency: string;
  originalPrice: string;
  colors: string[];
  sizes: string[];
  material: string;
  tags: string[];
  occasion: string[];
  season: string[];
  sourceStore: string;
  sourceUrl: string;
  inStock: boolean;
}

interface ItemFormFieldsProps {
  data: ItemFormData;
  onChange: (data: ItemFormData) => void;
  disabled?: boolean;
}

export function ItemFormFields({ data, onChange, disabled }: ItemFormFieldsProps) {
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [occasionInput, setOccasionInput] = useState('');
  const [seasonInput, setSeasonInput] = useState('');

  const handleAddToArray = (
    field: 'colors' | 'sizes' | 'tags' | 'occasion' | 'season',
    value: string,
    setter: (val: string) => void
  ) => {
    if (value.trim() && !data[field].includes(value.trim())) {
      onChange({
        ...data,
        [field]: [...data[field], value.trim()],
      });
    }
    setter('');
  };

  const handleRemoveFromArray = (
    field: 'colors' | 'sizes' | 'tags' | 'occasion' | 'season',
    index: number
  ) => {
    onChange({
      ...data,
      [field]: data[field].filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              placeholder="Product name"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={data.brand}
              onChange={(e) => onChange({ ...data, brand: e.target.value })}
              placeholder="Brand name"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Product description"
            rows={3}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Category & Gender */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Categorization</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={data.category}
              onValueChange={(value) => onChange({ ...data, category: value as Category })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategory</Label>
            <Input
              id="subcategory"
              value={data.subcategory}
              onChange={(e) => onChange({ ...data, subcategory: e.target.value })}
              placeholder="e.g., t-shirt, jeans"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Gender *</Label>
            <Select
              value={data.gender}
              onValueChange={(value) => onChange({ ...data, gender: value as Gender })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {genders.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Pricing</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={data.price}
              onChange={(e) => onChange({ ...data, price: e.target.value })}
              placeholder="0.00"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Currency *</Label>
            <Select
              value={data.currency}
              onValueChange={(value) => onChange({ ...data, currency: value })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((cur) => (
                  <SelectItem key={cur} value={cur}>
                    {cur}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="originalPrice">Original Price</Label>
            <Input
              id="originalPrice"
              type="number"
              step="0.01"
              min="0"
              value={data.originalPrice}
              onChange={(e) => onChange({ ...data, originalPrice: e.target.value })}
              placeholder="0.00 (for sale items)"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Attributes</h3>

        {/* Colors */}
        <div className="space-y-2">
          <Label>Colors</Label>
          <div className="flex gap-2">
            <Input
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddToArray('colors', colorInput, setColorInput);
                }
              }}
              placeholder="Add color"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleAddToArray('colors', colorInput, setColorInput)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {data.colors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.colors.map((color, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {color}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromArray('colors', i)}
                    disabled={disabled}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sizes */}
        <div className="space-y-2">
          <Label>Sizes</Label>
          <div className="flex gap-2">
            <Input
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddToArray('sizes', sizeInput, setSizeInput);
                }
              }}
              placeholder="Add size (e.g., S, M, L, XL)"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleAddToArray('sizes', sizeInput, setSizeInput)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {data.sizes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.sizes.map((size, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {size}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromArray('sizes', i)}
                    disabled={disabled}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <Input
            id="material"
            value={data.material}
            onChange={(e) => onChange({ ...data, material: e.target.value })}
            placeholder="e.g., Cotton, Polyester, Leather"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Style Tags */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Style & Tags</h3>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Style Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddToArray('tags', tagInput, setTagInput);
                }
              }}
              placeholder="Add tag (e.g., casual, formal, streetwear)"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleAddToArray('tags', tagInput, setTagInput)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromArray('tags', i)}
                    disabled={disabled}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Occasion */}
        <div className="space-y-2">
          <Label>Occasion</Label>
          <div className="flex gap-2">
            <Input
              value={occasionInput}
              onChange={(e) => setOccasionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddToArray('occasion', occasionInput, setOccasionInput);
                }
              }}
              placeholder="Add occasion (e.g., work, date_night, weekend)"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleAddToArray('occasion', occasionInput, setOccasionInput)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {data.occasion.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.occasion.map((occ, i) => (
                <Badge key={i} variant="outline" className="gap-1">
                  {occ}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromArray('occasion', i)}
                    disabled={disabled}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Season */}
        <div className="space-y-2">
          <Label>Season</Label>
          <div className="flex gap-2">
            <Input
              value={seasonInput}
              onChange={(e) => setSeasonInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddToArray('season', seasonInput, setSeasonInput);
                }
              }}
              placeholder="Add season (e.g., summer, winter, all_season)"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleAddToArray('season', seasonInput, setSeasonInput)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {data.season.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.season.map((s, i) => (
                <Badge key={i} variant="outline" className="gap-1">
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromArray('season', i)}
                    disabled={disabled}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Source */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Source</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sourceStore">Source Store</Label>
            <Input
              id="sourceStore"
              value={data.sourceStore}
              onChange={(e) => onChange({ ...data, sourceStore: e.target.value })}
              placeholder="Store name"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              type="url"
              value={data.sourceUrl}
              onChange={(e) => onChange({ ...data, sourceUrl: e.target.value })}
              placeholder="https://..."
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const defaultFormData: ItemFormData = {
  name: '',
  brand: '',
  description: '',
  category: 'top',
  subcategory: '',
  gender: 'unisex',
  price: '',
  currency: 'USD',
  originalPrice: '',
  colors: [],
  sizes: [],
  material: '',
  tags: [],
  occasion: [],
  season: [],
  sourceStore: '',
  sourceUrl: '',
  inStock: true,
};

