<?php
$pdo = new PDO('sqlite:' . __DIR__ . '/../api/database/vj_live_store.sqlite');
$stmt = $pdo->query("SELECT id, order_number, payment_status, order_status, fastrr_order_id, amount_paid_upfront FROM orders ORDER BY id DESC LIMIT 5");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
