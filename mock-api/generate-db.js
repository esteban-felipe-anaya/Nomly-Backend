/**
 * Nomly mock-API seed generator.
 *
 * Produces a deterministic `db.json` for json-server. Deterministic on purpose:
 * no Math.random / Date.now, so re-running yields identical data and the image
 * URLs stay stable. Every image URL below was verified to return HTTP 200 at
 * authoring time (see README "Verifying image URLs"). Run with: `npm run seed`.
 */
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Verified real Unsplash photo IDs, grouped by food category. (HTTP 200 checked)
// ---------------------------------------------------------------------------
const IMG = {
  pizza: ['1513104890138-7c749659a591', '1565299624946-b28f40a0ae38', '1574071318508-1cdbab80d002', '1604382354936-07c5d9983bd3', '1593560708920-61dd98c46a4e', '1571066811602-716837d681de'],
  burger: ['1568901346375-23c9450c58cd', '1571091718767-18b5b1457add', '1550547660-d9450f859349', '1572802419224-296b0aeee0d9', '1586190848861-99aa4a171e90'],
  sushi: ['1579871494447-9811cf80d66c', '1553621042-f6e147245754', '1611143669185-af224c5e3252', '1607301405390-d831c242f59b', '1617196034796-73dfa7b1fd56'],
  tacos: ['1565299585323-38d6b0865b47', '1551504734-5ee1c4a1479b', '1599974579688-8dbdd335c77f', '1606787366850-de6330128bfc'],
  salad: ['1512621776951-a57141f2eefd', '1540420773420-3366772f4999', '1546069901-ba9599a7e63c', '1551248429-40975aa4de74'],
  ramen: ['1569718212165-3a8278d5f624', '1557872943-16a5ac26437e', '1591814468924-caf88d1232e1', '1612929633738-8fe44f7ec841'],
  dessert: ['1551024601-bec78aea704b', '1488477181946-6428a0291777', '1565958011703-44f9829ba187', '1606313564200-e75d5e30476c'],
  coffee: ['1509042239860-f550ce710b93', '1461023058943-07fcbe16d735', '1572442388796-11668a67e53d'],
  indian: ['1585937421612-70a008356fbe', '1631452180519-c014fe946bc7', '1565557623262-b51c2513a641'],
  chinese: ['1525755662778-989d0524087e', '1582878826629-29b7ad1cdc43'],
  breakfast: ['1533089860892-a7c6f0a88666', '1525351484163-7529414344d8'],
  cover: ['1517248135467-4c7edcad34c4', '1552566626-52f8b828add9', '1414235077428-338989a2e8c0', '1555396273-367ea4eb4db5', '1466978913421-dad2ebd01d17'],
};

const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
// round-robin picker so assignments are deterministic and spread across the pool
const pick = (arr, i) => arr[i % arr.length];

