<?php
// ==========================================
// API REST DE PUNTAJES (PHP + PostgreSQL en Render)
// ==========================================
// La conexión se lee de variables de entorno (nada de claves en el código):
//   DATABASE_URL  -> postgresql://usuario:clave@host:5432/basedatos   (recomendado)
//   o bien DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ------------------------------------------
// Parámetros de conexión
// ------------------------------------------
$url = getenv('DATABASE_URL');
if ($url) {
    $p = parse_url($url);
    $host   = $p['host'] ?? '127.0.0.1';
    $port   = $p['port'] ?? 5432;
    $dbname = ltrim($p['path'] ?? '', '/');
    $user   = isset($p['user']) ? urldecode($p['user']) : '';
    $pass   = isset($p['pass']) ? urldecode($p['pass']) : '';
} else {
    $host   = getenv('DB_HOST') ?: '127.0.0.1';
    $port   = getenv('DB_PORT') ?: 5432;
    $dbname = getenv('DB_NAME') ?: 'spiderman_db';
    $user   = getenv('DB_USER') ?: 'postgres';
    $pass   = getenv('DB_PASSWORD') ?: '';
}

// La URL externa de Render exige SSL; la interna no lo necesita.
$sslmode = getenv('DB_SSLMODE') ?: (strpos($host, '.render.com') !== false ? 'require' : 'prefer');

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Crea la tabla automáticamente si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS puntajes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        puntos INTEGER NOT NULL,
        tiempo_segundos NUMERIC(10, 2) NOT NULL,
        fecha TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
    )");
} catch (PDOException $e) {
    http_response_code(500);
    // No se expone el detalle del error (podría revelar datos de conexión); queda en los logs de Render.
    error_log('DB connection error: ' . $e->getMessage());
    echo json_encode(['error' => 'Error de conexión a la base de datos.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// ------------------------------------------
// GET: mejores puntajes (mayor puntaje, luego menor tiempo)
// ------------------------------------------
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, nombre, apellido, puntos, tiempo_segundos, fecha
                             FROM puntajes
                             ORDER BY puntos DESC, tiempo_segundos ASC
                             LIMIT 20");
        echo json_encode(['success' => true, 'scores' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('DB get error: ' . $e->getMessage());
        echo json_encode(['error' => 'Error al obtener puntajes.']);
    }
    exit;
}

// ------------------------------------------
// POST: registra un nuevo puntaje
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

    // Límite máximo de puntos: Doctor Doom (40.000)
    if ($puntos > 40000) {
        $puntos = 40000;
    }
    if ($puntos < 0) {
        $puntos = 0;
    }
    if ($tiempo < 0) {
        $tiempo = 0;
    }

    // Recorta para respetar VARCHAR(100)
    $nombre = mb_substr($nombre, 0, 100);
    $apellido = mb_substr($apellido, 0, 100);

    if ($nombre === '' || $apellido === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre y apellido son obligatorios.']);
        exit;
    }

    try {
        // En PostgreSQL se usa RETURNING en vez de lastInsertId()
        $stmt = $pdo->prepare("INSERT INTO puntajes (nombre, apellido, puntos, tiempo_segundos)
                               VALUES (?, ?, ?, ?) RETURNING id");
        $stmt->execute([$nombre, $apellido, $puntos, $tiempo]);
        $insertedId = $stmt->fetchColumn();

        // Posición en el ranking
        $rankStmt = $pdo->prepare("SELECT COUNT(*) + 1 AS posicion FROM puntajes
                                   WHERE puntos > ? OR (puntos = ? AND tiempo_segundos < ?)");
        $rankStmt->execute([$puntos, $puntos, $tiempo]);
        $rank = $rankStmt->fetchColumn();

        $stmt = $pdo->query("SELECT id, nombre, apellido, puntos, tiempo_segundos, fecha
                             FROM puntajes
                             ORDER BY puntos DESC, tiempo_segundos ASC
                             LIMIT 20");

        echo json_encode([
            'success' => true,
            'id' => $insertedId,
            'rank' => $rank,
            'scores' => $stmt->fetchAll()
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('DB insert error: ' . $e->getMessage());
        echo json_encode(['error' => 'Error al guardar puntaje.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
