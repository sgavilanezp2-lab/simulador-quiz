# Simulador de Preguntas (GitHub Pages)

Simulador simple para estudiar y practicar: elige una materia y contesta 15 preguntas aleatorias.
Funciona 100% con HTML/JS (estático), así que se puede alojar gratis en **GitHub Pages**.

## Estructura
```
/ (raíz)
├─ index.html
├─ app.js
└─ preguntas/
   ├─ web.json
   └─ investigacion.json
```

Agrega más archivos JSON por cada materia que quieras (por ejemplo `software2.json`). 
Luego edita el `<select>` en `index.html` y el objeto `mapaMaterias` en `app.js` para que apunten a tus nuevos archivos.

## Formato JSON
Cada archivo es un arreglo de objetos con:
```json
{
  "pregunta": "Texto de la pregunta",
  "opciones": ["A", "B", "C", "D"],
  "respuesta": 0,
  "explicacion": "Opcional: explicación de la respuesta."
}
```
- `respuesta` es el índice correcto dentro de `opciones`.

## Despliegue en GitHub Pages
1. Crea un repositorio (p.ej. `simulador-quiz`) y sube estos archivos.
2. En **Settings → Pages**, elige branch `main` y carpeta `/root`.
3. Espera unos segundos y abre la URL que te da GitHub Pages.

## Notas
- No hay backend: si alguien mira el código, puede ver las respuestas en el JSON.
- Puedes ofuscar el JSON, pero no es seguridad real. Si necesitas protección, usa backend con autenticación.
