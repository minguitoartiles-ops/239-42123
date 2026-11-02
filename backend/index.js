// Puerta única de la app hacia Supabase: window.fsdDatos.
// Se empaqueta con esbuild en backend.js al publicar (ver .github/workflows/publicar.yml).
// Solo se carga si la app está en modo servidor (lo decide servidor.js).
import { createClient } from '@supabase/supabase-js';
import { PROYECTOS } from './config.js';
import { crearAuth, ErrorAcceso } from './auth.js';
import { crearClientes, ErrorServidor } from './clientes.js';

const entorno = window.FSD_MODO_SERVIDOR;   // lo fija servidor-inicio.js al abrir la app
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
    clientes: crearClientes(sb),
    // ¿El mensaje del error está pensado para enseñarse tal cual?
    esErrorAcceso: (e) => e instanceof ErrorAcceso || e instanceof ErrorServidor,
  });
  window.dispatchEvent(new Event('fsd:servidor-listo'));
}
