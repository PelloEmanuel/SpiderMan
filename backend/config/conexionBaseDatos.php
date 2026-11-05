<?php
/**
 * ============================================================================
 * Archivo: conexionBaseDatos.php
 * Descripción: Configura y crea la conexión PDO con la base de datos MariaDB
 *              en XAMPP, asegurando la creación automática de la base de datos
 *              'spiderman_db' y la tabla 'puntajes' en español.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// BLOQUE 1: Parámetros de configuración del servidor MariaDB (XAMPP local)
// ----------------------------------------------------------------------------
define('DB_HOST', '127.0.0.1');          // Servidor local de base de datos
define('DB_PORT', 3306);                 // Puerto por defecto de MariaDB / MySQL
define('DB_NAME', 'spiderman_db');       // Nombre de la base de datos del juego
define('DB_USER', 'root');               // Usuario administrador por defecto en XAMPP
define('DB_PASS', '');                   // En XAMPP local no lleva contraseña
define('DB_CHARSET', 'utf8mb4');         // Codificación UTF-8 completa

/**
 * Obtiene la conexión PDO activa hacia MariaDB y garantiza que la tabla exista.
 *
 * @return PDO Instancia de conexión lista para consultas preparadas.
 */
function obtenerConexion(): PDO
{
    // ------------------------------------------------------------------------
    // BLOQUE 2: Opciones de seguridad y comportamiento de PDO
    // ------------------------------------------------------------------------
    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    // ------------------------------------------------------------------------
    // BLOQUE 3: Conexión al motor MariaDB y creación automática del esquema
    // ------------------------------------------------------------------------
    try {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opciones);

        // Crea la base de datos si aún no existe y la selecciona
        $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $pdo->exec('USE `' . DB_NAME . '`');

        // Crea la tabla 'puntajes' en español si aún no existe
        $pdo->exec("CREATE TABLE IF NOT EXISTS `puntajes` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `nombre` VARCHAR(100) NOT NULL,
            `apellido` VARCHAR(100) NOT NULL,
            `puntos` INT NOT NULL,
            `tiempo_segundos` DECIMAL(10, 2) NOT NULL,
            `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_posiciones` (`puntos` DESC, `tiempo_segundos` ASC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        return $pdo;
    } catch (PDOException $e) {
        // --------------------------------------------------------------------
        // BLOQUE 4: Manejo seguro de errores de conexión
        // --------------------------------------------------------------------
        http_response_code(500);
        echo json_encode([
            'error' => 'Error de conexión a MariaDB. Verificá que el módulo MySQL esté iniciado en XAMPP.'
        ]);
        exit;
    }
}
