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

function getThumbnailForService(nombre) {
    const slug = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (slug.includes('relajante')) return '/assets/servicios/masaje_relajante.webp';
    if (slug.includes('deportivo')) return '/assets/servicios/masaje_deportivo.webp';
    if (slug.includes('terapeutico')) return '/assets/servicios/masaje_terapeutico.webp';
    if (slug.includes('drenaje') || slug.includes('linfatico')) return '/assets/servicios/drenaje_linfatico.webp';
    if (slug.includes('descontracturante')) return '/assets/servicios/masaje_descontracturante.webp';
    if (slug.includes('tejido profundo')) return '/assets/servicios/tejido_profundo.webp';
    if (slug.includes('prenatal')) return '/assets/servicios/masaje_prenatal.webp';
    if (slug.includes('ventosas')) return '/assets/servicios/masaje_ventosas.webp';
    if (slug.includes('piedras')) return '/assets/servicios/piedras_volcanicas.webp';
    return '/assets/hero_7720.webp'; // Fallback
}

function generarCardBlogServicio(enlaceUrl, nombre, isBlog = false, blogDesc = "") {
    const badge = isBlog ? "GUÍA DE BIENESTAR" : "MASAJE A DOMICILIO";
    const descHtml = isBlog ? `<p class="text-sm text-stone-500 line-clamp-2 mt-2">${blogDesc}</p>` : '';
    const imgUrl = isBlog ? '/assets/blog_massage.png' : getThumbnailForService(nombre);
    
    return `
    <a href="${enlaceUrl}" class="flex flex-col group shrink-0 snap-start w-[75vw] max-w-[280px] md:w-auto md:min-w-[280px] bg-white border border-stone-200 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden">
        <div class="h-40 w-full overflow-hidden bg-stone-100">
            <img src="${imgUrl}" alt="${nombre}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        </div>
        <div class="p-6 flex flex-col flex-grow">
            <span class="text-[10px] font-bold text-teal-600 mb-2 block tracking-widest uppercase">${badge}</span>
            <h3 class="font-bold text-teal-950 group-hover:text-teal-700 transition-colors text-lg font-serif leading-tight">${nombre}</h3>
            ${descHtml}
        </div>
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
            <span class="text-base font-serif font-bold group-hover:text-teal-700 text-teal-950 transition-colors m-0">${nombre}</span>
        </div>
    </a>`;
}

