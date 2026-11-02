// Limpieza diaria: borra los archivos y las cuentas de los clientes que la base de datos
// ya borró (15 días de baja o 15 días sin acceso por impago).
// Solo la puede llamar la tarea programada, con su llave propia (secreto LIMPIEZA_TOKEN).
//
// POST → { "procesados": n, "fallos": n }
import { cabeceras, clienteServidor, error, llamaLaTarea, responder } from '../_compartido/comun.ts';

const CARPETAS = ['fotos', 'audios', 'documentos'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras(req) });
  if (req.method !== 'POST') return error(req, 405, 'Método no permitido.');
  if (!llamaLaTarea(req)) return error(req, 401, 'No autorizado.');

  const servidor = clienteServidor();
  const { data: pendientes, error: e } = await servidor.rpc('borrados_por_procesar');
  if (e) return error(req, 500, 'No se ha podido leer la lista de borrados.');

  let procesados = 0;
  let fallos = 0;
  for (const p of (pendientes ?? []) as { id: number; cliente_id: string; user_id: string | null }[]) {
    try {
      for (const carpeta of CARPETAS) {
        // Se repite hasta vaciar la carpeta del cliente (de 1000 en 1000)
        for (let vuelta = 0; vuelta < 20; vuelta++) {
          const { data: archivos, error: eLista } = await servidor.storage.from(carpeta).list(p.cliente_id, { limit: 1000 });
          if (eLista) throw eLista;
          if (!archivos || archivos.length === 0) break;
          const { error: eBorrar } = await servidor.storage.from(carpeta)
            .remove(archivos.map((a) => `${p.cliente_id}/${a.name}`));
          if (eBorrar) throw eBorrar;
        }
      }
      if (p.user_id) {
        const { error: eUsuario } = await servidor.auth.admin.deleteUser(p.user_id);
        if (eUsuario && eUsuario.status !== 404) throw eUsuario;
      }
      const { error: eMarca } = await servidor.rpc('marcar_borrado', { p_id: p.id });
      if (eMarca) throw eMarca;
      procesados++;
    } catch {
      fallos++;   // se reintenta en la próxima ejecución; sin datos personales en los registros
      console.error('Limpieza: fallo en un borrado pendiente', p.id);
    }
  }
  return responder(req, 200, { procesados, fallos });
});
