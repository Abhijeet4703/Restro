export interface Dish {
  id: string;
  name: string;
  price: string;
  description: string;
  isVeg: boolean;
  category: string;
  imageUrl?: string;
  isCustomImage?: boolean;
}

export type MenuTemplateType = 'thai' | 'chinese' | 'italian' | 'modern';

export interface MenuData {
  restaurantName: string;
  dishes: Dish[];
}