const portrait = (gender, n) => `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;

// ---------------------------------------------------------------------------
// Cuisines
// ---------------------------------------------------------------------------
const cuisines = [
  { id: 'cui_pizza', name: 'Pizza', icon: 'local_pizza' },
  { id: 'cui_burgers', name: 'Burgers', icon: 'lunch_dining' },
  { id: 'cui_sushi', name: 'Sushi', icon: 'set_meal' },
  { id: 'cui_mexican', name: 'Mexican', icon: 'restaurant' },
  { id: 'cui_healthy', name: 'Healthy', icon: 'eco' },
  { id: 'cui_ramen', name: 'Ramen', icon: 'ramen_dining' },
  { id: 'cui_indian', name: 'Indian', icon: 'rice_bowl' },
  { id: 'cui_dessert', name: 'Desserts', icon: 'icecream' },
];

// Per-cuisine dish templates: each becomes a menu item. `cat` is the image pool key.
const TEMPLATES = {
  cui_pizza: {
    pool: 'pizza',
    categories: {
      'Pizzas': [
        ['Margherita', 'San Marzano tomato, fresh mozzarella, basil', 12.5],
        ['Pepperoni', 'Double pepperoni, mozzarella, oregano', 14.0],
        ['Quattro Formaggi', 'Mozzarella, gorgonzola, fontina, parmesan', 15.5],
        ['Diavola', 'Spicy salami, chili, tomato, mozzarella', 14.5],
      ],
      'Starters': [
        ['Garlic Bread', 'Wood-fired bread, garlic butter, parsley', 5.5],
        ['Bruschetta', 'Toasted sourdough, tomato, basil, olive oil', 6.5],
      ],
      'Desserts': [
        ['Tiramisu', 'Espresso-soaked ladyfingers, mascarpone', 6.0],
        ['Panna Cotta', 'Vanilla cream, berry compote', 5.5],
      ],
      'Drinks': [
        ['San Pellegrino', 'Sparkling natural mineral water 500ml', 3.0],
        ['Italian Soda', 'Lemon & blood orange', 3.5],
      ],
    },
  },
  cui_burgers: {
    pool: 'burger',
    categories: {
      'Burgers': [
        ['Classic Cheeseburger', 'Beef patty, cheddar, lettuce, tomato, house sauce', 11.0],
        ['Bacon Double', 'Two patties, smoked bacon, American cheese', 14.5],
        ['Crispy Chicken', 'Buttermilk-fried chicken, slaw, pickles', 12.0],
        ['Veggie Burger', 'Black bean patty, avocado, chipotle mayo', 11.5],
      ],
      'Sides': [
        ['Skin-on Fries', 'Sea salt, rosemary', 4.0],
        ['Onion Rings', 'Beer-battered, ranch dip', 5.0],
      ],
      'Desserts': [
        ['Chocolate Brownie', 'Warm fudge brownie, vanilla ice cream', 6.0],
      ],
      'Drinks': [
        ['Vanilla Milkshake', 'Hand-spun, whipped cream', 5.5],
        ['Craft Cola', 'House-made cola', 3.0],
      ],
    },
  },
  cui_sushi: {
    pool: 'sushi',
    categories: {
      'Sushi & Rolls': [
        ['Salmon Nigiri (4pc)', 'Fresh salmon over seasoned rice', 9.0],
        ['Spicy Tuna Roll', 'Tuna, spicy mayo, cucumber, sesame', 10.5],
        ['Dragon Roll', 'Eel, avocado, cucumber, tobiko', 13.0],
        ['California Roll', 'Crab, avocado, cucumber', 8.5],
      ],
      'Starters': [
        ['Edamame', 'Steamed soybeans, sea salt', 4.5],
        ['Miso Soup', 'Tofu, wakame, scallion', 3.5],
      ],
      'Desserts': [
        ['Mochi Ice Cream', 'Assorted (3pc)', 6.0],
      ],
      'Drinks': [
        ['Green Tea', 'Hot sencha', 2.5],
        ['Ramune Soda', 'Original marble soda', 3.5],
      ],
    },
  },
  cui_mexican: {
    pool: 'tacos',
    categories: {
      'Tacos': [
        ['Al Pastor Tacos (3)', 'Marinated pork, pineapple, onion, cilantro', 10.0],
        ['Carne Asada Tacos (3)', 'Grilled steak, salsa verde, onion', 11.0],
        ['Baja Fish Tacos (3)', 'Crispy fish, slaw, chipotle crema', 11.5],
      ],
      'Burritos & Bowls': [
        ['Chicken Burrito', 'Rice, beans, cheese, pico, guac', 11.0],
        ['Veggie Bowl', 'Cilantro rice, beans, fajita veg, salsa', 10.5],
      ],
      'Sides': [
        ['Chips & Guacamole', 'Fresh guac, lime, tortilla chips', 6.0],
        ['Elote', 'Grilled corn, cotija, chili, lime', 5.0],
      ],
      'Drinks': [
        ['Horchata', 'Cinnamon rice milk', 3.5],
        ['Jarritos', 'Tamarind / lime', 3.0],
      ],
    },
  },
  cui_healthy: {
    pool: 'salad',
    categories: {
      'Salads': [
        ['Caesar Salad', 'Romaine, parmesan, croutons, classic dressing', 9.5],
        ['Greek Bowl', 'Quinoa, feta, olives, cucumber, tomato', 10.5],
        ['Poke Bowl', 'Ahi tuna, edamame, mango, brown rice', 13.0],
      ],
      'Bowls': [
        ['Buddha Bowl', 'Roasted veg, chickpeas, tahini, greens', 11.0],
        ['Acai Bowl', 'Acai, banana, granola, berries', 9.0],
      ],
      'Snacks': [
        ['Avocado Toast', 'Sourdough, smashed avo, chili flakes', 7.5],
      ],
      'Drinks': [
        ['Green Smoothie', 'Spinach, apple, banana, ginger', 6.0],
        ['Cold Brew', 'Slow-steeped, 18h', 4.0],
      ],
    },
  },
  cui_ramen: {
    pool: 'ramen',
    categories: {
      'Ramen': [
        ['Tonkotsu Ramen', 'Pork bone broth, chashu, egg, scallion', 13.5],
        ['Shoyu Ramen', 'Soy-based broth, bamboo, nori, egg', 12.5],
        ['Spicy Miso Ramen', 'Miso broth, chili oil, corn, butter', 13.0],
        ['Veggie Ramen', 'Mushroom dashi, tofu, greens', 12.0],
      ],
      'Starters': [
        ['Gyoza (5pc)', 'Pan-fried pork dumplings', 6.5],
        ['Karaage', 'Japanese fried chicken, lemon', 7.0],
      ],
      'Desserts': [
        ['Matcha Cheesecake', 'Baked matcha, white chocolate', 6.5],
      ],
      'Drinks': [
        ['Iced Matcha Latte', 'Ceremonial matcha, oat milk', 5.0],
      ],
    },
  },
  cui_indian: {
    pool: 'indian',
    categories: {
      'Curries': [
        ['Butter Chicken', 'Tomato-cream sauce, tandoori chicken', 13.0],
        ['Paneer Tikka Masala', 'Grilled paneer, spiced tomato gravy', 12.0],
        ['Lamb Rogan Josh', 'Slow-cooked lamb, Kashmiri spices', 14.5],
        ['Chana Masala', 'Chickpeas, onion-tomato masala', 10.5],
      ],
      'Breads & Rice': [
        ['Garlic Naan', 'Tandoor-baked, garlic butter', 3.5],
        ['Biryani', 'Basmati, saffron, fried onion', 11.0],
      ],
      'Starters': [
        ['Samosas (2)', 'Spiced potato & pea, tamarind chutney', 5.0],
      ],
      'Drinks': [
        ['Mango Lassi', 'Yogurt, mango, cardamom', 4.0],
        ['Masala Chai', 'Spiced milk tea', 3.0],
      ],
    },
  },
  cui_dessert: {
    pool: 'dessert',
    categories: {
      'Cakes & Bakes': [
        ['Chocolate Lava Cake', 'Molten center, cocoa dusting', 6.5],
        ['New York Cheesecake', 'Graham crust, berry coulis', 6.0],
        ['Carrot Cake', 'Cream cheese frosting, walnuts', 5.5],
      ],
      'Frozen': [
        ['Gelato Trio', 'Pistachio, stracciatella, lemon', 6.0],
        ['Affogato', 'Vanilla gelato, espresso shot', 5.0],
      ],
      'Pastries': [
        ['Belgian Waffle', 'Maple, berries, cream', 7.0],
        ['Cinnamon Roll', 'Warm, vanilla glaze', 4.5],
      ],
      'Drinks': [
        ['Cappuccino', 'Double shot, velvet foam', 3.5],
        ['Hot Chocolate', 'Dark Belgian chocolate', 4.0],
      ],
    },
  },
};

// Reusable customization groups by category kind
const sizeGroup = { group: 'Size', type: 'single', required: true, options: [
  { name: 'Regular', priceDelta: 0 }, { name: 'Large', priceDelta: 3.0 },
] };
const pizzaSize = { group: 'Size', type: 'single', required: true, options: [
  { name: 'Medium (11")', priceDelta: 0 }, { name: 'Large (14")', priceDelta: 4.0 }, { name: 'Family (18")', priceDelta: 7.0 },
] };
const spiceGroup = { group: 'Spice level', type: 'single', required: true, options: [
  { name: 'Mild', priceDelta: 0 }, { name: 'Medium', priceDelta: 0 }, { name: 'Hot', priceDelta: 0 },
] };
const toppings = { group: 'Extra toppings', type: 'multi', required: false, options: [
  { name: 'Mushrooms', priceDelta: 1.5 }, { name: 'Extra cheese', priceDelta: 2.0 }, { name: 'Pepperoni', priceDelta: 2.0 }, { name: 'Olives', priceDelta: 1.0 },
] };
const addOns = { group: 'Add-ons', type: 'multi', required: false, options: [
  { name: 'Extra sauce', priceDelta: 0.75 }, { name: 'Side salad', priceDelta: 3.0 }, { name: 'Avocado', priceDelta: 2.0 },
] };

function customizationFor(cuisineId, category) {
  if (cuisineId === 'cui_pizza' && category === 'Pizzas') return [pizzaSize, toppings];
  if (cuisineId === 'cui_burgers' && category === 'Burgers') return [sizeGroup, addOns];
  if (cuisineId === 'cui_indian' && category === 'Curries') return [spiceGroup, sizeGroup];
  if (cuisineId === 'cui_mexican' && (category === 'Tacos' || category === 'Burritos & Bowls')) return [spiceGroup, addOns];
  if (cuisineId === 'cui_ramen' && category === 'Ramen') return [spiceGroup, addOns];
  if (category === 'Salads' || category === 'Bowls') return [sizeGroup, addOns];
  if (category === 'Drinks') return [sizeGroup];
  return [];
}

// ---------------------------------------------------------------------------
// Restaurant definitions (20). Each references a cuisine; menu derives from it.
// ---------------------------------------------------------------------------
const RESTAURANT_NAMES = {
  cui_pizza: ['Napoli Wood-Fired', 'Slice & Co.', 'Bella Forno'],
  cui_burgers: ['Patty Palace', 'The Grind House', 'Smash & Sear'],
  cui_sushi: ['Sakura Sushi', 'Tokyo Roll Bar', 'Umami House'],
  cui_mexican: ['El Camino Tacos', 'Casa Verde', 'Maíz Cantina'],
  cui_healthy: ['Green Fork', 'Fresh Roots', 'Bowl & Co.'],
  cui_ramen: ['Ramen Republic', 'Noodle Lab'],
  cui_indian: ['Spice Route', 'Tandoori Nights'],
  cui_dessert: ['Sweet Tooth', 'Sugar & Spoon'],
};

const baseLat = 19.4326, baseLng = -99.1332; // Mexico City center (matches Antojo/LATAM note)

function buildRestaurants() {
  const restaurants = [];
  const menus = {}; // restaurantId -> [{category, items:[dishId...]}]
  const dishes = [];
  let r = 0, d = 0;
  for (const cuisine of cuisines) {
    const names = RESTAURANT_NAMES[cuisine.id];
    const tpl = TEMPLATES[cuisine.id];
    names.forEach((name, ni) => {
      const rid = `rst_${String(r + 1).padStart(2, '0')}`;
      const ratingTenths = 38 + ((r * 3) % 12); // 3.8 .. 4.9
      const rating = ratingTenths / 10;
      const deliveryMin = 15 + (r % 5) * 5;
      const deliveryFee = (r % 4 === 0) ? 0 : (1.49 + (r % 3));
      const priceLevel = 1 + (r % 3); // 1..3
      const freeDelivery = deliveryFee === 0;
      const offers = (r % 3 === 0) ? ['20% off over $25'] : ((r % 3 === 1) ? ['Free dessert'] : []);
      // menu
      const menuCats = [];
      for (const [category, items] of Object.entries(tpl.categories)) {
        const dishIds = [];
        items.forEach((it, ii) => {
          const did = `dish_${String(d + 1).padStart(3, '0')}`;
          const [dname, ddesc, dprice] = it;
          dishes.push({
            id: did,
            restaurantId: rid,
            name: dname,
            category,
            description: ddesc,
            price: Number(dprice.toFixed(2)),
            currency: 'USD',
            image: img(pick(IMG[tpl.pool], ii + ni), 800),
            popular: ii === 0,
            customization: customizationFor(cuisine.id, category),
          });
          dishIds.push(did);
          d++;
        });
        menuCats.push({ category, dishIds });
      }
      restaurants.push({
        id: rid,
        name,
        cuisineId: cuisine.id,
        cuisine: cuisine.name,
        description: `${cuisine.name} favourites, prepared fresh to order at ${name}.`,
        cover: img(pick(IMG[tpl.pool], ni), 1000),
        logo: img(pick(IMG.cover, r), 200),
        rating,
        ratingCount: 120 + r * 37,
        deliveryMinutes: deliveryMin,
        deliveryFee: Number(deliveryFee.toFixed(2)),
        priceLevel,
        freeDelivery,
        offers,
        distanceKm: Number((0.6 + (r % 7) * 0.45).toFixed(1)),
        lat: Number((baseLat + (r - 10) * 0.004).toFixed(6)),
        lng: Number((baseLng + (r - 10) * 0.004).toFixed(6)),
        address: `${100 + r} Av. Reforma, Col. Centro`,
      });
      menus[rid] = menuCats;
      r++;
    });
  }
  return { restaurants, menus, dishes };
}

const { restaurants, menus, dishes } = buildRestaurants();

// ---------------------------------------------------------------------------
// User, addresses, banners, promos, favorites, orders, notifications
// ---------------------------------------------------------------------------
const user = {
  id: 'usr_01',
  name: 'Sofia Ramírez',
  email: 'sofia@example.com',
  phone: '+52 55 1234 5678',
  avatar: portrait('women', 44),
};

const addresses = [
  { id: 'adr_01', userId: 'usr_01', label: 'Home', line1: 'Av. Insurgentes Sur 1234', line2: 'Apt 5B', city: 'Mexico City', notes: 'Ring the bell twice', lat: 19.3700, lng: -99.1760, isDefault: true },
  { id: 'adr_02', userId: 'usr_01', label: 'Work', line1: 'Paseo de la Reforma 222', line2: 'Floor 12', city: 'Mexico City', notes: 'Leave at reception', lat: 19.4270, lng: -99.1677, isDefault: false },
  { id: 'adr_03', userId: 'usr_01', label: "Mom's", line1: 'Calle Madero 45', line2: '', city: 'Mexico City', notes: '', lat: 19.4338, lng: -99.1400, isDefault: false },
];

const banners = [
  { id: 'ban_01', title: '20% off your first order', subtitle: 'Use code NOMLY20', image: img(IMG.pizza[3], 1000), restaurantId: 'rst_01' },
  { id: 'ban_02', title: 'Free delivery all week', subtitle: 'On orders over $20', image: img(IMG.burger[1], 1000), restaurantId: 'rst_04' },
  { id: 'ban_03', title: 'Sushi night', subtitle: 'Buy one roll get one free', image: img(IMG.sushi[0], 1000), restaurantId: 'rst_07' },
  { id: 'ban_04', title: 'Sweet treats', subtitle: 'Desserts from $4', image: img(IMG.dessert[0], 1000), restaurantId: 'rst_19' },
];

const promos = [
  { id: 'promo_01', code: 'NOMLY20', valid: true, discountPct: 20, description: '20% off your order', minSubtotal: 0 },
  { id: 'promo_02', code: 'FREESHIP', valid: true, discountPct: 0, freeDelivery: true, description: 'Free delivery', minSubtotal: 15 },
  { id: 'promo_03', code: 'TACO10', valid: true, discountPct: 10, description: '10% off', minSubtotal: 10 },
];

const favorites = { id: 'fav_01', userId: 'usr_01', restaurants: ['rst_01', 'rst_07'], dishes: [dishes[0].id, dishes[20].id] };

// Helper to build an order item snapshot from a dish
function orderItem(dish, qty, selected) {
  const extra = (selected || []).reduce((s, o) => s + o.priceDelta, 0);
  return {
    dishId: dish.id,
    restaurantId: dish.restaurantId,
    name: dish.name,
    image: dish.image,
    unitPrice: dish.price,
    quantity: qty,
    selectedOptions: selected || [],
    lineTotal: Number(((dish.price + extra) * qty).toFixed(2)),
    instructions: '',
  };
}

function totalsFor(items, { deliveryFee = 2.49, tip = 2.0, discountPct = 0 } = {}) {
  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const discount = Number((subtotal * discountPct / 100).toFixed(2));
  const serviceFee = Number((subtotal * 0.05).toFixed(2));
  const tax = Number(((subtotal - discount) * 0.08).toFixed(2));
  const total = Number((subtotal - discount + deliveryFee + serviceFee + tax + tip).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), discount, deliveryFee, serviceFee, tax, tip, total };
}

const STATUS_STEPS = ['confirmed', 'preparing', 'picked_up', 'on_the_way', 'delivered'];

// 5 past (delivered) orders + 1 active
const pastDates = [
  '2026-06-02T19:24:00Z', '2026-05-28T13:10:00Z', '2026-05-20T20:05:00Z',
  '2026-05-11T12:40:00Z', '2026-04-30T21:15:00Z',
];
const orders = [];
for (let i = 0; i < 5; i++) {
  const rst = restaurants[i * 3 % restaurants.length];
  const rdishes = dishes.filter((x) => x.restaurantId === rst.id).slice(0, 3);
  const items = [orderItem(rdishes[0], 1, []), orderItem(rdishes[1], 2, [])];
  const totals = totalsFor(items, { deliveryFee: rst.deliveryFee, tip: 2.0, discountPct: 0 });
  orders.push({
    id: `ord_${String(i + 1).padStart(3, '0')}`,
    userId: 'usr_01',
    restaurantId: rst.id,
    restaurantName: rst.name,
    restaurantCover: rst.cover,
    addressId: 'adr_01',
    items,
    totals,
    promoCode: null,
    paymentMethod: 'Visa •••• 4242',
    scheduledFor: null,
    status: 'delivered',
    placedAt: pastDates[i],
    etaMinutes: 0,
  });
}

// Active order with courier coordinates moving toward the delivery address.
const activeRst = restaurants[6];
const activeDishes = dishes.filter((x) => x.restaurantId === activeRst.id).slice(0, 3);
const activeItems = [orderItem(activeDishes[0], 2, []), orderItem(activeDishes[2], 1, [])];
const activeTotals = totalsFor(activeItems, { deliveryFee: activeRst.deliveryFee, tip: 3.0, discountPct: 0 });
const activeOrder = {
  id: 'ord_active',
  userId: 'usr_01',
  restaurantId: activeRst.id,
  restaurantName: activeRst.name,
  restaurantCover: activeRst.cover,
  addressId: 'adr_01',
  items: activeItems,
  totals: activeTotals,
  promoCode: 'NOMLY20',
  paymentMethod: 'Visa •••• 4242',
  scheduledFor: null,
  status: 'on_the_way',
  placedAt: '2026-06-17T18:05:00Z',
  etaMinutes: 12,
  courier: {
    name: 'Diego Hernández',
    avatar: portrait('men', 32),
    phone: '+52 55 9876 5432',
    lat: activeRst.lat,
    lng: activeRst.lng,
  },
  // route from restaurant -> delivery address (interpolated by the API/app)
  route: [
    [activeRst.lat, activeRst.lng],
    [(activeRst.lat + 19.3700) / 2, (activeRst.lng + -99.1760) / 2],
    [19.3700, -99.1760],
  ],
};
orders.push(activeOrder);

const notifications = [
  { id: 'ntf_01', type: 'order', title: 'Your order is on the way!', body: `${activeRst.name} • Diego is heading to you`, read: false, date: '2026-06-17T18:20:00Z' },
  { id: 'ntf_02', type: 'order', title: 'Order delivered', body: 'Enjoy your meal from Napoli Wood-Fired', read: false, date: '2026-06-02T19:55:00Z' },
  { id: 'ntf_03', type: 'offer', title: '20% off this weekend', body: 'Use code NOMLY20 at checkout', read: true, date: '2026-06-15T09:00:00Z' },
  { id: 'ntf_04', type: 'offer', title: 'Free delivery week', body: 'On all orders over $20', read: true, date: '2026-06-12T09:00:00Z' },
  { id: 'ntf_05', type: 'order', title: 'Rate your last order', body: 'How was Sakura Sushi?', read: true, date: '2026-05-28T15:00:00Z' },
  { id: 'ntf_06', type: 'system', title: 'Welcome to Nomly 🎉', body: 'Find your next favourite meal', read: true, date: '2026-04-01T09:00:00Z' },
];

const db = {
  users: [user],
  addresses,
  cuisines,
  banners,
  restaurants,
  menus, // map keyed by restaurantId; served via custom route
  dishes,
  promos,
  favorites: [favorites],
  orders,
  notifications,
};

const out = path.join(__dirname, 'db.json');
fs.writeFileSync(out, JSON.stringify(db, null, 2));
console.log(`Wrote ${out}`);
console.log(`  ${restaurants.length} restaurants, ${dishes.length} dishes, ${orders.length} orders, ${cuisines.length} cuisines`);
