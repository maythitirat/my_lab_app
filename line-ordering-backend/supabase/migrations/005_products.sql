-- 005_products.sql
-- Create products table and seed with initial data

CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  price        DECIMAL(10, 2) NOT NULL,
  category     VARCHAR(100) NOT NULL DEFAULT '',
  image_url    TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- Seed with initial products
INSERT INTO products (name, price, category, image_url, sort_order) VALUES
  ('Organic Green Tea',      120, 'Beverages', 'https://picsum.photos/seed/p001/400/400', 1),
  ('Iced Matcha Latte',      150, 'Beverages', 'https://picsum.photos/seed/p002/400/400', 2),
  ('Cold Brew Coffee',       130, 'Beverages', 'https://picsum.photos/seed/p003/400/400', 3),
  ('Fresh Orange Juice',      90, 'Beverages', 'https://picsum.photos/seed/p004/400/400', 4),
  ('Strawberry Smoothie',    145, 'Beverages', 'https://picsum.photos/seed/p005/400/400', 5),
  ('Avocado Toast',          180, 'Breakfast', 'https://picsum.photos/seed/p006/400/400', 6),
  ('Butter Croissant',        85, 'Breakfast', 'https://picsum.photos/seed/p007/400/400', 7),
  ('Blueberry Pancakes',     200, 'Breakfast', 'https://picsum.photos/seed/p008/400/400', 8),
  ('Granola Yogurt Bowl',    155, 'Breakfast', 'https://picsum.photos/seed/p009/400/400', 9),
  ('Eggs Benedict',          220, 'Breakfast', 'https://picsum.photos/seed/p010/400/400', 10),
  ('Margherita Pizza',       280, 'Mains',     'https://picsum.photos/seed/p011/400/400', 11),
  ('BBQ Chicken Pizza',      320, 'Mains',     'https://picsum.photos/seed/p012/400/400', 12),
  ('Classic Beef Burger',    290, 'Mains',     'https://picsum.photos/seed/p013/400/400', 13),
  ('Mushroom Veggie Burger', 260, 'Mains',     'https://picsum.photos/seed/p014/400/400', 14),
  ('Grilled Salmon',         380, 'Mains',     'https://picsum.photos/seed/p015/400/400', 15),
  ('Chicken Alfredo Pasta',  290, 'Mains',     'https://picsum.photos/seed/p016/400/400', 16),
  ('Pad Thai',               120, 'Thai',      'https://picsum.photos/seed/p017/400/400', 17),
  ('Tom Yum Soup',           150, 'Thai',      'https://picsum.photos/seed/p018/400/400', 18),
  ('Green Curry',            160, 'Thai',      'https://picsum.photos/seed/p019/400/400', 19),
  ('Mango Sticky Rice',      100, 'Thai',      'https://picsum.photos/seed/p020/400/400', 20),
  ('Caesar Salad',           165, 'Salads',    'https://picsum.photos/seed/p021/400/400', 21),
  ('Greek Salad',            150, 'Salads',    'https://picsum.photos/seed/p022/400/400', 22),
  ('Quinoa Power Bowl',      195, 'Salads',    'https://picsum.photos/seed/p023/400/400', 23),
  ('Blueberry Cheesecake',   220, 'Desserts',  'https://picsum.photos/seed/p024/400/400', 24),
  ('Tiramisu',               240, 'Desserts',  'https://picsum.photos/seed/p025/400/400', 25),
  ('Chocolate Lava Cake',    210, 'Desserts',  'https://picsum.photos/seed/p026/400/400', 26),
  ('Mango Sorbet',           120, 'Desserts',  'https://picsum.photos/seed/p027/400/400', 27),
  ('Crispy Chicken Wings',   240, 'Snacks',    'https://picsum.photos/seed/p028/400/400', 28),
  ('Sweet Potato Fries',     110, 'Snacks',    'https://picsum.photos/seed/p029/400/400', 29),
  ('Truffle Edamame',        130, 'Snacks',    'https://picsum.photos/seed/p030/400/400', 30)
ON CONFLICT DO NOTHING;
