document.addEventListener('DOMContentLoaded', () => {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registrado con éxito.', reg.scope))
                .catch(err => console.warn('Error al registrar Service Worker.', err));
        });
    }

    // 2. PWA Install Prompt
    let deferredPrompt;
    const installBtn = document.getElementById('installAppBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('Usuario aceptó instalar la PWA');
            }
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        }
    });

    // 3. Booking Engine Logic
    const form = document.getElementById('bookingForm');
    const fechaInput = document.getElementById('fechaViaje');
    const fechaAviso = document.getElementById('fechaAviso');
    const tipoTransporte = document.getElementById('tipoTransporte');
    const pasajerosInput = document.getElementById('pasajeros');
    const precioTotalEl = document.getElementById('precioTotal');
    const availabilityAlert = document.getElementById('availabilityAlert');

    // Set min date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    fechaInput.min = `${yyyy}-${mm}-${dd}`;

    // Update Price and Availability
    function updateBookingState() {
        // Price Calculation
        const pricePerPerson = parseInt(tipoTransporte.options[tipoTransporte.selectedIndex].dataset.price);
        const numPasajeros = parseInt(pasajerosInput.value) || 1;
        const total = pricePerPerson * numPasajeros;
        precioTotalEl.textContent = `${total} Bs.`;

        // Availability Simulation based on date and transport
        if (fechaInput.value) {
            const dateStr = fechaInput.value;
            // Simple hash for consistent random-looking availability based on date string
            let hash = 0;
            for (let i = 0; i < dateStr.length; i++) {
                hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            // Generate a random number of seats between 1 and 15
            const baseAvailability = Math.abs(hash % 15) + 1; 
            const transportName = tipoTransporte.options[tipoTransporte.selectedIndex].text.split(' ')[0];
            
            availabilityAlert.innerHTML = `<i class="ph-fill ph-check-circle" style="color:var(--clr-whatsapp)"></i> ¡Excelente! Hay <strong>${baseAvailability} cupos disponibles</strong> en ${transportName} para esta fecha.`;
            availabilityAlert.style.borderLeftColor = 'var(--clr-whatsapp)';
        } else {
            availabilityAlert.innerHTML = `<i class="ph-fill ph-info"></i> Selecciona una fecha para ver disponibilidad.`;
            availabilityAlert.style.borderLeftColor = 'var(--clr-secondary)';
        }
    }

    // Date Validation (Check for Fri, Sat, Sun)
    fechaInput.addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value + 'T12:00:00'); // Prevent timezone shift
        const day = selectedDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        
        if (day !== 0 && day !== 5 && day !== 6) {
            fechaAviso.classList.remove('hidden');
            fechaAviso.textContent = 'Aviso: Salidas en este día están sujetas a disponibilidad (bajo consulta). Días regulares: Viernes, Sábado y Domingo.';
            fechaAviso.style.color = '#EA580C'; // Orange warning
        } else {
            fechaAviso.classList.add('hidden');
        }
        
        updateBookingState();
    });

    tipoTransporte.addEventListener('change', updateBookingState);
    pasajerosInput.addEventListener('input', updateBookingState);

    // Initial calculation
    updateBookingState();

    // Submit Form -> WhatsApp Redirect
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fecha = fechaInput.value;
        const transporte = tipoTransporte.options[tipoTransporte.selectedIndex].text;
        const pasajeros = pasajerosInput.value;
        const nombre = document.getElementById('nombreCompleto').value;
        const telefono = document.getElementById('telefono').value;
        const carnet = document.getElementById('carnet').value;
        const total = precioTotalEl.textContent;

        const mensaje = `¡Hola Trans Turístico Caranavi! 🌿🚌
Quiero confirmar una reserva para San Benito:

👤 *Nombre:* ${nombre}
🪪 *C.I.:* ${carnet}
📞 *Teléfono:* ${telefono}
📅 *Fecha de Viaje:* ${fecha}
🚐 *Transporte:* ${transporte}
👥 *Pasajeros:* ${pasajeros}
💰 *Total a Pagar:* ${total}

¿Me confirman la disponibilidad y los métodos de pago, por favor?`;

        const encodedMensaje = encodeURIComponent(mensaje);
        const numeroEmpresa = '59170000000'; // Replace with actual number
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${numeroEmpresa}&text=${encodedMensaje}`;
        
        window.open(whatsappUrl, '_blank');
    });
});

// Function to handle "Elegir" buttons on cards
window.selectTransport = function(type) {
    const selector = document.getElementById('tipoTransporte');
    selector.value = type;
    
    // Trigger change event to update price and availability
    const event = new Event('change');
    selector.dispatchEvent(event);
    
    // Smooth scroll to booking section
    document.getElementById('reserva').scrollIntoView({ behavior: 'smooth' });
};
