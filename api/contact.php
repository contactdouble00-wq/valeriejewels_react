<?php
/**
 * VALERIE JEWELS — Public Contact & Concierge Inquiry Endpoint
 * Receives customer messages, logs inquiries to database, and generates 1-click WhatsApp concierge link.
 */

require_once __DIR__ . '/utils/cors.php';
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/mailer.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$rawInput = trim(file_get_contents('php://input'));
$data = json_decode($rawInput, true);
if (!is_array($data) && !empty($_POST)) {
    $data = $_POST;
}

if (!is_array($data)) {
    ApiResponse::error('Invalid input provided', 400);
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$orderNumber = trim($data['order_number'] ?? '');
$subject = trim($data['subject'] ?? 'General Inquiry');
$message = trim($data['message'] ?? '');

if (empty($name)) {
    ApiResponse::error('Please provide your name', 422);
}
if (empty($message)) {
    ApiResponse::error('Please enter your message or inquiry', 422);
}
if (empty($email) && empty($phone)) {
    ApiResponse::error('Please provide either an email or phone number so we can reach back', 422);
}

try {
    $pdo = Database::getConnection();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    // Create table if not exists
    if ($driver === 'sqlite') {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS contact_inquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                order_number TEXT,
                subject TEXT,
                message TEXT NOT NULL,
                ip_address TEXT,
                status TEXT DEFAULT 'new',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
    } else {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `contact_inquiries` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(150) NOT NULL,
                `email` VARCHAR(150),
                `phone` VARCHAR(50),
                `order_number` VARCHAR(100),
                `subject` VARCHAR(200),
                `message` TEXT NOT NULL,
                `ip_address` VARCHAR(60),
                `status` ENUM('new', 'in_progress', 'resolved') DEFAULT 'new',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (`created_at`),
                INDEX (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? '';

    $stmt = $pdo->prepare("
        INSERT INTO contact_inquiries (name, email, phone, order_number, subject, message, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$name, $email, $phone, $orderNumber, $subject, $message, $ip]);
    $inquiryId = (int)$pdo->lastInsertId();

    // Generate WhatsApp direct concierge pre-filled URL
    $whatsappNumber = '919023422392';
    $waText = "Hello Valerie Jewels Atelier,\n\n"
        . "My name is {$name}.\n"
        . (!empty($orderNumber) ? "Order #: {$orderNumber}\n" : "")
        . (!empty($subject) ? "Topic: {$subject}\n" : "")
        . "Message: {$message}\n\n"
        . "Please assist me. Thank you!";
    $whatsappUrl = "https://wa.me/{$whatsappNumber}?text=" . rawurlencode($waText);

    // Attempt email alert if mailer is available (fail silently if SMTP not configured)
    try {
        $adminEmail = 'orders@valeriejewels.in';
        $emailSubject = "New Atelier Inquiry #{$inquiryId} from {$name}: {$subject}";
        $emailBody = "<h3>New Atelier Contact Inquiry #{$inquiryId}</h3>"
            . "<p><strong>Name:</strong> " . htmlspecialchars($name) . "</p>"
            . "<p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>"
            . "<p><strong>Phone:</strong> " . htmlspecialchars($phone) . "</p>"
            . (!empty($orderNumber) ? "<p><strong>Order #:</strong> " . htmlspecialchars($orderNumber) . "</p>" : "")
            . "<p><strong>Subject:</strong> " . htmlspecialchars($subject) . "</p>"
            . "<p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>";

        MailerService::sendDirect($adminEmail, $emailSubject, $emailBody);
    } catch (Throwable $me) {
        // Non-critical, ignore
    }

    ApiResponse::success([
        'inquiry_id' => $inquiryId,
        'whatsapp_url' => $whatsappUrl,
    ], 'Your message has been sent to our atelier team. We will respond promptly!');

} catch (Throwable $e) {
    ApiResponse::error('Failed to submit inquiry: ' . $e->getMessage(), 500);
}

