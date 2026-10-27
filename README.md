# Spider-Man 2D (Phaser 3)
## Ejecutar en VS Code
- Live Server: clic derecho en `index.html` > *Open with Live Server*. O bien `npm start` (http://localhost:8080).
- Requiere internet solo para cargar Phaser desde el CDN.
## Controles
- A/D o flechas: mover · Espacio: saltar (o soltar la telaraña con impulso) · S en el suelo: deslizarse
- **Mouse:** apuntá con la mira; **mantener clic izquierdo** lanza la telaraña al punto de fachada apuntado (también E/Q). Soltar = soltarse.
- W/S mientras colgás: acortar/alargar la telaraña · A/D: impulso en el aire
- **Clic derecho / K:** telaraña a enemigo cercano al cursor (atrae; con Shift aleja) · **J:** golpe (combo de 3) · Shift: esquiva · R: reiniciar
## Mundo
Juegas a nivel de calle; los edificios son fachadas de fondo a las que te enganchás en cualquier punto (fila detallada y fila trasera). Arriba de los techos ves cielo y edificios lejanos (parallax, no enganchables).
## Sprites propios
Ver `assets/LEEME.txt`.
## Estructura
src/config.js · textures.js · city.js · player.js · enemies.js · ui.js · main.js

## Novedades v2.1
- Edificios solo de fondo (sin colisión); la telaraña se ancla donde apuntás con el cursor (tolerancia de 36 px).
- Sprites PNG de enemigos y villanos, texturas de fachadas, asfalto, cielo, luna y skyline en `assets/` (generados con `python tools/make_art.py assets`).
- Más poses del héroe (guardia, agacharse, voltereta, picada, disparo de telaraña, derrota) y efectos de la hoja de sprites.
- La pantalla de título muestra la versión cargada. Si no dice v2.1, presioná Ctrl+F5.
