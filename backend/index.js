// Puerta única de la app hacia Supabase: window.fsdDatos.
// Se empaqueta con esbuild en backend.js al publicar (ver .github/workflows/publicar.yml).
// Solo se carga si la app está en modo servidor (lo decide servidor.js).
import { createClient } from '@supabase/supabase-js';
import { PROYECTOS } from './config.js';
import { crearAuth, ErrorAcceso } from './auth.js';

const entorno = window.FSD_SERVIDOR;
const proyecto = PROYECTOS[entorno];

if (proyecto) {
  const sb = createClient(proyecto.url, proyecto.clave, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: `fsd-sesion-${entorno}`,
    },
  });
  window.fsdDatos = Object.freeze({
    entorno,
    nombre: proyecto.nombre,
    auth: crearAuth(sb),
    esErrorAcceso: (e) => e instanceof ErrorAcceso,
  });
  window.dispatchEvent(new Event('fsd:servidor-listo'));
}
