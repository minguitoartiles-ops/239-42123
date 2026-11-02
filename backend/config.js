// Proyectos de Supabase a los que puede conectarse la app.
// Todo lo de aquí es PÚBLICO a propósito: la dirección y la clave publicable van dentro
// de la app y las ve cualquiera. Lo que protege los datos son las políticas RLS del servidor.
// La clave secreta (sb_secret_…) NUNCA va aquí.
export const PROYECTOS = {
  pruebas: {
    nombre: 'Servidor de pruebas',
    url: 'https://nviqtrslagidrojvowdn.supabase.co',
    clave: 'sb_publishable_OTa8sdrjp4PJMP6Z5I9Byg_-MpBH2sv',
  },
};
