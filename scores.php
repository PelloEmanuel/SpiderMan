<?php
// =============================================================================
// API REST DE PUNTAJES (PHP + MariaDB en XAMPP Local)
// =============================================================================
// Este script gestiona la conexión local con MariaDB en XAMPP, crea la base de
// datos y la tabla en español automáticamente, y administra el ranking de jugadores.

// -----------------------------------------------------------------------------
// Bloque 1: Encabezados HTTP para respuestas JSON y permisos locales (CORS)
// -----------------------------------------------------------------------------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Respuesta inmediata para peticiones de verificación previa del navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// -----------------------------------------------------------------------------
// Bloque 2: Parámetros de conexión a MariaDB en XAMPP
// -----------------------------------------------------------------------------
$host   = '127.0.0.1';
$port   = 3306;
$user   = 'root';
$pass   = '';
$dbname = 'spiderman_db';

// -----------------------------------------------------------------------------
// Bloque 3: Conexión PDO y creación automática de Base de Datos y Tabla
// -----------------------------------------------------------------------------
try {
    // Conexión inicial al servidor MariaDB de XAMPP
    $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Crea la base de datos si no existe y la selecciona
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");

    // Crea la tabla 'puntajes' con todas sus columnas en español si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS `puntajes` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `nombre` VARCHAR(100) NOT NULL,
        `apellido` VARCHAR(100) NOT NULL,
        `puntos` INT NOT NULL,
        `tiempo_segundos` DECIMAL(10, 2) NOT NULL,
        `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_posiciones` (`puntos` DESC, `tiempo_segundos` ASC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a MariaDB en XAMPP: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// -----------------------------------------------------------------------------
// Bloque 4: Método GET - Consultar los mejores 20 puntajes de la tabla
// -----------------------------------------------------------------------------
// Ordena primero por mayor puntaje (DESC) y desempata por menor tiempo (ASC).
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT `id`, `nombre`, `apellido`, `puntos`, `tiempo_segundos`, `fecha`
                             FROM `puntajes`
                             ORDER BY `puntos` DESC, `tiempo_segundos` ASC
                             LIMIT 20");
        echo json_encode(['success' => true, 'scores' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener la tabla de puntajes: ' . $e->getMessage()]);
    }
    exit;
}

// -----------------------------------------------------------------------------
// Bloque 5: Método POST - Registrar el puntaje y tiempo de un jugador
// -----------------------------------------------------------------------------
if ($method === 'POST') {
    // Lee los datos enviados en formato JSON desde el formulario del juego
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) {
        $data = $_POST;
    }

    // Limpieza y extracción de variables en español
    $nombre   = trim($data['nombre'] ?? '');
    $apellido = trim($data['apellido'] ?? '');
    $puntos   = intval($data['puntos'] ?? 0);
    $tiempo   = floatval($data['tiempo_segundos'] ?? ($data['tiempo'] ?? 0));

    // Límite máximo de puntos: 40.000 pts (aparición del jefe final Doctor Doom)
    if ($puntos > 40000) {
        $puntos = 40000;
    }
    if ($puntos < 0) {
        $puntos = 0;
    }
    if ($tiempo < 0) {
        $tiempo = 0;
    }

    // Ajusta la longitud máxima a 100 caracteres según la tabla
    $nombre   = mb_substr($nombre, 0, 100);
    $apellido = mb_substr($apellido, 0, 100);

    // Verifica que nombre y apellido no estén vacíos
    if ($nombre === '' || $apellido === '') {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre y el apellido son obligatorios.']);
        exit;
    }

    try {
        // Inserta el nuevo registro de forma segura con consulta preparada
        $stmt = $pdo->prepare("INSERT INTO `puntajes` (`nombre`, `apellido`, `puntos`, `tiempo_segundos`)
                               VALUES (?, ?, ?, ?)");
        $stmt->execute([$nombre, $apellido, $puntos, $tiempo]);
        $insertedId = $pdo->lastInsertId();

        // Calcula en qué puesto del ranking quedó el jugador
        $rankStmt = $pdo->prepare("SELECT COUNT(*) + 1 AS `posicion` FROM `puntajes`
                                   WHERE `puntos` > ? OR (`puntos` = ? AND `tiempo_segundos` < ?)");
        $rankStmt->execute([$puntos, $puntos, $tiempo]);
        $rank = $rankStmt->fetchColumn();

        // Obtiene la lista actualizada del Top 20 para refrescar la tabla
        $stmt = $pdo->query("SELECT `id`, `nombre`, `apellido`, `puntos`, `tiempo_segundos`, `fecha`
                             FROM `puntajes`
                             ORDER BY `puntos` DESC, `tiempo_segundos` ASC
                             LIMIT 20");

        echo json_encode([
            'success' => true,
            'id'      => $insertedId,
            'rank'    => $rank,
            'scores'  => $stmt->fetchAll()
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar el puntaje en MariaDB: ' . $e->getMessage()]);
    }
    exit;
}

// -----------------------------------------------------------------------------
// Bloque 6: Respuesta para métodos HTTP no permitidos
// -----------------------------------------------------------------------------
http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