async function build() {
    console.log("🚀 Iniciando compilación de Arquitectura SEO Programática...");
    ensureDir(DIST_DIR);

    try {
        const rows = await readCSV(EXCEL_CSV);
        console.log(`Leídas ${rows.length} URLs a procesar.\n`);
        
        const sitemapUrls = []; // Arreglo para almacenar todas las URLs del sitio
        sitemapUrls.push('https://manoscurativas.com.co/');
        sitemapUrls.push('https://manoscurativas.com.co/servicios/');
        sitemapUrls.push('https://manoscurativas.com.co/cobertura/');

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

            const selectedServices = availableServices.sort(() => 0.5 - Math.random()).slice(0, 4);
            
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
                breadcrumbHtml = `<a href="/" class="hover:text-neutral-900 transition-colors inline-flex items-center gap-1" aria-label="Inicio"><iconify-icon icon="solar:home-smile-bold-duotone" class="text-lg"></iconify-icon></a> <span class="mx-2">/</span> <span class="text-neutral-500">${zona}</span>`;
                heroSub = `Ubicación: ` + zona;
            } else if (nivel.includes('Hub Svc')) {
                breadcrumbHtml = `<a href="/" class="hover:text-teal-900 transition-colors inline-flex items-center gap-1" aria-label="Inicio"><iconify-icon icon="solar:home-smile-bold-duotone" class="text-lg"></iconify-icon></a> <span class="mx-2">/</span> <span class="text-teal-900/60">${servicio}</span>`;
                heroSub = servicio;
            } else if (nivel.includes('Prog')) {
                const parentUrl = findHubZonaUrl(zona);
                breadcrumbHtml = `<a href="/" class="hover:text-teal-900 transition-colors inline-flex items-center gap-1" aria-label="Inicio"><iconify-icon icon="solar:home-smile-bold-duotone" class="text-lg"></iconify-icon></a> <span class="mx-2">/</span> <a href="${parentUrl}" class="hover:text-teal-900 transition-colors">${zona}</a> <span class="mx-2">/</span> <span class="text-teal-900/60">${servicio}</span>`;
                heroSub = servicio;
            }

            let heroImage = '/assets/hero_7720.webp';
            const fallbackImages = ['/assets/hero_7720.webp', '/assets/home_ambient_therapy.png'];
            const srvBusqueda = (row['Servicio'] || row['H1'] || '').toLowerCase();
            
            if (srvBusqueda.includes('relajante')) heroImage = '/assets/servicios/masaje_relajante.webp';
            else if (srvBusqueda.includes('deportivo')) heroImage = '/assets/servicios/masaje_deportivo.webp';
            else if (srvBusqueda.includes('terapéutico') || srvBusqueda.includes('terapeutico')) heroImage = '/assets/servicios/masaje_terapeutico.webp';
            else if (srvBusqueda.includes('prenatal')) heroImage = '/assets/servicios/masaje_prenatal.webp';
            else if (srvBusqueda.includes('drenaje')) heroImage = '/assets/servicios/drenaje_linfatico.webp';
            else if (srvBusqueda.includes('descontracturante')) heroImage = '/assets/servicios/masaje_descontracturante.webp';
            else if (srvBusqueda.includes('tejido profundo')) heroImage = '/assets/servicios/tejido_profundo.webp';
            else if (srvBusqueda.includes('piedras')) heroImage = '/assets/servicios/piedras_volcanicas.webp';
            else if (srvBusqueda.includes('ventosas')) heroImage = '/assets/servicios/masaje_ventosas.webp';
            else if (urlPath !== '') {
                // Elección pseudoaleatoria y determinista entre las fotos 'Home' nuevas (excluyendo el default) para los Hubs
                const val = Array.from(urlPath).reduce((acc, char) => acc + char.charCodeAt(0), 0);
                heroImage = fallbackImages[val % fallbackImages.length];
            } else {
                // Caso estricto para el index '/'
                heroImage = '/assets/hero_7720.webp';
            }

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
                <section class="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 lg:py-20 bg-white order-0 w-full mb-8 rounded-3xl border border-stone-100 shadow-sm mt-8">
                    <div class="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center">
                        <div>
                            <span class="text-[10px] sm:text-[12px] tracking-[0.2em] font-bold mb-4 block text-teal-600 uppercase border-l-2 border-teal-500 pl-3">Metodología Especializada</span>
                            <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-teal-950 mb-6 leading-snug">¿Por qué nuestro <span class="text-teal-700">${row['Servicio']}</span> resalta sobre el resto?</h2>
                            <p class="text-stone-500 font-light leading-relaxed mb-8 text-base sm:text-lg">
                                En la industria existen demasiadas técnicas genéricas. En Manos Curativas, llevamos a tu domicilio un protocolo exclusivo fundamentado en anatomía, utilizando aceites base orgánicos libres de parabenos y combinando la tecnología manual con aromaterapia para un efecto holístico.
                            </p>
                            <button onclick="openQuizModal()" class="uppercase tracking-[0.2em] text-[12px] sm:text-[13px] font-bold text-white bg-teal-900 px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-teal-800 transition-colors inline-block mt-2">Agendar este Tratamiento</button>
                        </div>
                        <div class="bg-stone-50 rounded-2xl p-6 md:p-8">
                            ${featuresHtml}
                        </div>
                    </div>
                </section>`;
            }

            // OG / Schema variables
            const domain = 'https://manoscurativas.com.co';
            const canonicalUrl = urlPath === '' ? `${domain}/` : `${domain}/${urlPath}/`;
            const ogImage = `${domain}${heroImage}`;

            // Reemplazo en Plantilla Maestra
            let pageHtml = plantillaMaestra
                .replace(/\/assets\/hero_massage\.png/g, heroImage)
                .replace(/\/assets\/hero_7720\.webp/g, heroImage)
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
                .replace(/{{PHILOSOPHY_CTA}}/g, philosophyCta)
                .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
                .replace(/{{OG_IMAGE}}/g, ogImage)
                .replace(/{{CIUDAD}}/g, row['Zona'] || 'Antioquia');

            // Exportar archivo HTML (incluso el 'Homepage' que cuya url es '/')
            const fileName = urlPath === '' ? 'index.html' : 'index.html';
            const filaGuardar = urlPath === '' ? path.join(DIST_DIR, fileName) : path.join(fullDir, fileName);
            
            if (urlPath !== '') {
                sitemapUrls.push(canonicalUrl);
            }
            
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

        let blogCategories = {};

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

            let breadcrumbHtml = `<a href="/" class="hover:text-teal-900 transition-colors inline-flex items-center gap-1" aria-label="Inicio"><iconify-icon icon="solar:home-smile-bold-duotone" class="text-lg"></iconify-icon></a> <span class="mx-2">/</span> <a href="/blog/" class="hover:text-teal-900 transition-colors">Blog</a> <span class="mx-2">/</span> <span class="text-teal-900/60">${row['Categoría'] || 'Artículos'}</span>`;

            // Distribute images consistently but pseudo-randomly per article to avoid identical repeats in a category
            const generatedImages = ['/assets/servicios/spa_aromatherapy_oils_1775517629371.webp', '/assets/servicios/spa_bamboo_massage_1775517616923.webp', '/assets/servicios/spa_facial_massage_1775517669296.webp', '/assets/servicios/spa_herbal_compress_1775517697102.webp', '/assets/servicios/spa_himalayan_salt_1775517710052.webp', '/assets/servicios/spa_hot_towels_1775517657217.webp', '/assets/servicios/spa_lotion_bottles_1775517736945.webp', '/assets/servicios/spa_massage_oils_hands_1775517723953.webp', '/assets/servicios/spa_reflexology_feet_1775517643226.webp', '/assets/servicios/spa_zen_stones_1775517681245.webp'];
            const fallbackImagesBlog = ['/assets/home_spa_living_room.webp', '/assets/home_ambient_therapy.webp', '/assets/blog_massage.webp', '/assets/hero_massage.webp', '/assets/servicios/drenaje_linfatico_1775258172320.webp', '/assets/servicios/masaje_deportivo_1775258135018.webp', '/assets/servicios/masaje_descontracturante_1775258187420.webp', '/assets/servicios/masaje_relajante_1775258118832.webp', '/assets/servicios/masaje_terapeutico_1775258148420.webp', '/assets/servicios/masaje_ventosas_1775258244036.webp', '/assets/servicios/piedras_volcanicas_1775258259475.webp', '/assets/servicios/tejido_profundo_1775258200977.webp', '/assets/servicios/premium_massage_blog_1775256124234.webp', ...generatedImages];
            
            const valBlog = Array.from(urlReal).reduce((acc, char) => acc + char.charCodeAt(0), 0);
            let heroImageBlog = fallbackImagesBlog[valBlog % fallbackImagesBlog.length];
            if (urlReal.includes('prenatal') || urlReal.includes('embarazada') || (row['Categoría']||'').toLowerCase().includes('prenatal') || (row['Título']||'').toLowerCase().includes('prenatal')) {
                const prenatalImages = ['/assets/servicios/masaje_prenatal_1775258232218.webp'];
                heroImageBlog = prenatalImages[valBlog % prenatalImages.length];
            }

            // Crear recomendación de artículos relacionados (4 aleatorios para scroll infinito)
            let relatedCardsHtml = '';
            const otherBlogs = rowsBlog.filter(b => b['Slug URL'] && b['Título'] && b['Slug URL'] !== row['Slug URL']);
            const randomRelated = otherBlogs.sort(() => 0.5 - Math.random()).slice(0, 4);
            
            randomRelated.forEach(rel => {
                const relUrl = `/${rel['Slug URL'].replace(/^\/|\/$/g, '')}/`;
                const valRel = Array.from(relUrl).reduce((acc, char) => acc + char.charCodeAt(0), 0);
                let relImg = fallbackImagesBlog[valRel % fallbackImagesBlog.length];
                if (relUrl.includes('prenatal') || relUrl.includes('embarazada') || (rel['Categoría']||'').toLowerCase().includes('prenatal') || (rel['Título']||'').toLowerCase().includes('prenatal')) {
                    const prenatalImages = ['/assets/servicios/masaje_prenatal_1775258232218.webp'];
                    relImg = prenatalImages[valRel % prenatalImages.length];
                }

                relatedCardsHtml += `
            <a href="${relUrl}" class="group block shrink-0 snap-center w-[280px] md:w-[320px] bg-white rounded-3xl hover:-translate-y-1 overflow-hidden flex flex-col border border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-lg transition-all relative whitespace-normal text-left mx-2 mb-4">
                <div class="h-40 w-full bg-stone-100 overflow-hidden relative">
                    <img src="${relImg}" alt="${rel['Título']}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy">
                    <div class="absolute inset-0 bg-teal-950/20 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                <div class="p-6 md:p-8 flex-1 flex flex-col">
                    <div class="text-[10px] tracking-[0.2em] uppercase font-bold text-teal-600 mb-4">${rel['Categoría']}</div>
                    <h3 class="text-lg font-serif font-bold leading-tight mb-4 group-hover:text-teal-700 text-teal-950 transition-colors">${rel['Título']}</h3>
                    <div class="mt-auto pt-4 border-t border-stone-100 inline-flex items-center gap-2 text-stone-400 group-hover:text-teal-600 text-[11px] uppercase tracking-[0.2em] font-bold transition-colors">
                        Leer artículo <iconify-icon icon="solar:arrow-right-line-duotone" class="text-lg"></iconify-icon>
                    </div>
                </div>
            </a>`;
            });

            // Leer contenido específico del artículo
            const blogContentMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/blog_content.json'), 'utf8'));
            let articleHtml = blogContentMap[urlReal] || blogContentMap['fallback'];

            // OG / Schema variables Blog
            const domainBlog = 'https://manoscurativas.com.co';
            const canonicalUrlBlog = `${domainBlog}${urlReal}`;
            const ogImageBlog = `${domainBlog}${heroImageBlog}`;

            let pageHtml = plantillaBlog
                .replace(/\/assets\/blog_massage\.png/g, heroImageBlog)
                .replace(/{{TITLE}}/g, row['Título'])
                .replace(/{{META_DESC}}/g, row['Meta Description'] || '')
                .replace(/{{H1}}/g, row['Título'])
                .replace(/{{CATEGORIA}}/g, row['Categoría'] || 'Artículos')
                .replace(/{{ENLACES_SEO}}/g, enlacesSeoHtml)
                .replace(/{{BREADCRUMB_HTML}}/g, breadcrumbHtml)
                .replace(/{{BLOG_CARDS_HTML}}/g, relatedCardsHtml)
                .replace(/{{ARTICLE_CONTENT}}/g, articleHtml.replace(/{{H1}}/g, row['Título']))
                .replace(/{{CANONICAL_URL}}/g, canonicalUrlBlog)
                .replace(/{{OG_IMAGE}}/g, ogImageBlog);

            sitemapUrls.push(canonicalUrlBlog);

            fs.writeFileSync(path.join(fullDir, 'index.html'), pageHtml);

            // Add to Hub Index
            const cat = row['Categoría'] || 'Artículos';
            if (!blogCategories[cat]) {
                blogCategories[cat] = [];
            }
            blogCategories[cat].push(`
            <a href="${urlReal}" class="group block shrink-0 snap-center w-[85vw] md:w-auto bg-white rounded-[2rem] hover:-translate-y-1 transition-transform overflow-hidden flex flex-col h-full border border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-lg">
                <div class="h-48 w-full bg-stone-100 overflow-hidden relative">
                    <img src="${heroImageBlog}" alt="${row['Título']}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <div class="p-6 md:p-8 flex-1 flex flex-col bg-white">
                    <h3 class="text-xl font-serif font-bold leading-tight mb-3 text-teal-950 group-hover:text-teal-700 transition-colors">${row['Título']}</h3>
                    <p class="text-[14px] font-light text-stone-500 font-sans leading-relaxed line-clamp-3">${row['Meta Description']}</p>
                </div>
            </a>`);
        }

        // Crear Hub de Blog (index)
        const blogHubDir = path.join(DIST_DIR, 'blog');
        ensureDir(blogHubDir);
        
        let breadcrumbBlogHub = `<a href="/" class="hover:text-teal-900 transition-colors inline-flex items-center gap-1" aria-label="Inicio"><iconify-icon icon="solar:home-smile-bold-duotone" class="text-lg"></iconify-icon></a> <span class="mx-2">/</span> <span class="text-teal-900/60">Blog</span>`;

        let genericGridServicios = '';
        rows.filter(r => r.Nivel && r.Nivel.includes('Hub Svc')).slice(0, 4).forEach(srv => genericGridServicios += generarCardBlogServicio(srv.URL, srv.Servicio, false));
        let singleLoopZonas = '';
        rows.filter(r => r.Nivel && r.Nivel.includes('Hub Zona')).forEach(z => singleLoopZonas += generarCardZona(z.URL, z.Zona));
        let genericGridZonas = singleLoopZonas + singleLoopZonas;

        let navLinks = '';
        const validCategories = Object.keys(blogCategories).filter(c => c !== 'Categoría');
        
        for(const catName of validCategories) {
            const catId = catName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
            navLinks += `<a href="#${catId}" class="whitespace-nowrap px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-teal-800/50 transition-colors rounded-lg">${catName}</a>`;
        }

        let categorySectionsHtml = '';
        for (const [catName, cards] of Object.entries(blogCategories)) {
            if (catName === 'Categoría') continue;
            const catId = catName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');

            let halfA_cards = [...cards];
            while(halfA_cards.length < 4) {
                halfA_cards.push(...cards);
            }
            
            let halfA_html = '';
            for(let i=0; i<halfA_cards.length; i++) {
                if (i < cards.length) {
                    halfA_html += halfA_cards[i] + '\n';
                } else {
                    halfA_html += halfA_cards[i].replace('class="group ', 'aria-hidden="true" class="md:hidden group ') + '\n';
                }
            }
            
            let halfB_html = '';
            for(let i=0; i<halfA_cards.length; i++) {
                halfB_html += halfA_cards[i].replace('class="group ', 'aria-hidden="true" class="md:hidden group ') + '\n';
            }

            categorySectionsHtml += `
            <div id="${catId}" class="mb-20 last:mb-0 pt-28 -mt-28 overflow-hidden">
                <div class="mb-10 text-left border-b border-stone-200 pb-4">
                    <h3 class="text-2xl md:text-3xl font-serif font-bold text-teal-950">${catName}</h3>
                </div>
                <div class="relative max-w-full overflow-visible [mask-image:_linear-gradient(to_right,transparent_0,_black_40px,_black_calc(100%-40px),transparent_100%)] md:[mask-image:none]">
                    <div class="flex flex-nowrap w-max gap-4 pb-4 px-4 pt-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-8 md:w-auto md:px-0 md:pb-8 md:pt-0 animate-marquee hover:[animation-play-state:paused] md:animate-none group-hover:[animation-play-state:paused]">
                        ${halfA_html}
                        ${halfB_html}
                    </div>
                </div>
            </div>`;
        }

        const blogCustomSectionHtml = `
    <!-- SUBNAV DE CATEGORÍAS -->
    <div class="bg-[#1C4D43] sticky top-[64px] lg:top-[88px] z-40 overflow-x-auto style-scroll shadow-md">
        <div class="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-start md:justify-center gap-1 md:gap-4 py-2">
            ${navLinks}
        </div>
    </div>

    <!-- SECCIÓN DE BLOG POSTS POR CATEGORÍAS -->
    <section class="py-16 md:py-24 bg-white border-b border-stone-100">
        <div class="max-w-7xl mx-auto px-6">
            ${categorySectionsHtml}
        </div>
    </section>
    <style>
        .style-scroll::-webkit-scrollbar { display: none; }
        .style-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    </style>`;

        let blogHubHtml = plantillaMaestra
            .replace(/\/assets\/hero_massage\.png/g, '/assets/home_ambient_therapy.png')
            .replace(/{{TITLE}}/g, 'Blog de Bienestar y Masajes')
            .replace(/{{META_DESC}}/g, 'Descubre artículos sobre bienestar, técnicas de relajación, beneficios fisiológicos de nuestras terapias y cuidado integral en nuestro blog oficial.')
            .replace(/{{H1}}/g, 'Blog y Bienestar')
            .replace(/{{HERO_SUB_TEXT}}/g, 'Artículos Recientes')
            .replace(/<!-- Reseñas de Google - Elfsight -->/g, blogCustomSectionHtml + '\n<!-- Reseñas de Google - Elfsight -->')
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

        // ========================================================
        // 5. CONSTRUCCIÓN DE DIRECTORIOS GLOBALES (/servicios/ y /cobertura/)
        // ========================================================
        
        // Split template to get clean header and clean footer
        const templateTop = plantillaMaestra.split('<!-- Hero Section -->')[0];
        const templateBottomRaw = plantillaMaestra.split('<!-- Footer SEO Premium -->');
        const templateBottom = templateBottomRaw.length > 1 ? '<!-- Footer SEO Premium -->' + templateBottomRaw[1] : '';

        // --- 5.1 HUB: /servicios/ ---
        const serviciosDir = path.join(DIST_DIR, 'servicios');
        ensureDir(serviciosDir);
        let srvCards = '';
        const allServicios = rows.filter(r => r.Nivel && r.Nivel.includes('Hub Svc'));
        allServicios.forEach(s => srvCards += generarCardBlogServicio(s.URL, s.Servicio, false));

        let srvHead = templateTop
            .replace(/<title>.*<\/title>/g, `<title>Listado de Servicios de Masoterapia a Domicilio - Manos Curativas</title>`)
            .replace(/<meta name="description" content=".*">/g, `<meta name="description" content="Directorio completo de terapias manuales y masajes a domicilio. Relajantes, descontracturantes, ventosas y más.">`)
            .replace(/{{BREADCRUMB_HTML}}/g, '<a href="/" class="hover:text-teal-900 transition-colors inline-flex items-center gap-1" aria-label="Inicio"><iconify-icon icon="solar:home-smile-bold-duotone" class="text-lg"></iconify-icon></a> <span class="mx-2">/</span> <span class="text-teal-900/60">Servicios</span>');

        let srvBody = `
        <main class="bg-stone-50 min-h-screen pt-12 pb-24">
            <div class="max-w-7xl mx-auto px-4 sm:px-6">
                <!-- Header del Directorio -->
                <div class="text-center md:text-left mb-16 border-b border-stone-200 pb-12">
                    <span class="text-[13px] tracking-[0.3em] font-bold text-teal-600 uppercase block mb-4">Catálogo de Terapias</span>
                    <h1 class="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-teal-950 mb-6">Nuestros Servicios a Domicilio</h1>
                    <p class="text-lg md:text-xl text-stone-500 font-light max-w-2xl">Descubre todas las especialidades que nuestros terapeutas pueden llevar a la comodidad de tu hogar. Desde relajación absoluta hasta rehabilitación clínica profunda.</p>
                </div>
                
                <!-- Grid del Directorio -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    ${srvCards}
                </div>
                
                <!-- Reseñas de Google - Elfsight -->
                <div class="mt-20">
                    <div class="mb-10 text-center">
                        <span class="text-[13px] tracking-[0.3em] font-bold mb-4 block text-teal-600 uppercase">Lo que dicen de nosotros</span>
                        <h2 class="text-3xl md:text-4xl font-serif font-bold text-teal-950">Experiencias Reales</h2>
                    </div>
                    <!-- Elfsight Google Reviews | Untitled Google Reviews -->
                    <script src="https://elfsightcdn.com/platform.js" async></script>
                    <div class="elfsight-app-3b0c9165-58ee-429b-97f4-474b77757d42" data-elfsight-app-lazy></div>
                </div>
            </div>
        </main>`;

        fs.writeFileSync(path.join(serviciosDir, 'index.html'), srvHead + srvBody + templateBottom);

        // --- 5.2 HUB: /cobertura/ ---
        const coberturasDir = path.join(DIST_DIR, 'cobertura');
        ensureDir(coberturasDir);
        let covCards = '';
        const allZonas = rows.filter(r => r.Nivel && r.Nivel.includes('Hub Zona') && r.Zona !== 'Todos');
        allZonas.forEach(z => covCards += generarCardZona(z.URL, z.Zona));

        let covHead = templateTop
            .replace(/<title>.*<\/title>/g, `<title>Zonas de Cobertura para Masajes a Domicilio - Manos Curativas</title>`)
            .replace(/<meta name="description" content=".*">/g, `<meta name="description" content="Revisa todas nuestras zonas y barrios de atención a domicilio. Profesionales que llegan hasta tu puerta.">`)
            .replace(/{{BREADCRUMB_HTML}}/g, '<a href="/" class="hover:text-teal-900 transition-colors inline-flex items-center gap-1" aria-label="Inicio"><iconify-icon icon="solar:home-smile-bold-duotone" class="text-lg"></iconify-icon></a> <span class="mx-2">/</span> <span class="text-teal-900/60">Cobertura</span>');

        let covBody = `
        <main class="bg-stone-50 min-h-screen pt-12 pb-24">
            <div class="max-w-7xl mx-auto px-4 sm:px-6">
                <!-- Header del Directorio -->
                <div class="text-center mb-16 border-b border-stone-200 pb-12">
                    <span class="text-[13px] tracking-[0.3em] font-bold text-teal-600 uppercase block mb-4">Mapa de Atención</span>
                    <h1 class="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-teal-950 mb-6">¿A dónde llegamos?</h1>
                    <p class="text-lg md:text-xl text-stone-500 font-light max-w-2xl mx-auto">Revisa todas las zonas urbanas y los diferentes barrios en los que nuestros terapeutas tienen cobertura inmediata y segura.</p>
                </div>
                
                <!-- Tag Collection (Zonas) -->
                <div class="flex flex-wrap gap-4 md:gap-6 justify-center max-w-5xl mx-auto">
                    ${covCards}
                </div>
            </div>
        </main>`;

        fs.writeFileSync(path.join(coberturasDir, 'index.html'), covHead + covBody + templateBottom);

        // --- 6. SITEMAP.XML Y ROBOTS.TXT ---
        console.log("\n🗺️  Generando Sitemap y Robots.txt...");
        
        const dateNow = new Date().toISOString().split('T')[0];
        let sitemapBody = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
        
        const uniqueUrls = [...new Set(sitemapUrls)];
        uniqueUrls.forEach(url => {
            const isHome = url === 'https://manoscurativas.com.co/';
            const priority = isHome ? '1.0' : (url.includes('/blog/') ? '0.7' : '0.8');
            sitemapBody += `
  <url>
    <loc>${url}</loc>
    <lastmod>${dateNow}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
        });
        
        sitemapBody += `\n</urlset>`;
        
        fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapBody);
        
        const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://manoscurativas.com.co/sitemap.xml`;
        fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt);

        console.log("🎉 ¡Blog y su Index compilados con éxito!");

    } catch (err) {
        console.error("❌ Ocurrió un error en la compilación:", err);
    }
}

build();
