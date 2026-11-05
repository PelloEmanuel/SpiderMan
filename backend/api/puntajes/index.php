<?php
/**
 * ============================================================================
 * Archivo: backend/api/puntajes/index.php
 * Descripción: Endpoint principal de la API REST para consultar la Tabla de
 *              Posiciones (GET) y registrar nuevos puntajes (POST) en MariaDB.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// BLOQUE 1: Carga de configuraciones de CORS, base de datos y utilidades
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/cabecerasCors.php';
require_once __DIR__ . '/../../config/conexionBaseDatos.php';
require_once __DIR__ . '/../../config/funcionesAuxiliares.php';

$pdo    = obtenerConexion();
$metodo = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------------------------
// BLOQUE 2: Método GET - Obtener los mejores 20 puntajes de la tabla
// Criterio: 1º Mayor puntaje (DESC), 2º Menor tiempo en segundos (ASC).
// ----------------------------------------------------------------------------
if ($metodo === 'GET') {
    try {
        $stmt = $pdo->query("SELECT `id`, `nombre`, `apellido`, `puntos`, `tiempo_segundos`, `fecha`
                             FROM `puntajes`
                             ORDER BY `puntos` DESC, `tiempo_segundos` ASC
                             LIMIT 20");
        responderJson([
            'success' => true,
            'scores'  => $stmt->fetchAll()
        ]);
    } catch (PDOException $e) {
        responderJson(['error' => 'Error al consultar la tabla de posiciones.'], 500);
    }
}

// ----------------------------------------------------------------------------
// BLOQUE 3: Método POST - Registrar un nuevo puntaje en la tabla 'puntajes'
// ----------------------------------------------------------------------------
if ($metodo === 'POST') {
    $datos = leerDatosPeticion();

    // Extracción y limpieza de campos en español
    $nombre   = trim($datos['nombre'] ?? '');
    $apellido = trim($datos['apellido'] ?? '');
    $puntos   = intval($datos['puntos'] ?? 0);
    $tiempo   = floatval($datos['tiempo_segundos'] ?? ($datos['tiempo'] ?? 0));

    // Límite máximo de puntos: 40.000 pts (aparición del último jefe Doctor Doom)
    if ($puntos > 40000) {
        $puntos = 40000;
    }
    if ($puntos < 0) {
        $puntos = 0;
    }
    if ($tiempo < 0) {
        $tiempo = 0;
    }

    // Recorte seguro a 100 caracteres según VARCHAR(100)
    $nombre   = mb_substr($nombre, 0, 100);
    $apellido = mb_substr($apellido, 0, 100);

    // Validación de campos obligatorios
    if ($nombre === '' || $apellido === '') {
        responderJson(['error' => 'El nombre y el apellido son obligatorios.'], 400);
    }

    try {
        // Inserción segura mediante consulta preparada
        $stmt = $pdo->prepare("INSERT INTO `puntajes` (`nombre`, `apellido`, `puntos`, `tiempo_segundos`)
                               VALUES (?, ?, ?, ?)");
        $stmt->execute([$nombre, $apellido, $puntos, $tiempo]);
        $idInsertado = $pdo->lastInsertId();

        // Cálculo de la posición obtenida en el ranking global
        $rankStmt = $pdo->prepare("SELECT COUNT(*) + 1 AS `posicion` FROM `puntajes`
                                   WHERE `puntos` > ? OR (`puntos` = ? AND `tiempo_segundos` < ?)");
        $rankStmt->execute([$puntos, $puntos, $tiempo]);
        $posicion = $rankStmt->fetchColumn();

        // Consulta del listado actualizado del Top 20
        $stmt = $pdo->query("SELECT `id`, `nombre`, `apellido`, `puntos`, `tiempo_segundos`, `fecha`
                             FROM `puntajes`
                             ORDER BY `puntos` DESC, `tiempo_segundos` ASC
                             LIMIT 20");

        responderJson([
            'success' => true,
            'id'      => $idInsertado,
            'rank'    => $posicion,
            'scores'  => $stmt->fetchAll()
        ], 201);
    } catch (PDOException $e) {
        responderJson(['error' => 'Error al guardar el puntaje en la base de datos.'], 500);
    }
}

// ----------------------------------------------------------------------------
// BLOQUE 4: Respuesta para métodos HTTP no soportados
// ----------------------------------------------------------------------------
responderJson(['error' => 'Método HTTP no permitido.'], 405);
