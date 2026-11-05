<?php
/**
 * ============================================================================
 * Archivo: cabecerasCors.php
 * Descripción: Configura las cabeceras HTTP de CORS (Cross-Origin Resource Sharing)
 *              y el formato JSON UTF-8 para la comunicación con el frontend.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// BLOQUE 1: Permisos de origen cruzado (CORS)
// Permite que el frontend realice peticiones HTTP hacia el backend en XAMPP.
// ----------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *');

// ----------------------------------------------------------------------------
// BLOQUE 2: Métodos HTTP habilitados en la API REST
// ----------------------------------------------------------------------------
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// ----------------------------------------------------------------------------
// BLOQUE 3: Cabeceras autorizadas en las peticiones del navegador
// ----------------------------------------------------------------------------
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// ----------------------------------------------------------------------------
// BLOQUE 4: Formato estándar de respuesta en JSON con soporte de tildes y 'ñ'
// ----------------------------------------------------------------------------
header('Content-Type: application/json; charset=utf-8');

// ----------------------------------------------------------------------------
// BLOQUE 5: Respuesta inmediata a solicitudes preflight (OPTIONS)
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
