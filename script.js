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

    // 3. Booking Engine Elements
    const form = document.getElementById('bookingForm');
    const fechaInput = document.getElementById('fechaViaje');
    const fechaAviso = document.getElementById('fechaAviso');
    const tipoTransporte = document.getElementById('tipoTransporte');
    const pasajerosInput = document.getElementById('pasajeros');
    const precioTotalEl = document.getElementById('precioTotal');
    const availabilityAlert = document.getElementById('availabilityAlert');
    
    // Stats elements
    const capacidadTotalEl = document.getElementById('capacidadTotal');
    const asientosOcupadosEl = document.getElementById('asientosOcupados');
    const asientosLibresEl = document.getElementById('asientosLibres');
    const progressBarFill = document.getElementById('progressBarFill');
    const cuposMaxAviso = document.getElementById('cuposMaxAviso');
    const submitBtn = document.getElementById('submitBookingBtn');

    // Set min date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    fechaInput.min = `${yyyy}-${mm}-${dd}`;

    // Deterministic state simulation per date and transport type
    let simulatedCapacity = 14;
    let simulatedBooked = 8;
    let simulatedFree = 6;

    function updateCapacityAndStats() {
        const selectedOption = tipoTransporte.options[tipoTransporte.selectedIndex];
        const capacity = parseInt(selectedOption.dataset.capacity) || 14;
        const pricePerPerson = parseInt(selectedOption.dataset.price) || 110;
        
        // Update input passengers limits
        pasajerosInput.max = capacity;
        if (parseInt(pasajerosInput.value) > capacity) {
            pasajerosInput.value = capacity;
        }

        const dateStr = fechaInput.value || `${yyyy}-${mm}-${dd}`;
        
        // Generate a pseudo-random hash based on the combination of date and transport type
        let combinedStr = dateStr + selectedOption.value;
        let hash = 0;
        for (let i = 0; i < combinedStr.length; i++) {
            hash = combinedStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        simulatedCapacity = capacity;
        
        // Simulate already booked seats (always leave at least 2 empty seats, but at most capacity-1)
        const maxSimulatedBooked = Math.max(1, capacity - 2);
        simulatedBooked = Math.abs(hash % maxSimulatedBooked) + 1;
        simulatedFree = simulatedCapacity - simulatedBooked;

        // Apply input passenger count checking
        const requestedPasajeros = parseInt(pasajerosInput.value) || 1;
        const finalFree = simulatedFree - requestedPasajeros;

        // Update Text
        capacidadTotalEl.textContent = `${simulatedCapacity} asientos`;
        asientosOcupadosEl.textContent = simulatedBooked;
        
        if (finalFree >= 0) {
            asientosLibresEl.textContent = finalFree;
            asientosLibresEl.parentElement.className = 'stat-item highlight-green';
            cuposMaxAviso.textContent = `Quedarán ${finalFree} asientos libres tras tu reserva.`;
            cuposMaxAviso.style.color = '#4B5563';
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
        } else {
            asientosLibresEl.textContent = 0;
            asientosLibresEl.parentElement.className = 'stat-item text-error';
            cuposMaxAviso.textContent = `¡Exceso de pasajeros! Solo quedan ${simulatedFree} asientos disponibles para esta fecha.`;
            cuposMaxAviso.style.color = '#ef4444';
            submitBtn.setAttribute('disabled', 'true');
            submitBtn.style.opacity = '0.5';
        }

        // Fill Progress Bar
        const percentage = Math.min(100, ((simulatedBooked + requestedPasajeros) / simulatedCapacity) * 100);
        progressBarFill.style.width = `${percentage}%`;
        if (percentage >= 90) {
            progressBarFill.style.backgroundColor = '#ef4444'; // Red if almost full
        } else {
            progressBarFill.style.backgroundColor = 'var(--clr-secondary)';
        }

        // Price Update
        const total = pricePerPerson * requestedPasajeros;
        precioTotalEl.textContent = `${total} Bs.`;

        // Availability box text
        if (fechaInput.value) {
            if (finalFree >= 0) {
                availabilityAlert.innerHTML = `<i class="ph-fill ph-check-circle" style="color:var(--clr-whatsapp)"></i> ¡Disponible! Puedes reservar tus ${requestedPasajeros} asientos para la fecha seleccionada.`;
                availabilityAlert.style.borderLeftColor = 'var(--clr-whatsapp)';
            } else {
                availabilityAlert.innerHTML = `<i class="ph-fill ph-warning-octagon" style="color:#ef4444"></i> Cupos insuficientes en el tipo de vehículo seleccionado.`;
                availabilityAlert.style.borderLeftColor = '#ef4444';
            }
        } else {
            availabilityAlert.innerHTML = `<i class="ph-fill ph-info"></i> Selecciona una fecha para ver el estado de ocupación del transporte.`;
            availabilityAlert.style.borderLeftColor = 'var(--clr-secondary)';
        }
    }

    // Date Validation
    fechaInput.addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value + 'T12:00:00');
        const day = selectedDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        
        if (day !== 0 && day !== 5 && day !== 6) {
            fechaAviso.classList.remove('hidden');
            fechaAviso.textContent = 'Salidas regulares son Viernes, Sábado y Domingo. Otras fechas bajo consulta.';
            fechaAviso.style.color = 'var(--clr-secondary)';
        } else {
            fechaAviso.classList.add('hidden');
        }
        updateCapacityAndStats();
    });

    tipoTransporte.addEventListener('change', updateCapacityAndStats);
    pasajerosInput.addEventListener('input', updateCapacityAndStats);

    // Initial load
    updateCapacityAndStats();

    // 4. Payment Method Logic
    const optionCards = document.querySelectorAll('.payment-option-card');
    const payBoxes = {
        qr: document.getElementById('payBoxQR'),
        tarjeta: document.getElementById('payBoxCard'),
        whatsapp: document.getElementById('payBoxWA')
    };

    let selectedPaymentMethod = 'qr';

    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active classes
            optionCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const radioBtn = card.querySelector('input[type="radio"]');
            if (radioBtn) radioBtn.checked = true;

            const method = card.dataset.method;
            selectedPaymentMethod = method;

            // Show/Hide details boxes
            Object.keys(payBoxes).forEach(key => {
                if (key === method) {
                    payBoxes[key].classList.remove('hidden');
                } else {
                    payBoxes[key].classList.add('hidden');
                }
            });
        });
    });

    // 5. Submit Reservation to WhatsApp
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fecha = fechaInput.value;
        const transporteOption = tipoTransporte.options[tipoTransporte.selectedIndex].text;
        const pasajeros = pasajerosInput.value;
        const nombre = document.getElementById('nombreCompleto').value;
        const telefono = document.getElementById('telefono').value;
        const carnet = document.getElementById('carnet').value;
        const total = precioTotalEl.textContent;

        let pagoTexto = 'Efectivo / Coordinar por WhatsApp';
        if (selectedPaymentMethod === 'qr') {
            pagoTexto = 'Pago por transferencia QR (adjuntaré comprobante)';
        } else if (selectedPaymentMethod === 'tarjeta') {
            const cardNum = document.getElementById('cardNumber').value || '•••• •••• •••• ••••';
            pagoTexto = `Pago con Tarjeta de Crédito/Débito (${cardNum.slice(-4)})`;
        }

        const itinerarioResumen = `📍 Partida: 06:30 AM - Sede UMSA Caranavi
🕒 Llegada: 09:30 AM - San Benito
🎒 Retorno: 17:00 PM - Retorno a Caranavi`;

        const mensaje = `🌿 *TRANSPORTE TURÍSTICO CARANAVI* 🌿
¡Hola! Quiero confirmar una reserva de traslado turístico:

👤 *Titular:* ${nombre}
🪪 *Documento C.I.:* ${carnet}
📞 *Teléfono:* ${telefono}
📅 *Fecha de Viaje:* ${fecha}
🚐 *Transporte:* ${transporteOption}
👥 *Asientos reservados:* ${pasajeros}
💰 *Total a pagar:* ${total}
💳 *Método de Pago:* ${pagoTexto}

------------------------------------
📌 *ITINERARIO DEL VIAJE*
${itinerarioResumen}
------------------------------------

Por favor, confirmen mi reservación. ¡Gracias!`;

        const encodedMensaje = encodeURIComponent(mensaje);
        const numeroEmpresa = '59175223813'; // Target business number
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${numeroEmpresa}&text=${encodedMensaje}`;
        
        window.open(whatsappUrl, '_blank');
    });
});

// Selector function from cards
window.selectTransport = function(type) {
    const selector = document.getElementById('tipoTransporte');
    selector.value = type;
    
    // Trigger change event to update details
    const event = new Event('change');
    selector.dispatchEvent(event);
    
    // Smooth scroll to booking
    document.getElementById('reserva').scrollIntoView({ behavior: 'smooth' });
};
