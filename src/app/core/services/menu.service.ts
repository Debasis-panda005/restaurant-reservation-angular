import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MenuItem, MenuCategory } from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private mockMenuItems: MenuItem[] = [
    // =========================================================================
    // RESTAURANT 1: SPICE SYMPHONY BISTRO (North Indian & Mughlai)
    // =========================================================================
    {
      id: 101,
      restaurantId: 1,
      name: 'Dahi Ke Kebab',
      description: 'Hung curd patties infused with green cardamom, ginger, and fresh coriander with a crisp golden exterior.',
      price: 320,
      category: 'STARTERS',
      imageUrl: '/images/menu/101.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 102,
      restaurantId: 1,
      name: 'Murgh Malai Tikka',
      description: 'Char-grilled succulent chicken tenders marinated in clotted malai cream, processed cheese, and crushed white pepper.',
      price: 480,
      category: 'STARTERS',
      imageUrl: '/images/menu/102.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 103,
      restaurantId: 1,
      name: 'Mutton Galouti Kebab',
      description: 'Melt-in-the-mouth Awadhi spiced lamb medallions smoked over charcoal with clove infusion and saffron.',
      price: 580,
      category: 'STARTERS',
      imageUrl: '/images/menu/103.jpg',
      vegetarian: false,
      spicy: true,
      available: true
    },
    {
      id: 104,
      restaurantId: 1,
      name: 'Tamatar Dhaniya Shorba',
      description: 'Slow-simmered vine tomato and fresh coriander stem broth tempered with roasted royal cumin and ginger.',
      price: 240,
      category: 'SOUPS',
      imageUrl: '/images/menu/104.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 105,
      restaurantId: 1,
      name: 'Murgh Yakhni Shorba',
      description: 'Aromatic Kashmiri-style chicken broth infused with whole garam masala, fennel, dry ginger, and saffron.',
      price: 290,
      category: 'SOUPS',
      imageUrl: '/images/menu/105.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 106,
      restaurantId: 1,
      name: 'Paneer Lababdar',
      description: 'Soft cottage cheese cubes simmered in a velvety onion, tomato, and cashew gravy finished with crushed kasoori methi.',
      price: 440,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/106.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 107,
      restaurantId: 1,
      name: 'Nalli Nihari',
      description: 'Slow-cooked tender lamb shanks braised overnight in royal spices, saffron essence, and rich bone marrow gravy.',
      price: 690,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/107.jpg',
      vegetarian: false,
      spicy: true,
      available: true
    },
    {
      id: 108,
      restaurantId: 1,
      name: 'Dal Makhani Imperial',
      description: 'Black urad lentils and kidney beans slow-cooked for 24 hours on a gentle tandoor ember with churned white butter.',
      price: 380,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/108.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 109,
      restaurantId: 1,
      name: 'Butter Garlic Naan',
      description: 'Traditional tandoor-baked leavened flatbread brushed with organic farm butter and toasted golden garlic.',
      price: 110,
      category: 'BREADS',
      imageUrl: '/images/menu/109.jpg',
      vegetarian: true,
      available: true
    },
    {
      id: 110,
      restaurantId: 1,
      name: 'Lucknowi Dum Gosht Biryani',
      description: 'Fragrant aged basmati rice layered with succulent spiced mutton, caramelized onions, and saffron attar.',
      price: 620,
      category: 'RICE',
      imageUrl: '/images/menu/110.jpg',
      vegetarian: false,
      spicy: true,
      available: true
    },
    {
      id: 111,
      restaurantId: 1,
      name: 'Shahi Tukda Royale',
      description: 'Crisp ghee-fried brioche soaked in saffron cardamom reduction, garnished with thick rabri, silver leaf, and pistachios.',
      price: 280,
      category: 'DESSERTS',
      imageUrl: '/images/menu/111.jpg',
      vegetarian: true,
      available: true
    },
    {
      id: 112,
      restaurantId: 1,
      name: 'Kesariya Thandai',
      description: 'Chilled rich milk blended with hand-ground almonds, Kashmiri saffron strands, fennel, and fragrant rose petals.',
      price: 220,
      category: 'BEVERAGES',
      imageUrl: '/images/menu/112.jpg',
      vegetarian: true,
      available: false
    },

    // =========================================================================
    // RESTAURANT 2: COASTAL BREEZE SEAFOOD & GRILL (Seafood & Coastal Odia)
    // =========================================================================
    {
      id: 201,
      restaurantId: 2,
      name: 'Prawn Koliwada Crisp',
      description: 'Fresh Bay of Bengal tiger prawns coated in roasted coastal spices, carom seeds, and a crunchy rice crust.',
      price: 520,
      category: 'STARTERS',
      imageUrl: '/images/menu/201.jpg',
      vegetarian: false,
      spicy: true,
      available: true
    },
    {
      id: 202,
      restaurantId: 2,
      name: 'Kankada Jhola Patties',
      description: 'Lump blue crab meat cakes pan-seared with freshly cracked mustard, curry leaves, and green chillies.',
      price: 560,
      category: 'STARTERS',
      imageUrl: '/images/menu/202.jpg',
      vegetarian: false,
      spicy: true,
      available: true
    },
    {
      id: 203,
      restaurantId: 2,
      name: 'Crispy Calamari Rings',
      description: 'Tender ocean squid rings lightly spiced with coastal herbs, served with lemon-garlic emulsion.',
      price: 490,
      category: 'STARTERS',
      imageUrl: '/images/menu/203.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 204,
      restaurantId: 2,
      name: 'Crab & Coconut Bisque',
      description: 'Rich and velvety ocean crab stock simmered with first-pressed coconut milk, black pepper, and curry leaves.',
      price: 320,
      category: 'SOUPS',
      imageUrl: '/images/menu/204.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 205,
      restaurantId: 2,
      name: 'Chingudi Malai Curry',
      description: 'Jumbo prawns braised in coconut cream, mild aromatic spices, cinnamon, and whole green cardamoms.',
      price: 680,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/205.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 206,
      restaurantId: 2,
      name: 'Pomfret Besara',
      description: 'Whole silver pomfret prepared in traditional stone-ground yellow mustard paste, dried mango, and green chillies.',
      price: 640,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/206.jpg',
      vegetarian: false,
      spicy: true,
      available: true
    },
    {
      id: 207,
      restaurantId: 2,
      name: 'Coastal Dalcha',
      description: 'Yellow lentils and tender bottle gourd gently simmered and tempered with mustard seeds, cumin, and curry leaves.',
      price: 310,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/207.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 208,
      restaurantId: 2,
      name: 'Steamed Appam Platter',
      description: 'Traditional fermented rice and coconut milk hoppers with soft spongy centers and delicate lacy crisp borders.',
      price: 160,
      category: 'BREADS',
      imageUrl: '/images/menu/208.jpg',
      vegetarian: true,
      available: true
    },
    {
      id: 209,
      restaurantId: 2,
      name: 'Coastal Seafood Ghee Pulao',
      description: 'Aromatic short-grain rice cooked with fresh prawns, flaky fish, clarified butter, and whole fragrant spices.',
      price: 540,
      category: 'RICE',
      imageUrl: '/images/menu/209.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 210,
      restaurantId: 2,
      name: 'Chhena Poda Souffle',
      description: 'Caramelized roasted cottage cheese cake inspired by heritage Odia traditions, served warm with forest berry drizzle.',
      price: 290,
      category: 'DESSERTS',
      imageUrl: '/images/menu/210.jpg',
      vegetarian: true,
      available: true
    },
    {
      id: 211,
      restaurantId: 2,
      name: 'Tender Coconut Mint Cooler',
      description: 'Pure coastal coconut water muddled with freshly crushed mint leaves, lime juice, and pink Himalayan sea salt.',
      price: 190,
      category: 'BEVERAGES',
      imageUrl: '/images/menu/211.jpg',
      vegetarian: true,
      available: true
    },
    {
      id: 212,
      restaurantId: 2,
      name: 'Lobster Coastal Thermidor',
      description: 'Whole rock lobster gratinated with mild coastal mustard reduction, cheddar, and toasted coconut flakes.',
      price: 1250,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/212.jpg',
      vegetarian: false,
      available: false
    },

    // =========================================================================
    // RESTAURANT 3: URBAN HEARTH FINE DINE (Multi-Cuisine & Italian)
    // =========================================================================
    {
      id: 301,
      restaurantId: 3,
      name: 'Truffle Mushroom Crostini',
      description: 'Toasted artisanal rustic sourdough topped with sautéed wild forest mushrooms, thyme butter, and white truffle glaze.',
      price: 420,
      category: 'STARTERS',
      imageUrl: '/images/menu/301.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 302,
      restaurantId: 3,
      name: 'Burrata & Heirloom Tomato',
      description: 'Creamy Puglia burrata paired with marinated heirloom tomatoes, cold-pressed basil oil, and aged Modena balsamic.',
      price: 540,
      category: 'STARTERS',
      imageUrl: '/images/menu/302.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 303,
      restaurantId: 3,
      name: 'Smoked Salmon Carpaccio',
      description: 'Ultra-thin Norwegian smoked salmon slices with Sicilian capers, shaved baby fennel, and citrus vinaigrette.',
      price: 620,
      category: 'STARTERS',
      imageUrl: '/images/menu/303.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 304,
      restaurantId: 3,
      name: 'Wild Forest Mushroom Bisque',
      description: 'Rich velvety woodland mushroom soup finished with mascarpone, roasted garlic croutons, and truffle drizzle.',
      price: 340,
      category: 'SOUPS',
      imageUrl: '/images/menu/304.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 305,
      restaurantId: 3,
      name: 'Minestrone alla Genovese',
      description: 'Classic slow-simmered Italian seasonal garden vegetable potage with borlotti beans and aromatic basil pesto.',
      price: 290,
      category: 'SOUPS',
      imageUrl: '/images/menu/305.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 306,
      restaurantId: 3,
      name: 'Wild Mushroom & Truffle Risotto',
      description: 'Aged Carnaroli rice slowly cooked with porcini stock, 24-month aged Parmigiano Reggiano, and black winter truffles.',
      price: 640,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/306.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 307,
      restaurantId: 3,
      name: 'Herb Roasted Spring Chicken',
      description: 'Free-range roasted chicken supreme with confit baby potatoes, glazed heritage carrots, and natural thyme jus.',
      price: 680,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/307.jpg',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 308,
      restaurantId: 3,
      name: 'Artisanal Wood-Fired Margherita',
      description: 'Slow-fermented Neapolitan dough topped with San Marzano tomato sauce, fior di latte mozzarella, and fresh basil.',
      price: 520,
      category: 'MAIN_COURSE',
      imageUrl: '/images/menu/308.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 309,
      restaurantId: 3,
      name: 'Garlic Herb Focaccia',
      description: 'Freshly baked Ligurian extra virgin olive oil bread generously crusted with flaky sea salt and fresh rosemary.',
      price: 190,
      category: 'BREADS',
      imageUrl: '/images/menu/309.jpg',
      vegetarian: true,
      available: true
    },
    {
      id: 310,
      restaurantId: 3,
      name: 'Saffron Herb Pilaf',
      description: 'Fragrant butter-poached long grain rice gently steeped with Spanish saffron strands and toasted pine nuts.',
      price: 410,
      category: 'RICE',
      imageUrl: '/images/menu/310.jpg',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 311,
      restaurantId: 3,
      name: 'Classic Venetian Tiramisu',
      description: 'Espresso-soaked Savoiardi ladyfingers layered with whipped mascarpone cream and dusted with Valrhona cocoa.',
      price: 380,
      category: 'DESSERTS',
      imageUrl: '/images/menu/311.jpg',
      vegetarian: true,
      available: true
    },
    {
      id: 312,
      restaurantId: 3,
      name: 'Smoked Espresso Mocktail',
      description: 'Double shot artisanal cold extraction shaken over ice with vanilla bean syrup and applewood smoke infusion.',
      price: 260,
      category: 'BEVERAGES',
      imageUrl: '/images/menu/312.jpg',
      vegetarian: true,
      available: false
    }
  ];

  private readonly categories: MenuCategory[] = [
    'STARTERS',
    'SOUPS',
    'MAIN_COURSE',
    'BREADS',
    'RICE',
    'DESSERTS',
    'BEVERAGES'
  ];

  /**
   * Get all menu items for a specific restaurant.
   */
  getMenuByRestaurantId(restaurantId: number): Observable<MenuItem[]> {
    const id = Number(restaurantId);
    const items = this.mockMenuItems.filter(
      (item) =>
        item.restaurantId === id ||
        (id === 5 && item.restaurantId === 2) ||
        (id === 6 && item.restaurantId === 3)
    );
    return of(items);
  }

  /**
   * Get a specific menu item by its ID.
   */
  getMenuItemById(id: number): Observable<MenuItem | undefined> {
    const item = this.mockMenuItems.find(i => i.id === id);
    return of(item);
  }

  /**
   * Get all available standard menu categories.
   */
  getCategories(): MenuCategory[] {
    return [...this.categories];
  }
}
