# Spider-Man 2D (Phaser 3) - Edición Marvel Battle v3.0

## Ejecutar en XAMPP
- Colocar la carpeta en `C:\xampp\htdocs\Spiderman1.1`.
- Iniciar Apache y MySQL (MariaDB) desde el panel de control de XAMPP.
- Abrir en el navegador: [http://localhost/Spiderman1.1/](http://localhost/Spiderman1.1/)

## Base de Datos MariaDB
- El archivo `database.sql` contiene la estructura de la base de datos `spiderman_db` y la tabla `puntajes`.
- La API PHP (`scores.php`) se encarga automáticamente de crear la base de datos y la tabla si aún no existen.
- Al iniciar el juego se muestra la **Tabla de Posiciones** con los mejores puntajes y tiempos.
- Al perder (o al ganar el juego tras vencer a Doctor Doom), se abre el formulario para registrar **Nombre** y **Apellido**.
- **Criterio de clasificación:**
  1. Orden descendente por **Puntos** (límite máximo de 40.000 puntos, correspondiente al último jefe).
  2. En caso de empate en puntos, desempata el menor **Tiempo transcurrido** (ascendente).

## Nuevos Controles
- **Clic Derecho (Mantener):** Colgarse y balancearse de la telaraña hacia cualquier edificio apuntado.
- **Clic Izquierdo:** Golpear (con zona de impacto invisible, sin arco gris).
- **Tecla F:** Disparo de telaraña a enemigo (inmoviliza y atrae).
- **A / D o Flechas:** Movimiento lateral y balanceo en el aire.
- **Espacio:** Saltar o soltarse de la telaraña con impulso.
- **Shift:** Esquiva / Dash con estela de velocidad.
- **W / S en telaraña:** Acortar / alargar hilo de balanceo.
- **S en el suelo:** Deslizarse / agacharse.

## Sistema de Jefes por Puntaje
A medida que eliminas enemigos comunes, acumulas puntos hasta alcanzar los hitos de aparición de cada jefe:
1. **Kingpin:** 1.000 puntos
2. **Hobgoblin:** 2.500 puntos
3. **Duende Verde:** 5.000 puntos
4. **Scorpion:** 8.000 puntos
5. **Lizard:** 12.000 puntos
6. **Electro:** 17.000 puntos
7. **Sandman:** 23.000 puntos
8. **Venom:** 30.000 puntos
9. **Doctor Doom (Jefe Final):** 40.000 puntos

> **Regla de batalla contra jefes:**
> - Cuando aparece un jefe, dejan de aparecer enemigos comunes hasta que el jefe sea derrotado.
> - La arena de combate se limita automáticamente a **2 pantallas** de ancho (2560 px), delimitada por barreras de energía.
> - Al derrotar al jefe, el mapa vuelve a ser infinito y vuelven a aparecer enemigos comunes.

## Enemigos Comunes (Nuevas Texturas Oficiales)
Se agregaron 10 tipos de enemigos con sprites y animaciones:
- **Duke:** Matón callejero (60 pts)
- **Slim:** Mafioso de traje blanco (70 pts)
- **Spike:** Gángster con gabardina y sombrero (80 pts)
- **Rocco:** Ninja azul ágil (85 pts)
- **Bruno:** Mini ninja con espada (75 pts)
- **Vinnie:** Ninja con espada y estocada rápida (110 pts)
- **Blade:** Pistolero marrón a distancia (100 pts)
- **Moose:** Ninja lanzador de shurikens (110 pts)
- **Hawk:** Matón corpulento con alta resistencia (150 pts)
- **Mack:** Mutante naranja de gran fuerza (160 pts)

## Sistema de Botiquines
- En cada chunk del mapa aparece exactamente 1 botiquín en una posición fija de la calle.
- Al recogerlo, cura el 100% de la vida del jugador.
- Reaparece cada 45 segundos en el mismo lugar; el temporizador se reinicia cada vez que se recoge.
