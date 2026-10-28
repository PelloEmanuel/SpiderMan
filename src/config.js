// ==========================================
// CONFIGURACIÓN GLOBAL DEL JUEGO
// ==========================================
// Define las constantes principales de física, dimensiones y reglas generales.
const CFG = {
  // Dimensiones de la pantalla (resolución HD)
  W: 1280,
  H: 720,

  // Nivel de la calle (altura Y del suelo donde caminan los personajes)
  STREET: 1400,

  // Ancho de cada bloque/chunk de la ciudad procedural (en píxeles)
  CHUNK: 1000,

  // Gravedad del motor de física
  GRAV: 1500,

  // Velocidades del jugador (carrera y salto)
  RUN: 330,
  JUMP: 640,

  // Distancia máxima de alcance de la telaraña para engancharse
  WEB_RANGE: 1100,

  // Vida máxima del jugador
  PLAYER_HP: 100,

  // Tiempo de reaparición del botiquín en cada chunk (en segundos)
  MEDKIT_COOLDOWN: 45,

  // Puntaje máximo permitido (corresponde a la aparición del último jefe: Doctor Doom)
  MAX_SCORE: 40000
};

// Versión del juego para control de caché
const BUILD = 'v3.0';
