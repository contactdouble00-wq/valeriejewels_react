<?php
$pdo = new PDO('sqlite:' . __DIR__ . '/../api/database/vj_live_store.sqlite');
$stmt = $pdo->query("SELECT value FROM site_settings WHERE key = 'payment_settings'");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$data = $row ? json_decode($row['value'], true) : [];
$data['cod_available'] = false;
$data['partial_cod_enabled'] = true;
$data['partial_advance'] = 100;
$pdo->prepare("REPLACE INTO site_settings (key, value) VALUES ('payment_settings', ?)")->execute([json_encode($data)]);
echo "Updated site_settings: cod_available=false, partial_cod_enabled=true, partial_advance=100\n";
