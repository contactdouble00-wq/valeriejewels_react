<?php
require_once __DIR__ . '/../api/database/storefront_content_migration.php';

function check($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE TABLE site_settings (`key` TEXT PRIMARY KEY, `value` TEXT);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, material TEXT, description TEXT, slug TEXT, price REAL);
CREATE TABLE product_variants (id INTEGER PRIMARY KEY, title TEXT, option1_value TEXT);
CREATE TABLE reviews (body TEXT);
CREATE TABLE orders (amount_paid_upfront REAL);');
$pdo->exec("INSERT INTO products VALUES (1, '18K Gold Pendant', 'Stainless Steel', 'Waterproof 316L stainless steel', '18k-gold-pendant', 999);
INSERT INTO product_variants VALUES (1, '18K Gold Plated', 'Gold');
INSERT INTO reviews VALUES ('My original review');
INSERT INTO orders VALUES (9);");
$insert = $pdo->prepare('INSERT INTO site_settings VALUES (?, ?)');
$returns = 'Returns unchanged: 5–7 days; unboxing video required.';
$insert->execute(['site_faqs', json_encode(['faqs' => [
    ['q' => 'COD?', 'a' => 'Partial COD: pay an advance token of ₹9 via UPI.'],
    ['q' => 'Materials?', 'a' => '316L stainless steel and coated with 18K Gold Physical Vapor Deposition (PVD) vacuum plating.'],
    ['q' => 'Returns?', 'a' => $returns],
]])]);
$insert->execute(['payment_settings', json_encode(['partial_advance' => 9, 'prepaid_discount' => 50, 'testimonial_quote' => 'Feels like 18K gold'])]);
$insert->execute(['homepage_content', json_encode(['subtitle' => '18K Gold Plated Stainless Steel', 'imageUrl' => '/18k-gold.jpg'])]);
migrateStorefrontContent($pdo);
$product = $pdo->query('SELECT * FROM products')->fetch(PDO::FETCH_ASSOC);
check($product['material'] === 'Oxidized Jewellery', 'Material was not corrected');
check($product['slug'] === '18k-gold-pendant' && (float)$product['price'] === 999.0, 'URL or price changed');
check(str_contains($product['description'], 'Waterproof'), 'Durability copy changed');
$settings = $pdo->query('SELECT `key`, `value` FROM site_settings')->fetchAll(PDO::FETCH_KEY_PAIR);
$faq = json_decode($settings['site_faqs'], true)['faqs'];
check(str_contains($faq[0]['a'], '₹49'), 'FAQ advance incorrect');
check(!preg_match('/stainless|18k|316L|PVD/i', $faq[1]['a']), 'Old material claims remain');
check($faq[2]['a'] === $returns, 'Return policy changed');
$payments = json_decode($settings['payment_settings'], true);
check($payments['partial_advance'] === 49 && $payments['prepaid_discount'] === 50, 'Payment settings incorrect');
check($payments['testimonial_quote'] === '', 'Obsolete testimonial claim remains');
check(json_decode($settings['homepage_content'], true)['imageUrl'] === '/18k-gold.jpg', 'Asset URL changed');
check($pdo->query('SELECT body FROM reviews')->fetchColumn() === 'My original review', 'Review changed');
check((float)$pdo->query('SELECT amount_paid_upfront FROM orders')->fetchColumn() === 9.0, 'Historical advance changed');
migrateStorefrontContent($pdo);
check($pdo->query('SELECT `key`, `value` FROM site_settings')->fetchAll(PDO::FETCH_KEY_PAIR) === $settings, 'Migration is not idempotent');
echo "Storefront content migration checks passed.\n";
