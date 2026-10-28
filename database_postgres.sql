-- Base de datos PostgreSQL para Spiderman 2D (equivalente a database.sql de MariaDB)
-- Nota: scores.php ya crea la tabla sola; este archivo es opcional.
CREATE TABLE IF NOT EXISTS puntajes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    puntos INTEGER NOT NULL,
    tiempo_segundos NUMERIC(10, 2) NOT NULL,
    fecha TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);
