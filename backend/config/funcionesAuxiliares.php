<?php
/**
 * ============================================================================
 * Archivo: funcionesAuxiliares.php
 * Descripción: Funciones de apoyo para leer el cuerpo JSON de las peticiones
 *              y enviar respuestas HTTP estandarizadas en formato JSON.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// BLOQUE 1: Lectura de datos enviados por el cliente (JSON o formulario)
// ----------------------------------------------------------------------------
function leerDatosPeticion(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        $data = $_POST;
    }
    return $data;
}

// ----------------------------------------------------------------------------
// BLOQUE 2: Envío de respuesta JSON con código de estado HTTP y finalización
// ----------------------------------------------------------------------------
function responderJson(array $datos, int $codigoHttp = 200): void
{
    http_response_code($codigoHttp);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}
