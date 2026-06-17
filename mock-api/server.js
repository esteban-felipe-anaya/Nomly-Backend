/**
 * Nomly mock REST API.
 *
 * Built on json-server (a real json-server instance) plus a thin layer of
 * custom routes for the endpoints json-server can't express from a static
 * db.json alone: auth, promo validation, grouped restaurant menus, computed
 * order tracking, and rich restaurant filtering/sorting.
 *
 *   npm run seed   # (re)generate db.json
 *   npm start      # serve on http://localhost:3000
 */
const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const db = router.db; // lowdb instance
const middlewares = jsonServer.defaults({ logger: true });

server.use(middlewares);
server.use(jsonServer.bodyParser);

const FAKE_TOKEN = 'nomly-demo-token-usr_01';
const ok = (res, body) => res.jsonp(body);

function currentUser() {
  return db.get('users').first().value();
}

// --- Auth ------------------------------------------------------------------
server.post('/auth/login', (req, res) => {
  const user = currentUser();
  // Demo auth: any email/password works; returns the seeded user.
  return ok(res, { token: FAKE_TOKEN, user });
});

server.post('/auth/register', (req, res) => {
  const base = currentUser();
  const user = {
    ...base,
    name: req.body.name || base.name,
    email: req.body.email || base.email,
  };
  return ok(res, { token: FAKE_TOKEN, user });
});

server.get('/auth/me', (req, res) => ok(res, { user: currentUser() }));

// --- Promo validation ------------------------------------------------------
server.post('/promo/validate', (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal || 0);
  const promo = db.get('promos').find((p) => p.code === code).value();
  if (!promo) {
    return ok(res, { code, valid: false, discountPct: 0, reason: 'Code not found' });
  }
  if (subtotal < (promo.minSubtotal || 0)) {
    return ok(res, { code, valid: false, discountPct: 0, reason: `Minimum spend $${promo.minSubtotal}` });
  }
  return ok(res, {
    code,
    valid: true,
    discountPct: promo.discountPct || 0,
    freeDelivery: !!promo.freeDelivery,
    description: promo.description,
  });
});

// --- Restaurants: filtering + sorting --------------------------------------
server.get('/restaurants', (req, res) => {
  let list = db.get('restaurants').cloneDeep().value();
  const q = (req.query.q || '').toString().toLowerCase();
  const { cuisineId, minRating, priceLevel, freeDelivery, sort } = req.query;

  if (cuisineId) list = list.filter((r) => r.cuisineId === cuisineId);
  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q));
  if (minRating) list = list.filter((r) => r.rating >= Number(minRating));
  if (priceLevel) list = list.filter((r) => r.priceLevel === Number(priceLevel));
  if (freeDelivery === 'true' || freeDelivery === '1') list = list.filter((r) => r.freeDelivery);

  switch (sort) {
    case 'rating': list.sort((a, b) => b.rating - a.rating); break;
    case 'delivery_time': list.sort((a, b) => a.deliveryMinutes - b.deliveryMinutes); break;
    case 'distance': list.sort((a, b) => a.distanceKm - b.distanceKm); break;
    default: /* recommended */ list.sort((a, b) => (b.rating * 10 - b.deliveryMinutes) - (a.rating * 10 - a.deliveryMinutes));
  }

  // pagination
  const page = Number(req.query._page || 0);
  const limit = Number(req.query._limit || 0);
  res.setHeader('X-Total-Count', String(list.length));
  if (page && limit) {
    const start = (page - 1) * limit;
    list = list.slice(start, start + limit);
  }
  return ok(res, list);
});

function attachMenu(rst) {
  const menus = db.get('menus').value() || {};
  const dishes = db.get('dishes').value();
  const cats = (menus[rst.id] || []).map((c) => ({
    category: c.category,
    items: c.dishIds.map((id) => dishes.find((d) => d.id === id)).filter(Boolean),
  }));
  return { ...rst, menu: cats };
}

server.get('/restaurants/:id/menu', (req, res) => {
  const rst = db.get('restaurants').find({ id: req.params.id }).value();
  if (!rst) return res.status(404).jsonp({ message: 'Restaurant not found' });
  return ok(res, attachMenu(rst).menu);
});

server.get('/restaurants/:id', (req, res) => {
  const rst = db.get('restaurants').find({ id: req.params.id }).value();
  if (!rst) return res.status(404).jsonp({ message: 'Restaurant not found' });
  return ok(res, attachMenu(rst));
});

server.get('/dishes/:id', (req, res) => {
  const dish = db.get('dishes').find({ id: req.params.id }).value();
  if (!dish) return res.status(404).jsonp({ message: 'Dish not found' });
  return ok(res, dish);
});

// --- Orders ----------------------------------------------------------------
const STATUS_STEPS = [
  { key: 'confirmed', label: 'Order confirmed' },
  { key: 'preparing', label: 'Preparing your food' },
  { key: 'picked_up', label: 'Courier picked up' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
];

server.post('/orders', (req, res) => {
  const body = req.body || {};
  const orders = db.get('orders');
  const count = orders.size().value();
  const id = `ord_${String(count + 1).padStart(3, '0')}`;
  const rst = db.get('restaurants').find({ id: body.restaurantId }).value() || {};
  const order = {
    id,
    userId: 'usr_01',
    restaurantId: body.restaurantId,
    restaurantName: rst.name || 'Restaurant',
    restaurantCover: rst.cover || '',
    addressId: body.addressId,
    items: body.items || [],
    totals: body.totals || {},
    promoCode: body.promoCode || null,
    paymentMethod: body.paymentMethod || 'Card',
    scheduledFor: body.scheduledFor || null,
    status: 'confirmed',
    placedAt: body.placedAt || new Date().toISOString(),
    etaMinutes: 30,
    courier: {
      name: 'Diego Hernández',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      phone: '+52 55 9876 5432',
      lat: rst.lat || 19.4326,
      lng: rst.lng || -99.1332,
    },
    route: rst.lat ? [[rst.lat, rst.lng], [19.3700, -99.1760]] : [],
  };
  orders.push(order).write();
  return res.status(201).jsonp(order);
});

server.get('/orders/:id/tracking', (req, res) => {
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order) return res.status(404).jsonp({ message: 'Order not found' });
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const steps = STATUS_STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    done: i <= currentIndex,
    active: i === currentIndex,
  }));
  return ok(res, {
    orderId: order.id,
    status: order.status,
    etaMinutes: order.etaMinutes || 0,
    courier: order.courier || null,
    route: order.route || [],
    steps,
  });
});

// Default json-server router for: addresses (CRUD), cuisines, banners,
// orders (GET list/:id), notifications, favorites, users.
server.use(router);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Nomly mock API running on http://localhost:${PORT}`);
});
