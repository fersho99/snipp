# SNIPP: plataforma web

Panel para Jefe, Empleado y Administrador: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4. La documentación de los lotes está en [`../README.md`](../README.md).

```bash
npm install
npm run dev        # http://localhost:3000 ; en "/" está el índice de pantallas y estados
npm run build      # compila para producción
npm run lint       # ESLint con la configuración de Next
npm run typecheck  # TypeScript estricto, sin generar archivos
```

## Estructura

- `src/app/`: rutas del App Router. Cada `page.tsx` solo monta la pantalla que le toca; `panel/layout.tsx` es el menú lateral del panel.
- `src/screens/`: las pantallas (acceso y registro, y en `panel/` cada sección del panel).
- `src/components/`: piezas compartidas (`ui.tsx`, `PanelLayout.tsx`, `PanelContext.tsx`, ...).
- `src/services/`: la API simulada. Cada archivo guarda sus datos en memoria; al recargar vuelven los de ejemplo.
- `src/data/`: datos de ejemplo y el menú por rol.
- `src/types/domain.ts`: tipos del dominio (negocio, sucursal, cita, pedido, ...), los mismos que usará la API real.
- `src/lib/navigation.tsx`: redirección, aviso de una sola vez entre pantallas y filtros guardados en la dirección.
- `public/`: logo y fotos de ejemplo.

Todas las pantallas se dibujan en el navegador (`components/ClientOnly.tsx`), porque los datos de ejemplo viven en memoria y la sesión en `sessionStorage`. Cuando exista la API, las páginas que puedan dibujarse en el servidor pueden salir de ese contenedor.
