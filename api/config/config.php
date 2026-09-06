<?php
/**
 * Valerie Jewels - Local Environment Configuration
 */

$sample = require __DIR__ . '/config.sample.php';

// Fastrr sandbox credentials for testing
$sample['fastrr']['app_id'] = 'vj_fastrr_app_test';
$sample['fastrr']['secret_key'] = 'vj_fastrr_secret_test_2026';
$sample['fastrr']['sandbox'] = true;

return $sample;
