<?php
require __DIR__ . '/api/config/database.php';
$pdo = Database::getConnection();
$stmt = $pdo->prepare("SELECT value FROM site_settings WHERE key = ?");
$stmt->execute(["homepage_content"]);
$res = $stmt->fetch(PDO::FETCH_ASSOC);
$data = json_decode($res["value"], true);
echo "Driver: " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) . "\n";
echo "Keys in homepage_content: " . implode(', ', array_keys($data ?? [])) . "\n";
$driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
$data['festivalOffer']['enabled'] = true;
$jsonValue = json_encode($data, JSON_UNESCAPED_SLASHESS | JSON_UNESCAPED_UNICODE);

if ($driver === 'sqlite') {
    $stmt = $pdo->prepare("
        INSERT INTO site_settings (key, value, updated_at)
        VALUES ('homepage_content', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    ");
    $stmt->execute([$jsonValue]);
} else {
    $stmt = $pdo->prepare("
        INSERT INTO `site_settings` (`key`, `value`)
        VALUES ('homepage_content', ?)
        ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()
    ");
    $stmt->execute([$jsonValue]);
}

$stmt2 = $pdo->prepare("SELECT value FROM site_settings WHERE key = 'homepage_content'");
$stmt2->execute();
$fresh = json_decode($stmt2->fetch(PDO::FETCH_ASSOC)['value'], true);
echo "Updated festivalOffer enabled: " . var_export($fresh['festivalOffer']['enabled'], true) . "\n";


