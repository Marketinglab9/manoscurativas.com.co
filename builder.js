const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const TEMPLATES_DIR = path.join(__dirname, 'src', 'templates');
const DIST_DIR = path.join(__dirname, 'dist');
const EXCEL_CSV = path.join(__dirname, 'manoscurativas_arquitectura_FINAL.xlsx - URLs Programáticas.csv');
const BLOG_CSV = path.join(__dirname, 'manoscurativas_blog_100.xlsx - 100 Artículos Blog.csv');

const plantillaMaestra = fs.readFileSync(path.join(TEMPLATES_DIR, 'plantilla_maestra.html'), 'utf-8');
const plantillaBlog = fs.readFileSync(path.join(TEMPLATES_DIR, 'plantilla_blog.html'), 'utf-8');

function readCSV(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function generarCardBlogServicio(enlaceUrl, nombre, isBlog = false, blogDesc = "") {
    const badge = isBlog ? "GUÍA DE BIENESTAR" : "MASAJE A DOMICILIO";
    const descHtml = isBlog ? `<p class="text-sm text-stone-500 line-clamp-2 mt-2">${blogDesc}</p>` : '';
    
    return `
    <a href="${enlaceUrl}" class="group shrink-0 snap-center w-[85vw] md:w-auto block bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden">
        <span class="text-[10px] font-bold text-teal-600 mb-2 block tracking-widest uppercase">${badge}</span>
        <h3 class="font-bold text-teal-950 group-hover:text-teal-700 transition-colors text-lg font-serif leading-tight">${nombre}</h3>
        ${descHtml}
        <div class="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
    </a>`;
}

function generarCardZona(enlaceUrl, nombre) {
    return `
    <a href="${enlaceUrl}" class="group flex items-center justify-between shrink-0 w-72 border border-stone-200 bg-white rounded-2xl hover:border-teal-600 transition-all shadow-sm hover:shadow-md p-4 relative overflow-hidden">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <iconify-icon icon="solar:map-point-bold-duotone"></iconify-icon>
            </div>
            <h3 class="text-base font-serif font-bold group-hover:text-teal-700 text-teal-950 transition-colors m-0">${nombre}</h3>
        </div>
    </a>`;
}

async function build() {
    console.log("🚀 Iniciando compilación de Arquitectura SEO Programática...");
    ensureDir(DIST_DIR);

    try {
        const rows = await readCSV(EXCEL_CSV);
        console.log(`Leídas ${rows.length} URLs a procesar.\n`);
        
        // --- BLOG LOAD FRONTLOADED ---
        const BLOG_CSV = 'manoscurativas_blog_100.xlsx - 100 Artículos Blog.csv';
        let rowsBlog = [];
        if (fs.existsSync(BLOG_CSV)) {
            rowsBlog = await readCSV(BLOG_CSV);
        }

        // Copiar assets estáticos
        const srcAssets = path.join(TEMPLATES_DIR, '..', 'assets');
        const distAssets = path.join(DIST_DIR, 'assets');
        if (fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true });
        }

        // Búsquedas de ayuda
        const findHubZonaUrl = (zona) => {
            const h = rows.find(r => r.Nivel === 'Hub Zona' && r.Zona === zona);
            return h ? h.URL : '/';
        };

        for (const row of rows) {
            // Ignorar filas sin URL o H1 válidos
            if (!row['URL'] || !row['H1']) continue;

            const urlPath = row['URL'].replace(/^\/|\/$/g, ''); // Remover slashes del principio y fin
            const fullDir = path.join(DIST_DIR, urlPath);
            ensureDir(fullDir);

            let interlinkingTitle = '';
            let interlinkingSub = '';
            let gridHtml = '';
            let breadcrumbHtml = '';
            let heroSub = '';

            const nivel = row['Nivel'] || '';
            const zona = row['Zona'] || '';
            const servicio = row['Servicio'] || '';

            // Generar Grid de Servicios + Blog (También te puede interesar)
            let gridServiciosHtml = '';
            
            // 1. Obtener servicios VÁLIDOS/DISPONIBLES para la zona actual
            let availableServices = rows.filter(r => r.Nivel && r.Nivel.includes('Hub Svc') && r.Servicio !== servicio);
            
            if (zona && zona.toLowerCase() !== 'todos') {
                // Filtrar los servicios que efectivamente tienen URL para esta zona
                const validForZone = availableServices.filter(srv => {
                    const progExists = rows.find(r => r.Nivel && r.Nivel.includes('Prog') && r.Servicio === srv.Servicio && r.Zona.toLowerCase() === zona.toLowerCase());
                    return progExists !== undefined;
                });
                // Si la zona tiene al menos 1 o 2 servicios, los usamos. Si no, fallback a todos (aunque es raro).
                if (validForZone.length > 0) {
                    availableServices = validForZone;
                }
            }

            const selectedServices = availableServices.sort(() => 0.5 - Math.random()).slice(0, 2);
            
            selectedServices.forEach(srv => {
                let targetUrl = srv.URL;
                let targetTitle = srv.Servicio;
                
                if (zona && zona.toLowerCase() !== 'todos') {
                    const specificProg = rows.find(r => r.Nivel && r.Nivel.includes('Prog') && r.Servicio === srv.Servicio && r.Zona.toLowerCase() === zona.toLowerCase());
                    if (specificProg) {
                        targetUrl = specificProg.URL;
                        targetTitle = specificProg.Servicio || specificProg.H1;
                    }
                }
                gridServiciosHtml += generarCardBlogServicio(targetUrl, targetTitle, false);
            });

            // 2. Obtener 2 o 1 artículo de blog aleatorio y ANEXAR PARÁMETRO DE ZONA
            if (rowsBlog && rowsBlog.length > 0) {
                const blogMixCount = 4 - selectedServices.length; // Para completar 4 tarjetas
                const validBlogs = rowsBlog.filter(b => b['Slug URL'] && b['Título']);
                const selectedBlogs = validBlogs.sort(() => 0.5 - Math.random()).slice(0, blogMixCount);
                
                selectedBlogs.forEach(b => {
                    let blogUrl = `/${b['Slug URL'].replace(/^\/|\/$/g, '')}/`;
                    // Añadimos parámetro de zona para preservar navegación del usuario
                    if (zona && zona !== 'Todos') {
                        blogUrl += `?z=${encodeURIComponent(zona)}`;
                    }

                    gridServiciosHtml += generarCardBlogServicio(blogUrl, b['Título'], true, b['Topic principal'] || 'Bienestar');
                });
            }

            // Generar Grid de Zonas (Marquee horizontal con elementos duplicados)
            let singleLoopZonas = '';
            const allZones = rows.filter(r => r.Nivel && r.Nivel.includes('Hub Zona') && r.Zona !== zona);
            allZones.forEach(z => {
                let targetUrl = z.URL;
                let targetTitle = z.Zona;

                if (servicio && servicio !== 'Todos' && servicio !== 'todos') {
                    const specificProg = rows.find(r => r.Nivel && r.Nivel.includes('Prog') && r.Zona === z.Zona && r.Servicio === servicio);
                    if (specificProg) {
                        targetUrl = specificProg.URL;
                        targetTitle = specificProg.Zona || specificProg.H1;
                    }
                }
                singleLoopZonas += generarCardZona(targetUrl, targetTitle);
            });
            let gridZonasHtml = singleLoopZonas + singleLoopZonas; // Duplicado para Scroll Infinito

            breadcrumbHtml = `<span class="text-teal-900/60">Inicio</span>`;
            heroSub = `Bienvenido a Manos Curativas`;

            if (nivel.includes('Hub Zona')) {
                breadcrumbHtml = `<a href="/" class="hover:text-neutral-900 transition-colors">Inicio</a> <span class="mx-2">/</span> <span class="text-neutral-500">${zona}</span>`;
                heroSub = `Ubicación: ` + zona;
            } else if (nivel.includes('Hub Svc')) {
                breadcrumbHtml = `<a href="/" class="hover:text-teal-900 transition-colors">Inicio</a> <span class="mx-2">/</span> <span class="text-teal-900/60">${servicio}</span>`;
                heroSub = servicio;
            } else if (nivel.includes('Prog')) {
                const parentUrl = findHubZonaUrl(zona);
                breadcrumbHtml = `<a href="/" class="hover:text-teal-900 transition-colors">Inicio</a> <span class="mx-2">/</span> <a href="${parentUrl}" class="hover:text-teal-900 transition-colors">${zona}</a> <span class="mx-2">/</span> <span class="text-teal-900/60">${servicio}</span>`;
                heroSub = servicio;
            }

            let heroImage = '/assets/hero_massage.png';
            const srvBusqueda = (row['Servicio'] || row['H1'] || '').toLowerCase();
            if (srvBusqueda.includes('relajante')) heroImage = '/assets/servicios/masaje_relajante_1775258118832.png';
            else if (srvBusqueda.includes('deportivo')) heroImage = '/assets/servicios/masaje_deportivo_1775258135018.png';
            else if (srvBusqueda.includes('terapéutico') || srvBusqueda.includes('terapeutico')) heroImage = '/assets/servicios/masaje_terapeutico_1775258148420.png';
            else if (srvBusqueda.includes('prenatal')) heroImage = '/assets/servicios/masaje_prenatal_1775258232218.png';
            else if (srvBusqueda.includes('drenaje')) heroImage = '/assets/servicios/drenaje_linfatico_1775258172320.png';
            else if (srvBusqueda.includes('descontracturante')) heroImage = '/assets/servicios/masaje_descontracturante_1775258187420.png';
            else if (srvBusqueda.includes('tejido profundo')) heroImage = '/assets/servicios/tejido_profundo_1775258200977.png';
            else if (srvBusqueda.includes('piedras')) heroImage = '/assets/servicios/piedras_volcanicas_1775258259475.png';
            else if (srvBusqueda.includes('ventosas')) heroImage = '/assets/servicios/masaje_ventosas_1775258244036.png';

            // Textos Dinámicos de Filosofía y Cierre para Nutrir UX y SEO
            let philosophyTitle = "Revitaliza tu cuerpo, <br/><span class=\"italic font-light text-stone-400\">equilibra tu mente.</span>";
            let philosophyDesc = "Diseñamos nuestros protocolos de masaje para impactar tanto en la fatiga muscular profunda como en el estrés mental. Porque un masaje premium no es un lujo, es una necesidad para un estilo de vida de alto rendimiento.";
            let philosophyCta = "Encuentra la terapia ideal para tu cuerpo";

            const pServicio = (row['Servicio'] || '').toLowerCase();
            const pZona = (row['Zona'] || '').toLowerCase();
            const zoneText = pZona && pZona !== 'medellín' ? ` en ${row['Zona']}` : '';

            if (pServicio.includes('deportivo')) {
                philosophyTitle = `Maximiza tu rendimiento${zoneText}, <br/><span class="italic font-light text-stone-400">recupera tu fuerza.</span>`;
                philosophyDesc = `Nuestros terapeutas deportivos${zoneText} aplican técnicas de descarga muscular y prevención de lesiones utilizadas por atletas de élite. La recuperación efectiva marca la diferencia en tus próximos entrenamientos.`;
                philosophyCta = "Reserva tu descarga muscular";
            } else if (pServicio.includes('relajante')) {
                philosophyTitle = `Desconecta del estrés${zoneText}, <br/><span class="italic font-light text-stone-400">recupera tu paz interior.</span>`;
                philosophyDesc = `Convierte tu hogar${zoneText} en un refugio de calma. Cada maniobra relajante está pensada para disminuir los niveles de cortisol, mejorar tu calidad de sueño y regalarte un momento absoluto de desconexión.`;
                philosophyCta = "Agendar mi tiempo de relajación";
            } else if (pServicio.includes('descontracturante') || pServicio.includes('tejido profundo') || pServicio.includes('terapéutico') || pServicio.includes('terapeutico')) {
                philosophyTitle = `Libérate del dolor${zoneText}, <br/><span class="italic font-light text-stone-400">recupera tu movilidad.</span>`;
                philosophyDesc = `La rigidez física reduce tu calidad de vida. Abordamos cada zona de tensión con técnicas profundas e insumos premium que disuelven contracturas dolorosas sin que tengas que desplazarte de tu casa${zoneText}.`;
                philosophyCta = "Solicitar alivio muscular inmediato";
            } else if (pServicio.includes('drenaje') || pServicio.includes('prenatal') || pServicio.includes('ventosas')) {
                philosophyTitle = `Restaura tu bienestar${zoneText}, <br/><span class="italic font-light text-stone-400">armoniza tu cuerpo.</span>`;
                philosophyDesc = `Especialistas en terapias delicadas como drenaje, cupping o masaje prenatal se trasladan a tu domicilio${zoneText}. Fomentamos la desintoxicación y el alivio de manera segura para tu salud integral.`;
                philosophyCta = "Consultar con un especialista";
            }

            // Hero Descripción Dinámica (SEO para la parte superior de la página)
            let heroDesc = "Transforma tu día con masajes terapéuticos de alto nivel. Una experiencia de relajación clínica diseñada exclusivamente para realizarse en la tranquilidad de tu hogar.";
            if (pServicio.includes('deportivo')) {
                heroDesc = `Acelera tu recuperación muscular con nuestros masajes deportivos${zoneText}. Diseñados para atletas y personas activas, aliviamos la tensión, prevenimos lesiones y optimizamos tu rendimiento físico, todo sin salir de casa.`;
            } else if (pServicio.includes('relajante')) {
                heroDesc = `Despídete del estrés cotidiano con nuestros masajes relajantes${zoneText}. Creamos un ambiente de profunda calma en tu hogar, ayudándote a liberar tensión mental, relajar tus músculos y mejorar tu calidad de sueño.`;
            } else if (pServicio.includes('descontracturante') || pServicio.includes('tejido profundo')) {
                heroDesc = `Encuentra alivio definitivo al dolor muscular con nuestros masajes descontracturantes${zoneText}. Mediante presión profunda, disolvemos los nudos y la rigidez crónica causados por el estrés o la mala postura directamente en tu domicilio.`;
            } else if (pServicio.includes('terapéutico') || pServicio.includes('terapeutico')) {
                heroDesc = `Experimenta los beneficios clínicos de nuestros masajes terapéuticos${zoneText}. Tratamientos focalizados y conducidos por profesionales certificados para tratar dolencias específicas, mejorar tu movilidad y restaurar tu bienestar.`;
            } else if (pServicio.includes('drenaje')) {
                heroDesc = `Estimula tu circulación y elimina toxinas con nuestro drenaje linfático manual${zoneText}. Una terapia suave y experta en casa, ideal para reducir la retención de líquidos, desinflamar y apoyar procesos postoperatorios.`;
            } else if (pServicio.includes('prenatal')) {
                heroDesc = `Disfruta de un alivio seguro y reconfortante durante tu embarazo con nuestro masaje prenatal${zoneText}. Reducimos la hinchazón, aliviamos el dolor de espalda y promovemos el descanso profundo para ti y tu bebé en la comodidad de tu hogar.`;
            } else if (pServicio.includes('ventosas') || pServicio.includes('cupping')) {
                heroDesc = `Libera la tensión profunda y mejora tu flujo sanguíneo con nuestra terapia de ventosas (cupping)${zoneText}. Un método milenario aplicado por expertos en tu domicilio para acelerar la recuperación y reducir el dolor crónico.`;
            } else if (pServicio.includes('piedras')) {
                heroDesc = `Alcanza un estado de relajación absoluta con nuestro masaje con piedras volcánicas calientes${zoneText}. La combinación del calor extremo y suaves manipulaciones derrite la tensión muscular y equilibra tu energía vital en casa.`;
            } else if (nivel.includes('Hub Zona')) {
                heroDesc = `Descubre nuestro exclusivo catálogo de masajes a domicilio${zoneText}. Terapeutas certificados transforman tu espacio en un spa de lujo, ofreciendo desde relajación profunda hasta terapias musculares avanzadas según lo que tú necesites hoy.`;
            }

            // Lógica de Orden de Secciones (Lugares primero si es página de Servicio)
            let orderClassServicios = 'order-1';
            let orderClassZonas = 'order-2';
            
            if (nivel && (nivel.includes('Hub Svc') || nivel.includes('Prog') || nivel.includes('Prog Srv'))) {
                orderClassServicios = 'order-2';
                orderClassZonas = 'order-1';
            }

            // Generación de {{SERVICE_INFO}}
            let serviceInfoHtml = '';
            if (pServicio !== 'todos') {
                let featuresHtml = '';
                if (pServicio.includes('deportivo')) {
                    featuresHtml = `
                        <div class="space-y-4">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:dumbbell-large-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Prevención de Lesiones</h4><p class="text-[15px] text-stone-500 font-light mt-1">Metodología focalizada en tendones y grupos articulares para disminuir fricción biomecánica.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:waterdrops-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Drenaje de Ácido Láctico</h4><p class="text-[15px] text-stone-500 font-light mt-1">Aceleración de recuperación muscular post-entrenamiento (DOMS) reduciendo pesadez extrema.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:routing-2-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Fibrólisis Diacutánea</h4><p class="text-[15px] text-stone-500 font-light mt-1">Tratamiento de adherencias en la fascia para mejorar el rango de movilidad de inmediata.</p></div>
                            </div>
                        </div>`;
                } else if (pServicio.includes('relajante')) {
                    featuresHtml = `
                        <div class="space-y-4">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:moon-sleep-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Regulación del Sueño (Somnolencia)</h4><p class="text-[15px] text-stone-500 font-light mt-1">Al regular el sistema nervioso parasimpático, se revierte el insomnio provocado por picos de estrés diarios.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:leaves-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Aromaterapia Integrada</h4><p class="text-[15px] text-stone-500 font-light mt-1">Cada sesión incluye esencias de grado terapéutico diseñadas exclusivamente para inducir una calma rotunda.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:heart-angle-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Descenso de Cortisol</h4><p class="text-[15px] text-stone-500 font-light mt-1">Una suave elongación holística que disminuye biomarcadores de estrés (fatiga, taquicardia) tras los primeros 15 minutos.</p></div>
                            </div>
                        </div>`;
                } else if (pServicio.includes('descontracturante') || pServicio.includes('tejido profundo')) {
                    featuresHtml = `
                        <div class="space-y-4">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:bone-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Ruptura de Nudos Crónicos</h4><p class="text-[15px] text-stone-500 font-light mt-1">Presión clínica sostenida sobre los 'trigger points' (puntos gatillo) miotendinosos que limitan el movimiento.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:bolt-circle-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Alivio Inmediato del Dolor</h4><p class="text-[15px] text-stone-500 font-light mt-1">Excelente para combatir dolores posicionales severos (cuello, lumbares, ciática) o tortícolis recurrente.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:running-round-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Rebombeo Sanguíneo</h4><p class="text-[15px] text-stone-500 font-light mt-1">La profundidad del masaje promueve la hiperemia, inyectando oxígeno nuevo al tejido dañado para que pueda sanar.</p></div>
                            </div>
                        </div>`;
                } else if (pServicio.includes('terapéutico') || pServicio.includes('terapeutico')) {
                    featuresHtml = `
                        <div class="space-y-4">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:stethoscop-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Aproximación Clínica</h4><p class="text-[15px] text-stone-500 font-light mt-1">Valoración especializada antes y después. Nos enfocamos en las vértebras, articulaciones desgastadas o nervios pinzados.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:hand-stars-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Técnicas Mixtas Adaptativas</h4><p class="text-[15px] text-stone-500 font-light mt-1">Combinamos lo mejor de la acupresión, amasamiento sueco y reflexología focalizada según tu umbral de dolor.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:hospital-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Rehabilitación Funcional</h4><p class="text-[15px] text-stone-500 font-light mt-1">Ayudamos a corregir malas posturas ocasionadas por el home office intenso, restaurando tu fisionomía ideal.</p></div>
                            </div>
                        </div>`;
                } else if (pServicio.includes('drenaje')) {
                    featuresHtml = `
                        <div class="space-y-4">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:drop-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Depuración Linfática y Postoperatoria</h4><p class="text-[15px] text-stone-500 font-light mt-1">Indispensable tras cirugías estéticas (lipo, abdominoplastia) eliminando de forma segura seromas y líquidos residuales.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:ruler-cross-pen-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Anti-Edema (Piernas Cansadas)</h4><p class="text-[15px] text-stone-500 font-light mt-1">Deshincha extremidades congestionadas estimulando los canales linfáticos hacia los ganglios axilares e inguinales.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:star-fall-minimalistic-2-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Toque Ultra Suave e Indoloro</h4><p class="text-[15px] text-stone-500 font-light mt-1">Presión calculada milimétricamente. A diferencia de un masaje tradicional, no produce dolor, moretones ni irritación.</p></div>
                            </div>
                        </div>`;
                } else if (pServicio.includes('prenatal')) {
                    featuresHtml = `
                        <div class="space-y-4">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:shield-user-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Biomecánica 100% Segura</h4><p class="text-[15px] text-stone-500 font-light mt-1">Nuestras terapeutas identifican posiciones lateralizadas seguras y aplican presiones aptas luego del primer semestre de embarazo.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:baby-carriage-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Prevención de Retención</h4><p class="text-[15px] text-stone-500 font-light mt-1">Con el avance gestacional ocurre hinchazón en tobillos y pies; mitigamos esto reactivando canales linfáticos periféricos.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:pulse-2-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Mitigación del Dolor Lumbar</h4><p class="text-[15px] text-stone-500 font-light mt-1">Tratamiento de la zona del cóccix, ciática y lumba baja producida por la alteración en el centro de gravedad materno.</p></div>
                            </div>
                        </div>`;
                } else {
                    featuresHtml = `
                        <div class="space-y-4">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:diploma-verified-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Especialistas Garantizados</h4><p class="text-[15px] text-stone-500 font-light mt-1">Terapeutas en constante capacitación para llevar un estándar de spa 5 estrellas directamente a tu sala.</p></div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:health-bold-duotone" class="text-xl text-teal-700"></iconify-icon>
                                </div>
                                <div><h4 class="font-bold text-teal-900">Terapia Hecha a la Medida</h4><p class="text-[15px] text-stone-500 font-light mt-1">Ningún cuerpo es igual. Evaluamos tus puntos gatillo antes de comenzar para un resultado verdaderamente notorio y sanador.</p></div>
                            </div>
                        </div>`;
                }

                serviceInfoHtml = `
                <section class="max-w-7xl mx-auto px-6 py-16 lg:py-20 bg-white order-0 w-full mb-8 rounded-3xl border border-stone-100 shadow-sm mt-8">
                    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div>
                            <span class="text-[12px] tracking-[0.2em] font-bold mb-4 block text-teal-600 uppercase border-l-2 border-teal-500 pl-3">Metodología Especializada</span>
                            <h2 class="text-3xl md:text-4xl font-serif font-bold text-teal-950 mb-6 leading-snug">¿Por qué nuestro <span class="text-teal-700">${row['Servicio']}</span> resalta sobre el resto?</h2>
                            <p class="text-stone-500 font-light leading-relaxed mb-8 text-lg">
                                En la industria existen demasiadas técnicas genéricas. En Manos Curativas, llevamos a tu domicilio un protocolo exclusivo fundamentado en anatomía, utilizando aceites base orgánicos libres de parabenos y combinando la tecnología manual con aromaterapia para un efecto holístico.
                            </p>
                            <button onclick="openQuizModal()" class="uppercase tracking-[0.2em] text-[13px] font-bold text-white bg-teal-900 px-8 py-4 rounded-full hover:bg-teal-800 transition-colors inline-block mt-2">Agendar este Tratamiento</button>
                        </div>
                        <div class="bg-stone-50 rounded-2xl p-6 md:p-8">
                            ${featuresHtml}
                        </div>
                    </div>
                </section>`;
            }

            // Reemplazo en Plantilla Maestra
            let pageHtml = plantillaMaestra
                .replace(/\/assets\/hero_massage\.png/g, heroImage)
                .replace(/{{TITLE}}/g, row['Title Tag'] || row['H1'])
                .replace(/{{META_DESC}}/g, row['Meta Description'] || '')
                .replace(/{{H1}}/g, row['H1'])
                .replace(/{{HERO_SUB_TEXT}}/g, heroSub)
                .replace(/{{SERVICE_INFO}}/g, serviceInfoHtml || '')
                .replace(/{{GRID_SERVICIOS}}/g, gridServiciosHtml || '')
                .replace(/{{GRID_ZONAS}}/g, gridZonasHtml || '')
                .replace(/{{ORDER_CLASS_SERVICIOS}}/g, orderClassServicios)
                .replace(/{{ORDER_CLASS_ZONAS}}/g, orderClassZonas)
                .replace(/{{BREADCRUMB_HTML}}/g, breadcrumbHtml)
                .replace(/{{HERO_DESC}}/g, heroDesc)
                .replace(/{{PHILOSOPHY_TITLE}}/g, philosophyTitle)
                .replace(/{{PHILOSOPHY_DESC}}/g, philosophyDesc)
                .replace(/{{PHILOSOPHY_CTA}}/g, philosophyCta);

            // Exportar archivo HTML (incluso el 'Homepage' que cuya url es '/')
            const fileName = urlPath === '' ? 'index.html' : 'index.html';
            const filaGuardar = urlPath === '' ? path.join(DIST_DIR, fileName) : path.join(fullDir, fileName);
            
            fs.writeFileSync(filaGuardar, pageHtml);
        }

        console.log("\n🎉 ¡Compilación completada! Todas las páginas de tu CSV fueron compiladas al directorio /dist/");

        console.log("\n🎉 ¡Compilación completada! Todas las páginas de tu CSV fueron compiladas al directorio /dist/");

        // --- BLOG COMPILATION ---
        console.log("\n🚀 Compilando artículos del Blog...");
        console.log(`Leídos ${rowsBlog.length} artículos del blog a procesar.`);

        const hubDict = {
            'ventosas': { url: '/masaje-con-ventosas-a-domicilio/', title: 'Masaje con Ventosas' },
            'relajante': { url: '/masajes-relajantes-a-domicilio/', title: 'Masajes Relajantes' },
            'deportivo': { url: '/masajes-deportivos-a-domicilio/', title: 'Masajes Deportivos' },
            'terapeutico': { url: '/masajes-terapeuticos-a-domicilio/', title: 'Masajes Terapéuticos' },
            'prenatal': { url: '/masaje-prenatal-a-domicilio/', title: 'Masaje Prenatal' },
            'descontracturante': { url: '/masaje-descontracturante-a-domicilio/', title: 'Masaje Descontracturante' },
            'drenaje': { url: '/drenaje-linfatico-a-domicilio/', title: 'Drenaje Linfático' },
            'piedras': { url: '/masaje-piedras-volcanicas-a-domicilio/', title: 'Masaje con Piedras Volcánicas' }
        };

        let blogCardsHtml = '';

        for (const row of rowsBlog) {
            if (!row['Slug URL'] || !row['Título']) continue;

            const urlPath = row['Slug URL'].replace(/^\/|\/$/g, '');
            const urlReal = `/${urlPath}/`;
            const fullDir = path.join(DIST_DIR, urlPath);
            ensureDir(fullDir);

            // Generar Enlaces SEO
            let enlacesSeoHtml = '';
            if (row['Enlaza a']) {
                const links = row['Enlaza a'].toLowerCase();
                for (const [key, hub] of Object.entries(hubDict)) {
                    if (links.includes(key)) {
                        enlacesSeoHtml += `
                        <a href="${hub.url}" class="inline-flex items-center justify-between gap-4 w-full md:w-auto text-[13px] font-bold uppercase tracking-[0.1em] text-teal-900 border border-teal-200 rounded-2xl bg-white hover:bg-teal-50/50 hover:border-teal-400 hover:shadow-md transition-all px-6 py-4 group">
                            <span>Conoce sobre nuestro <span class="text-teal-600">${hub.title}</span></span>
                            <iconify-icon icon="solar:arrow-right-line-duotone" class="text-xl text-teal-500 group-hover:translate-x-1 transition-transform"></iconify-icon>
                        </a>`;
                    }
                }
            }
            if(!enlacesSeoHtml) enlacesSeoHtml = `
                <a id="back-to-zona-btn" href="/masajes-a-domicilio-en-medellin/" class="inline-flex items-center justify-between gap-4 w-full md:w-auto text-[13px] font-bold uppercase tracking-[0.1em] text-teal-900 border border-teal-200 rounded-2xl bg-white hover:bg-teal-50/50 hover:border-teal-400 hover:shadow-md transition-all px-6 py-4 group">
                    <span>Ver todos nuestros <span class="text-teal-600">Masajes a Domicilio</span></span>
                    <iconify-icon icon="solar:arrow-right-line-duotone" class="text-xl text-teal-500 group-hover:translate-x-1 transition-transform"></iconify-icon>
                </a>`;

            let breadcrumbHtml = `<a href="/" class="hover:text-teal-900 transition-colors">Inicio</a> <span class="mx-2">/</span> <a href="/blog/" class="hover:text-teal-900 transition-colors">Blog</a> <span class="mx-2">/</span> <span class="text-teal-900/60">${row['Categoría'] || 'Artículos'}</span>`;

            let heroImageBlog = '/assets/blog_massage.png';
            const catBusqueda = (row['Categoría'] || row['Título'] || '').toLowerCase();
            if (catBusqueda.includes('relajante')) heroImageBlog = '/assets/servicios/masaje_relajante_1775258118832.png';
            else if (catBusqueda.includes('deportivo')) heroImageBlog = '/assets/servicios/masaje_deportivo_1775258135018.png';
            else if (catBusqueda.includes('terapéutico') || catBusqueda.includes('terapeutico')) heroImageBlog = '/assets/servicios/masaje_terapeutico_1775258148420.png';
            else if (catBusqueda.includes('prenatal') || catBusqueda.includes('embarazada')) heroImageBlog = '/assets/servicios/masaje_prenatal_1775258232218.png';
            else if (catBusqueda.includes('drenaje')) heroImageBlog = '/assets/servicios/drenaje_linfatico_1775258172320.png';
            else if (catBusqueda.includes('descontracturante') || catBusqueda.includes('nudos')) heroImageBlog = '/assets/servicios/masaje_descontracturante_1775258187420.png';
            else if (catBusqueda.includes('tejido profundo')) heroImageBlog = '/assets/servicios/tejido_profundo_1775258200977.png';
            else if (catBusqueda.includes('piedras')) heroImageBlog = '/assets/servicios/piedras_volcanicas_1775258259475.png';
            else if (catBusqueda.includes('ventosas') || catBusqueda.includes('cupping')) heroImageBlog = '/assets/servicios/masaje_ventosas_1775258244036.png';

            // Crear recomendación de artículos relacionados (4 aleatorios para scroll infinito)
            let relatedCardsHtml = '';
            const otherBlogs = rowsBlog.filter(b => b['Slug URL'] && b['Título'] && b['Slug URL'] !== row['Slug URL']);
            const randomRelated = otherBlogs.sort(() => 0.5 - Math.random()).slice(0, 4);
            
            randomRelated.forEach(rel => {
                const relUrl = `/${rel['Slug URL'].replace(/^\/|\/$/g, '')}/`;
                relatedCardsHtml += `
            <a href="${relUrl}" class="group block shrink-0 snap-center w-[85vw] md:w-auto border border-stone-100 bg-white rounded-3xl hover:border-teal-600 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(13,148,136,0.1)] hover:-translate-y-1 p-8 relative overflow-hidden">
                <div class="text-[10px] tracking-[0.2em] uppercase font-bold text-teal-600 mb-4">${rel['Categoría']}</div>
                <h3 class="text-xl font-serif font-bold leading-tight mb-4 group-hover:text-teal-700 text-teal-950 transition-colors">${rel['Título']}</h3>
                <p class="text-[14px] font-light text-stone-500 font-sans leading-relaxed line-clamp-3">${rel['Meta Description']}</p>
                <div class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-teal-400 to-teal-800 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </a>`;
            });

            // Leer contenido específico del artículo
            const blogContentMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/blog_content.json'), 'utf8'));
            let articleHtml = blogContentMap[urlReal] || blogContentMap['fallback'];

            let pageHtml = plantillaBlog
                .replace(/\/assets\/blog_massage\.png/g, heroImageBlog)
                .replace(/{{TITLE}}/g, row['Título'])
                .replace(/{{META_DESC}}/g, row['Meta Description'] || '')
                .replace(/{{H1}}/g, row['Título'])
                .replace(/{{CATEGORIA}}/g, row['Categoría'] || 'Artículos')
                .replace(/{{ENLACES_SEO}}/g, enlacesSeoHtml)
                .replace(/{{BREADCRUMB_HTML}}/g, breadcrumbHtml)
                .replace(/{{BLOG_CARDS_HTML}}/g, relatedCardsHtml)
                .replace(/{{ARTICLE_CONTENT}}/g, articleHtml.replace(/{{H1}}/g, row['Título']));

            fs.writeFileSync(path.join(fullDir, 'index.html'), pageHtml);

            // Add to Hub Index
            blogCardsHtml += `
            <a href="${urlReal}" class="group block shrink-0 snap-center w-[85vw] md:w-auto border border-stone-100 bg-white rounded-3xl hover:border-teal-600 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(13,148,136,0.1)] hover:-translate-y-1 p-8 relative overflow-hidden">
                <div class="text-[10px] tracking-[0.2em] uppercase font-bold text-teal-600 mb-4">${row['Categoría']}</div>
                <h3 class="text-xl font-serif font-bold leading-tight mb-4 group-hover:text-teal-700 text-teal-950 transition-colors">${row['Título']}</h3>
                <p class="text-[14px] font-light text-stone-500 font-sans leading-relaxed line-clamp-3">${row['Meta Description']}</p>
                <div class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-teal-400 to-teal-800 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </a>`;
        }

        // Crear Hub de Blog (index)
        const blogHubDir = path.join(DIST_DIR, 'blog');
        ensureDir(blogHubDir);
        
        let breadcrumbBlogHub = `<a href="/" class="hover:text-teal-900 transition-colors">Inicio</a> <span class="mx-2">/</span> <span class="text-teal-900/60">Blog</span>`;

        let genericGridServicios = '';
        rows.filter(r => r.Nivel && r.Nivel.includes('Hub Svc')).slice(0, 4).forEach(srv => genericGridServicios += generarCardBlogServicio(srv.URL, srv.Servicio, false));
        let singleLoopZonas = '';
        rows.filter(r => r.Nivel && r.Nivel.includes('Hub Zona')).forEach(z => singleLoopZonas += generarCardZona(z.URL, z.Zona));
        let genericGridZonas = singleLoopZonas + singleLoopZonas;

        const blogCustomSectionHtml = `
    <!-- SECCIÓN DE BLOG POSTS -->
    <section class="pt-10 pb-16 bg-white border-b border-stone-100">
        <div class="max-w-7xl mx-auto px-6">
            <div class="mb-16 flex flex-col items-center text-center">
                <span class="text-[11px] tracking-[0.3em] uppercase font-bold text-teal-600 mb-4">Explora Nuestros Artículos</span>
                <h2 class="text-3xl md:text-5xl font-serif font-bold text-teal-950 max-w-2xl">Guías y consejos prácticos de nuestros terapeutas expertos</h2>
            </div>
            
            <div class="relative">
                <div class="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-full bg-gradient-to-l from-white to-transparent md:hidden pointer-events-none z-10"></div>
                <div class="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 pb-8 snap-x snap-mandatory pt-2 style-scroll pl-4 md:pl-0 pr-8 md:pr-0">
                    ${blogCardsHtml}
                </div>
                <div class="text-center mt-2 md:hidden">
                    <span class="text-[10px] tracking-[0.2em] font-bold text-teal-600/70 uppercase inline-flex items-center gap-2">
                        <iconify-icon icon="solar:arrow-left-line-duotone"></iconify-icon> Desliza para ver más <iconify-icon icon="solar:arrow-right-line-duotone"></iconify-icon>
                    </span>
                </div>
            </div>
        </div>
    </section>
    <style>
        .style-scroll::-webkit-scrollbar { display: none; }
        .style-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
    <!-- SECCIÓN DE SERVICIOS -->`;

        let blogHubHtml = plantillaMaestra
            .replace(/{{TITLE}}/g, 'Blog de Bienestar y Masajes')
            .replace(/{{META_DESC}}/g, 'Descubre artículos sobre bienestar, técnicas de relajación, beneficios fisiológicos de nuestras terapias y cuidado integral en nuestro blog oficial.')
            .replace(/{{H1}}/g, 'Blog y Bienestar')
            .replace(/{{HERO_SUB_TEXT}}/g, 'Artículos Recientes')
            .replace(/<!-- SECCIÓN DE SERVICIOS -->/g, blogCustomSectionHtml)
            .replace(/{{GRID_SERVICIOS}}/g, genericGridServicios)
            .replace(/{{GRID_ZONAS}}/g, genericGridZonas)
            .replace(/¿Sientes tensión en tu cuerpo\?/g, 'Encuentra tu masaje ideal')
            .replace(/{{BREADCRUMB_HTML}}/g, breadcrumbBlogHub)
            .replace(/Llevamos la relajación(.*?)<\/p>/g, 'Haz nuestro test rápido para encontrar la terapia perfecta para tu caso.</p>')
            .replace(/{{HERO_DESC}}/g, 'Descubre artículos sobre bienestar, técnicas de relajación, beneficios fisiológicos de nuestras terapias y cuidado integral en nuestro blog oficial.')
            .replace(/{{SERVICE_INFO}}/g, '')
            .replace(/{{PHILOSOPHY_TITLE}}/g, 'Tu cuerpo es tu templo, <br/><span class="italic font-light text-stone-400">cuidarlo es tu responsabilidad.</span>')
            .replace(/{{PHILOSOPHY_DESC}}/g, 'En nuestro blog compartimos conocimientos respaldados por terapeutas para que aprendas a escuchar tu cuerpo. La recuperación empieza por la educación.')
            .replace(/{{PHILOSOPHY_CTA}}/g, 'Ver nuestros masajes');

        fs.writeFileSync(path.join(blogHubDir, 'index.html'), blogHubHtml);

        console.log("🎉 ¡Blog y su Index compilados con éxito!");

    } catch (err) {
        console.error("❌ Ocurrió un error en la compilación:", err);
    }
}

build();
