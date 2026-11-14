document.addEventListener('DOMContentLoaded', () => {
    const formCarrera = document.getElementById('formCarrera');
    const listaCarreras = document.getElementById('listaCarreras');
    const contadorCarreras = document.getElementById('contadorCarreras');

    // Identificar al conductor actual
    let conductorActual = JSON.parse(localStorage.getItem('en_via_conductor')) || null;

    function verificarConductor() {
        if (!conductorActual) {
            const nombre = prompt("¡Bienvenido a EN-VIA! Ingresa tu nombre para identificarte:");
            if (nombre) {
                conductorActual = { nombre: nombre.trim() };
                localStorage.setItem('en_via_conductor', JSON.stringify(conductorActual));
            } else {
                alert("Debes identificarte para usar la aplicación.");
                location.reload();
            }
        }
    }

    verificarConductor();

    // Cargar carreras pendientes
    async function cargarCarrerasPendientes() {
        const { data, error } = await supabaseClient
            .from('carreras')
            .select('*')
            .eq('estado', 'pendiente')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al cargar carreras:', error);
            return;
        }

        renderizarCarreras(data);
    }

    // Renderizar tarjetas en pantalla
    function renderizarCarreras(carreras) {
        contadorCarreras.textContent = carreras.length;

        if (carreras.length === 0) {
            listaCarreras.innerHTML = `<p class="text-slate-500 text-center py-8 bg-white rounded-xl border border-slate-200">No hay servicios pendientes en este momento.</p>`;
            return;
        }

        listaCarreras.innerHTML = '';
        carreras.forEach(carrera => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-md p-5 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-lg';
            
            card.innerHTML = `
                <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Pendiente</span>
                        <span class="text-sm text-slate-500">Hora: <strong>${carrera.fecha_hora_servicio}</strong></span>
                        <span class="text-sm text-slate-500">• 🚗 <strong>Distancia:</strong> ${carrera.distancia}</span>
                    </div>
                    <p class="text-slate-800 font-medium">👤 <strong>Cliente:</strong> ${carrera.cliente_nombre || 'General'} ${carrera.cliente_telefono ? `(${carrera.cliente_telefono})` : ''}</p>
                    <p class="text-slate-800 font-medium">📍 <strong>Origen:</strong> ${carrera.origen}</p>
                    <p class="text-slate-800 font-medium">🏁 <strong>Destino:</strong> ${carrera.destino}</p>
                    ${carrera.notas ? `<p class="text-sm text-slate-600">💬 <em>${carrera.notas}</em></p>` : ''}
                </div>
                <div class="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3">
                    <span class="text-xl font-bold text-emerald-600">$${carrera.precio}</span>
                    <button onclick="tomarCarrera('${carrera.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 shadow">
                        Tomar Servicio
                    </button>
                </div>
            `;
            listaCarreras.appendChild(card);
        });
    }

    // Registrar nueva carrera
    formCarrera.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevaCarrera = {
            cliente_nombre: document.getElementById('clienteNombre').value || 'Cliente General',
            cliente_telefono: document.getElementById('clienteTelefono').value || '',
            origen: document.getElementById('origen').value,
            destino: document.getElementById('destino').value,
            fecha_hora_servicio: document.getElementById('hora').value,
            distancia: document.getElementById('distancia').value,
            precio: document.getElementById('precio').value,
            notas: document.getElementById('notas').value,
            estado: 'pendiente'
        };

        const { error } = await supabaseClient
            .from('carreras')
            .insert([nuevaCarrera]);

        if (error) {
            alert('Error al publicar el servicio: ' + error.message);
            console.error(error);
        } else {
            formCarrera.reset();
            alert('¡Servicio publicado con éxito en EN-VIA!');
        }
    });

    // Tomar carrera
    window.tomarCarrera = async function(idCarrera) {
        if (!confirm(`¿${conductorActual.nombre}, deseas tomar este servicio?`)) return;

        const { error } = await supabaseClient
            .from('carreras')
            .update({ 
                estado: 'asignada', 
                conductor_asignado: conductorActual.nombre 
            })
            .eq('id', idCarrera);

        if (error) {
            alert('No se pudo tomar el servicio. Es posible que otro compañero ya lo haya tomado.');
            console.error(error);
        } else {
            alert('¡Has tomado el servicio correctamente!');
        }
    };

    // Escuchar cambios en tiempo real con Supabase Realtime
    supabaseClient
        .channel('public:carreras')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'carreras' }, payload => {
            cargarCarrerasPendientes();
        })
        .subscribe();

    cargarCarrerasPendientes();
});