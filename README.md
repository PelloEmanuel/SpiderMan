# Spider-Man 2D (Phaser 3 + PHP + MariaDB) - Edición Marvel Battle v3.0

## 1. Arquitectura y Estructura de Carpetas

```
Spiderman1.1/
├── frontend/                     (Cliente web del juego - HTML5, CSS3, Phaser 3)
│   ├── index.html                Página principal del juego y modales de tabla/formulario
│   ├── style.css                 Estilos visuales estilo cómic Marvel
│   ├── assets/                   Texturas, escenarios y los 440 sprites de personajes
│   └── src/                      Módulos JavaScript del motor de juego
│       ├── config.js             Constantes globales de física, calle y botiquines
│       ├── assets_data.js        Catálogo de 10 enemigos, 9 jefes y 440 sprites
│       ├── city.js               Generación procedural de bloques (chunks) y botiquines
│       ├── textures.js           Texturas procedurales de respaldo, cielo y botiquín
│       ├── player.js             Física de balanceo, golpes, telaraña y animaciones
│       ├── enemies.js            Inteligencia artificial de enemigos comunes y jefes
│       ├── ui.js                 HUD estilo cómic, barras de vida, timer y alertas
│       └── main.js               Bucle principal, arena de 2 pantallas y conexión API
│
├── backend/                      (API REST en PHP puro + PDO MariaDB)
│   ├── config/
│   │   ├── cabecerasCors.php     Configuración de cabeceras HTTP JSON y CORS
│   │   ├── conexionBaseDatos.php Conexión PDO a MariaDB y creación automática de esquema
│   │   └── funcionesAuxiliares.php Funciones de lectura de JSON y respuestas HTTP
│   ├── api/
│   │   └── puntajes/
│   │       └── index.php         Controlador GET (Top 20) y POST (guardar puntaje)
│   └── scores.php                Punto de entrada directo al controlador de puntajes
│
└── database/                     (Scripts SQL en español para MariaDB)
    ├── schema.sql                Creación de la base de datos 'spiderman_db' y tabla 'puntajes'
    └── database.sql              Copia equivalente del esquema con datos iniciales
```

## 2. Ejecutar en XAMPP Local
- Colocar el proyecto en `C:\xampp\htdocs\Spiderman1.1`.
- Iniciar **Apache** y **MySQL (MariaDB)** desde el panel de control de XAMPP.
- Abrir en el navegador: [http://localhost/Spiderman1.1/frontend/](http://localhost/Spiderman1.1/frontend/) (o directamente [http://localhost/Spiderman1.1/](http://localhost/Spiderman1.1/)).

## 3. Base de Datos MariaDB (`spiderman_db`)
- El archivo `database/schema.sql` define la base de datos `spiderman_db` y la tabla en español `puntajes` (`id`, `nombre`, `apellido`, `puntos`, `tiempo_segundos`, `fecha`).
- El backend (`backend/config/conexionBaseDatos.php`) crea automáticamente la base de datos y la tabla si aún no existen.
- **Criterio de clasificación:**
  1. Orden descendente por **Puntos** (límite máximo de 40.000 puntos, correspondiente al jefe final Doctor Doom).
  2. En caso de empate en puntos, desempata el menor **Tiempo transcurrido** (`tiempo_segundos ASC`).

## 4. Controles del Juego
- **Clic Derecho (Mantener):** Colgarse y balancearse de la telaraña hacia cualquier edificio apuntado.
- **Clic Izquierdo:** Golpear en combo (con zona de impacto invisible).
- **Tecla F:** Disparo de telaraña a enemigo (inmoviliza por 2s y atrae).
- **A / D o Flechas:** Movimiento lateral y balanceo en el aire.
- **Espacio:** Saltar o soltarse de la telaraña con impulso.
- **Shift:** Esquiva / Dash con invulnerabilidad temporal.
- **W / S en telaraña:** Acortar / alargar cuerda de balanceo.
- **Mantener R (3 segundos):** Rendirse / finalizar partida para registrar el puntaje.

## 5. Sistema de Jefes por Puntaje
1. **Kingpin:** 1.000 puntos
2. **Hobgoblin:** 2.500 puntos
3. **Duende Verde:** 5.000 puntos
4. **Scorpion:** 8.000 puntos
5. **Lizard:** 12.000 puntos
6. **Electro:** 17.000 puntos
7. **Sandman:** 23.000 puntos
8. **Venom:** 30.000 puntos
9. **Doctor Doom (Jefe Final):** 40.000 puntos
