<?php
// ==========================================
// API REST DE PUNTAJES (MARIADB / PHP)
// ==========================================
// Gestiona la conexión PDO, creación automática de base de datos y ordenamiento por puntos y tiempo.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ------------------------------------------
// Parámetros de Conexión a MariaDB (XAMPP)
// ------------------------------------------
$host = '127.0.0.1';
$user = 'root';
$pass = '';
$dbname = 'spiderman_db';

try {
    // Conexión PDO con creación automática de BD y tabla si no existen
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `puntajes` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `nombre` VARCHAR(100) NOT NULL,
        `apellido` VARCHAR(100) NOT NULL,
        `puntos` INT NOT NULL,
        `tiempo_segundos` DECIMAL(10, 2) NOT NULL,
        `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// ------------------------------------------
// MÉTODO GET: Consulta los mejores puntajes
// ------------------------------------------
// Criterio de clasificación: 1º Mayor Puntaje, 2º Menor Tiempo empleado
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, nombre, apellido, puntos, tiempo_segundos, fecha 
                             FROM `puntajes` 
                             ORDER BY puntos DESC, tiempo_segundos ASC 
                             LIMIT 20");
        $scores = $stmt->fetchAll();
        echo json_encode(['success' => true, 'scores' => $scores]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener puntajes: ' . $e->getMessage()]);
    }
    exit;
}

// ------------------------------------------
// MÉTODO POST: Registra un nuevo puntaje
// ------------------------------------------
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) {
        $data = $_POST;
    }

    $nombre = trim($data['nombre'] ?? '');
    $apellido = trim($data['apellido'] ?? '');
    $puntos = intval($data['puntos'] ?? 0);
    $tiempo = floatval($data['tiempo_segundos'] ?? ($data['tiempo'] ?? 0));

    // Límite máximo de puntos: puntaje necesario para el último jefe (Doctor Doom: 40.000)
    if ($puntos > 40000) {
        $puntos = 40000;
    }

    // Validación de campos obligatorios
    if ($nombre === '' || $apellido === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre y apellido son obligatorios.']);
        exit;
    }

    try {
        // Inserción preparada contra inyección SQL
        $stmt = $pdo->prepare("INSERT INTO `puntajes` (`nombre`, `apellido`, `puntos`, `tiempo_segundos`) VALUES (?, ?, ?, ?)");
        $stmt->execute([$nombre, $apellido, $puntos, $tiempo]);
        $insertedId = $pdo->lastInsertId();

        // Cálculo de posición en el ranking: más puntos va primero; si empatan, menor tiempo desempata
        $rankStmt = $pdo->prepare("SELECT COUNT(*) + 1 as rank FROM `puntajes` WHERE puntos > ? OR (puntos = ? AND tiempo_segundos < ?)");
        $rankStmt->execute([$puntos, $puntos, $tiempo]);
        $rank = $rankStmt->fetch()['rank'];

        // Obtener la tabla actualizada
        $stmt = $pdo->query("SELECT id, nombre, apellido, puntos, tiempo_segundos, fecha 
                             FROM `puntajes` 
                             ORDER BY puntos DESC, tiempo_segundos ASC 
                             LIMIT 20");
        $scores = $stmt->fetchAll();

        echo json_encode([
            'success' => true, 
            'id' => $insertedId, 
            'rank' => $rank,
            'scores' => $scores
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar puntaje: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
