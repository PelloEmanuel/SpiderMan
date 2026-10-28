-- Base de datos MariaDB para Spiderman 2D
CREATE DATABASE IF NOT EXISTS spiderman_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE spiderman_db;

CREATE TABLE IF NOT EXISTS puntajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    puntos INT NOT NULL,
    tiempo_segundos DECIMAL(10, 2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
