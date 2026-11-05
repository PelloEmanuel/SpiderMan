-- =============================================================================
-- BASE DE DATOS Y TABLAS EN ESPAÑOL: SPIDER-MAN 2D (MARIADB / MYSQL)
-- =============================================================================
-- Este archivo contiene la estructura completa de la base de datos para el juego,
-- configurando el almacenamiento de jugadores, puntajes acumulados y tiempos.

-- -----------------------------------------------------------------------------
-- Bloque 1: Creación de la base de datos con codificación UTF-8 internacional
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS spiderman_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Selección de la base de datos activa
USE spiderman_db;

-- -----------------------------------------------------------------------------
-- Bloque 2: Creación de la tabla 'puntajes' en español
-- -----------------------------------------------------------------------------
-- Almacena cada registro de partida finalizada:
--   - id: Identificador único autoincremental
--   - nombre: Nombre de pila del jugador (Peter, Miles, etc.)
--   - apellido: Apellido del jugador (Parker, Morales, etc.)
--   - puntos: Puntaje total obtenido (máximo 40.000 pts)
--   - tiempo_segundos: Duración de la partida en segundos con 2 decimales
--   - fecha: Marca de tiempo automática del registro
CREATE TABLE IF NOT EXISTS puntajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    puntos INT NOT NULL,
    tiempo_segundos DECIMAL(10, 2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índice para acelerar la consulta del ranking (puntos DESC, tiempo ASC)
    INDEX idx_posiciones (puntos DESC, tiempo_segundos ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Bloque 3: Datos iniciales de prueba (Opcionales para demostración)
-- -----------------------------------------------------------------------------
-- Inserta registros de ejemplo con personajes del universo Spider-Man
INSERT INTO puntajes (nombre, apellido, puntos, tiempo_segundos)
VALUES 
    ('Peter', 'Parker', 40000, 315.40),
    ('Miles', 'Morales', 30000, 280.15),
    ('Gwen', 'Stacy', 17000, 195.80),
    ('Miguel', 'O''Hara', 12000, 142.30)
ON DUPLICATE KEY UPDATE id=id;
