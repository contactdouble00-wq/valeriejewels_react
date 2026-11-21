<?php
/** One-time correction of stored catalogue copy and the partial-COD setting. */
function correctStorefrontMaterial(string $text): string {
    return preg_replace([
        '/(?:surgical-grade |premium |high-grade |lightweight )?(?:316L )?stainless steel(?: and 18K gold| with anti-tarnish gold plating| and waterproof gold plating)?/iu',
        '/18\s*K(?: Gold Physical Vapor Deposition \(PVD\) vacuum plating| gold plated| micro gold polish| gold vermeil| matte gold finish| gold| PVD plating| PVD)?/iu',
        '/micro gold polish/iu',
        '/316L Steel/iu',
    ], ['oxidized material', 'oxidized finish', 'oxidized finish', 'oxidized jewellery'], $text);
}

function migrateStorefrontContent(PDO $pdo): void {
    $flag = 'oxidized_material_partial_cod_49_v1';
    $check = $pdo->prepare('SELECT `value` FROM site_settings WHERE `key` = ?');
    $check->execute([$flag]);
    if ($check->fetchColumn()) return;

    $pdo->beginTransaction();
    try {
        // Do not change URLs, SKUs, prices, customer reviews or historical orders.
        foreach (['products' => ['name', 'short_description', 'description', 'material', 'meta_title', 'meta_description'],
                  'product_variants' => ['title', 'option1_value']] as $table => $fields) {
            foreach ($pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $changes = [];
                $values = [];
                foreach ($fields as $field) {
                    if (!isset($row[$field])) continue;
                    $value = $field === 'material' ? 'Oxidized Jewellery' : correctStorefrontMaterial($row[$field]);
                    if ($value === $row[$field]) continue;
                    $changes[] = "`$field` = ?";
                    $values[] = $value;
                }
                if ($changes) {
                    $values[] = $row['id'];
                    $pdo->prepare("UPDATE `$table` SET " . implode(', ', $changes) . ' WHERE id = ?')->execute($values);
                }
            }
        }

        $read = $pdo->prepare('SELECT `value` FROM site_settings WHERE `key` = ?');
        $write = $pdo->prepare('UPDATE site_settings SET `value` = ? WHERE `key` = ?');
        foreach (['homepage_content', 'site_faqs', 'payment_settings'] as $key) {
            $read->execute([$key]);
            $raw = $read->fetchColumn();
            if ($raw === false) continue;
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            if ($key === 'payment_settings') {
                $data['partial_advance'] = 49;
                // Remove the obsolete material claim without rewriting a customer's quote.
                if (isset($data['testimonial_quote']) && preg_match('/18\s*k|stainless/iu', $data['testimonial_quote'])) {
                    $data['testimonial_quote'] = '';
                }
            } else {
                array_walk_recursive($data, function (&$value, $field) use ($key) {
                    if (!is_string($value) || preg_match('/url|slug|image|video|quote|review/i', (string)$field)) return;
                    $value = correctStorefrontMaterial($value);
                    if ($key === 'site_faqs' && $field === 'a' && stripos($value, 'Partial COD') !== false) {
                        $value = preg_replace('/(advance token of\s*)₹\s*\d+/u', '${1}₹49', $value);
                    }
                });
            }
            $write->execute([json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $key]);
        }
        $pdo->prepare('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?)')->execute([$flag, '1']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
