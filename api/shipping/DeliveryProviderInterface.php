<?php
/**
 * VALERIE JEWELS — Common Delivery Provider Interface
 * Standardizes delivery partner operations (Shiprocket, JustShyp, etc.)
 * behind one uniform strategy/adapter interface.
 */

interface DeliveryProviderInterface
{
    /**
     * Get unique provider identifier ('shiprocket' | 'justshyp')
     */
    public function getName(): string;

    /**
     * Check pincode serviceability
     * @param array $params ['pickup_pincode' => string, 'drop_pincode' => string, 'payment_mode' => 'COD'|'PPD']
     * @return array Standardized serviceability response ['success' => bool, 'serviceable' => bool, 'couriers' => array, ...]
     */
    public function checkServiceability(array $params): array;

    /**
     * Calculate courier rates for a shipment
     * @param array $params ['pickup_pincode', 'drop_pincode', 'payment_mode', 'package' => ['weight', 'length', 'breadth', 'height']]
     * @return array Standardized rate list [['courier_name' => string, 'rate' => float, 'etd' => string, ...]]
     */
    public function getRates(array $params): array;

    /**
     * Create shipment / book order with courier
     * @param int $orderId Valerie Jewels internal order ID
     * @param array $options Optional courier preference, notes, etc.
     * @return array Standardized shipment response ['success' => bool, 'provider' => string, 'order_id' => string, 'shipment_id' => string, 'awb_code' => string, 'courier_name' => string, 'tracking_url' => string, ...]
     */
    public function createShipment(int $orderId, array $options = []): array;

    /**
     * Create reverse pickup shipment for returns / exchanges
     * @param int $orderId Valerie Jewels internal order ID
     * @param array $options Optional return reason, pickup address override, etc.
     * @return array Standardized reverse shipment response
     */
    public function createReverseShipment(int $orderId, array $options = []): array;

    /**
     * Cancel an active shipment before pickup
     * @param int $orderId Valerie Jewels internal order ID
     * @return array Standardized cancel response ['success' => bool, 'message' => string, ...]
     */
    public function cancelShipment(int $orderId): array;

    /**
     * Track shipment status and milestones by AWB
     * @param string $awb AWB code / Waybill number
     * @return array Standardized tracking details ['success' => bool, 'awb' => string, 'current_status' => string, 'normalized_status' => string, 'events' => array, ...]
     */
    public function track(string $awb): array;

    /**
     * Retrieve shipping label (4x6 thermal) and/or invoice PDF URL
     * @param string $awb AWB code
     * @return array ['success' => bool, 'label_url' => string|null, 'invoice_url' => string|null, ...]
     */
    public function getLabel(string $awb): array;

    /**
     * Schedule courier pickup from warehouse
     * @param array $params ['awb' => string, 'warehouse_id' => string|int, 'pickup_date' => string 'YYYY-MM-DD']
     * @return array ['success' => bool, 'pickup_id' => string|null, 'message' => string, ...]
     */
    public function schedulePickup(array $params): array;

    /**
     * Generate shipment manifest for handover to courier
     * @param array $params ['awb' => string, 'warehouse_id' => string|int]
     * @return array ['success' => bool, 'manifest_url' => string|null, ...]
     */
    public function generateManifest(array $params): array;

    /**
     * List NDR (Non-Delivery Report) shipments
     * @param array $params ['ndr_type' => 'initiated'|'rto', 'from_date' => 'YYYY-MM-DD', 'to_date' => 'YYYY-MM-DD']
     * @return array ['success' => bool, 'ndr_shipments' => array, ...]
     */
    public function listNdr(array $params): array;

    /**
     * Take action on NDR shipment (reattempt, RTO, address update, phone update)
     * @param array $params ['awb' => string, 'action' => string, 'phone' => string|null, 'address' => string|null]
     * @return array ['success' => bool, 'message' => string, ...]
     */
    public function ndrAction(array $params): array;

    /**
     * Sync or create pickup warehouse address with provider
     * @param array $warehouseData ['title', 'sender_name', 'phone', 'full_address', 'pincode', 'city', 'state']
     * @return array ['success' => bool, 'warehouse_id' => string|int, ...]
     */
    public function syncWarehouse(array $warehouseData): array;

    /**
     * List all registered pickup warehouses
     * @return array ['success' => bool, 'warehouses' => array, ...]
     */
    public function listWarehouses(): array;

    /**
     * Test API connection with provided or saved credentials
     * @param array|null $credentials Optional credential overrides
     * @return array ['success' => bool, 'message' => string, ...]
     */
    public function testConnection(?array $credentials = null): array;
}
