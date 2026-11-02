// Código común de las funciones del servidor de Fitnessindramas.
// Secretos (se configuran en Supabase → Edge Functions → Secrets, nunca en el código):
//   CODIGO_PEPPER        clave aleatoria larga para las huellas de códigos e IP
//   ORIGENES_PERMITIDOS  direcciones desde las que la app puede llamar (separadas por comas)
//   LIMPIEZA_TOKEN       llave propia de la tarea de limpieza (solo sirve para lanzarla)
// Supabase añade solo: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3';

const URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PEPPER = Deno.env.get('CODIGO_PEPPER') ?? '';
const LIMPIEZA = Deno.env.get('LIMPIEZA_TOKEN') ?? '';
const ORIGENES = (Deno.env.get('ORIGENES_PERMITIDOS') ?? 'https://app.fitnessindramas.com')
  .split(',').map((o) => o.trim()).filter(Boolean);

if (PEPPER.length < 32) {
  // Sin una clave larga, las huellas de los códigos serían débiles: mejor no arrancar
  throw new Error('Falta el secreto CODIGO_PEPPER (32 caracteres o más)');
}

// ---------- Respuestas y CORS ----------

export function cabeceras(req: Request): Headers {
  const h = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  });
  const origen = req.headers.get('Origin');
  if (origen && ORIGENES.includes(origen)) {
    h.set('Access-Control-Allow-Origin', origen);
    h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    h.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
    h.set('Access-Control-Max-Age', '600');
  }
  return h;
}

export function responder(req: Request, estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras(req) });
}

export function error(req: Request, estado: number, mensaje: string): Response {
  return responder(req, estado, { error: mensaje });
}

// Errores de la base de datos → respuesta. Solo se enseñan los mensajes que escribimos
// nosotros (códigos 42501, 22023, 23514, 23505); el resto, genérico.
export function errorBD(req: Request, e: { code?: string; message?: string } | null): Response {
  const codigo = e?.code ?? '';
  if (codigo === '42501') return error(req, 403, e?.message ?? 'No tienes permiso para hacer esto.');
  if (codigo === '22023' || codigo === '23514' || codigo === '23505') {
    return error(req, 400, e?.message ?? 'Algún dato no es válido.');
  }
  console.error('Error de base de datos', codigo);   // sin datos personales
  return error(req, 500, 'No se ha podido completar. Inténtalo de nuevo.');
}

export async function leerJSON(req: Request): Promise<Record<string, unknown> | null> {
  const largo = Number(req.headers.get('Content-Length') ?? '0');
  if (largo > 8192) return null;
  try {
    const texto = await req.text();
    if (texto.length > 8192) return null;
    const v = JSON.parse(texto);
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

// ---------- Clientes de Supabase ----------

export function clienteServidor(): SupabaseClient {
  return createClient(URL, SERVICIO, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Quién llama, comprobado por Supabase Auth a partir de su token
export async function usuarioQueLlama(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const c = createClient(URL, ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error: e } = await c.auth.getUser();
  if (e || !data?.user) return null;
  return { id: data.user.id };
}

// ¿Llama la tarea programada con su llave propia? (no se usa la clave maestra del servidor
// para esto: si la llave se filtrara, solo serviría para lanzar la limpieza)
export function llamaLaTarea(req: Request): boolean {
  const auth = req.headers.get('Authorization') ?? '';
  return LIMPIEZA.length >= 32 && iguales(auth, `Bearer ${LIMPIEZA}`);
}

function iguales(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) dif |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return dif === 0;
}

// ---------- Códigos de acceso ----------

// Sin letras ni cifras que se confundan (0/O, 1/I/L)
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // 31 símbolos → 31^8 ≈ 8,5 × 10^11 códigos

export function nuevoCodigo(): string {
  let codigo = '';
  const bytes = new Uint8Array(32);
  while (codigo.length < 8) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < 248 && codigo.length < 8) codigo += ALFABETO[b % 31];   // sin sesgo: 248 = 31 × 8
    }
  }
  return codigo;
}

export function normalizarCodigo(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const c = v.toUpperCase().replace(/[\s-]/g, '');
  return /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(c) ? c : null;
}

// Igual que la regla de Supabase Auth: 12 a 72 caracteres, con minúsculas, mayúsculas y números
export function contrasenaValida(p: unknown): p is string {
  return typeof p === 'string' && p.length >= 12 && p.length <= 72
    && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p);
}

export function mostrarCodigo(c: string): string {
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

let claveHMAC: CryptoKey | null = null;
async function hmac(texto: string): Promise<string> {
  claveHMAC ??= await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('HMAC', claveHMAC, new TextEncoder().encode(texto));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const huellaCodigo = (codigo: string) => hmac(`codigo:${codigo}`);

// La IP nunca se guarda: solo su huella, para limitar intentos
export function huellaOrigen(req: Request): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconocido';
  return hmac(`ip:${ip}`);
}
