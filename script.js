document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registrado.', reg.scope))
                .catch(err => console.warn('Error al registrar Service Worker.', err));
        });
    }

    let deferredPrompt;
    const installBtn = document.getElementById('installAppBtn');

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        if (installBtn) installBtn.classList.remove('hidden');
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        });
    }

    const videoModal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    const btnVerVideo = document.getElementById('btnVerVideo');
    const closeModal = document.querySelector('.close-modal');

    if (btnVerVideo && videoModal && modalVideo && closeModal) {
        btnVerVideo.addEventListener('click', () => {
            videoModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            modalVideo.currentTime = 0;
            modalVideo.muted = false;
            modalVideo.play().catch(error => console.log('Reproduccion pendiente de interaccion:', error));
        });

        const closeVideoModal = () => {
            modalVideo.pause();
            videoModal.classList.add('hidden');
            document.body.style.overflow = '';
        };

        closeModal.addEventListener('click', closeVideoModal);
        videoModal.addEventListener('click', (event) => {
            if (event.target === videoModal) closeVideoModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !videoModal.classList.contains('hidden')) closeVideoModal();
        });
    }

    const VEHICLES = {
        ipsum: { label: 'Ipsum', price: 150, capacity: 6, hint: 'Puedes reservar hasta 6 pasajeros en Ipsum.', mapClass: 'ipsum-map' },
        minibus: { label: 'Mini Bus', price: 110, capacity: 14, hint: 'Puedes reservar hasta 14 pasajeros en Mini Bus.', mapClass: 'minibus-map' },
        flota: { label: 'Bus', price: 80, capacity: 44, hint: 'Puedes reservar hasta 44 pasajeros en Bus.', mapClass: 'bus-map' }
    };

    const STORAGE_KEY = 'transCaranaviReservationsV1';
    const DAY_MS = 24 * 60 * 60 * 1000;
    const businessWhatsApp = '59175223813';

    const booking = {
        step: 1,
        vehicle: 'minibus',
        passengers: 1,
        selectedSeats: [],
        payment: 'qr'
    };

    const form = document.getElementById('bookingForm');
    const fechaInput = document.getElementById('fechaViaje');
    const fechaAviso = document.getElementById('fechaAviso');
    const tipoTransporte = document.getElementById('tipoTransporte');
    const pasajerosInput = document.getElementById('pasajeros');
    const passengerForms = document.getElementById('passengerForms');
    const passengerLimitHint = document.getElementById('passengerLimitHint');
    const seatMap = document.getElementById('seatMap');
    const seatMapTitle = document.getElementById('seatMapTitle');
    const seatSelectionHint = document.getElementById('seatSelectionHint');
    const orderSummary = document.getElementById('orderSummary');
    const precioTotalEl = document.getElementById('precioTotal');
    const capacidadTotalEl = document.getElementById('capacidadTotal');
    const asientosOcupadosEl = document.getElementById('asientosOcupados');
    const asientosLibresEl = document.getElementById('asientosLibres');
    const progressBarFill = document.getElementById('progressBarFill');
    const cuposMaxAviso = document.getElementById('cuposMaxAviso');
    const availabilityAlert = document.getElementById('availabilityAlert');
    const nextStepBtn = document.getElementById('nextStepBtn');
    const prevStepBtn = document.getElementById('prevStepBtn');
    const clearBookingBtn = document.getElementById('clearBookingBtn');
    const increasePassengers = document.getElementById('increasePassengers');
    const decreasePassengers = document.getElementById('decreasePassengers');
    const payBoxes = {
        qr: document.getElementById('payBoxQR'),
        tarjeta: document.getElementById('payBoxCard'),
        whatsapp: document.getElementById('payBoxWA')
    };

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (fechaInput) {
        fechaInput.min = `${yyyy}-${mm}-${dd}`;
        fechaInput.value = `${yyyy}-${mm}-${dd}`;
    }

    let receiptBase64 = '';
    const receiptFileInput = document.getElementById('receiptFile');
    const receiptPreview = document.getElementById('receiptPreview');
    const receiptUploadLabel = document.getElementById('receiptUploadLabel');

    if (receiptFileInput) {
        receiptFileInput.addEventListener('change', () => {
            const file = receiptFileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                receiptBase64 = e.target.result;
                if (receiptPreview) {
                    receiptPreview.src = e.target.result;
                    receiptPreview.style.display = 'block';
                }
                if (receiptUploadLabel) {
                    receiptUploadLabel.textContent = '✓ Comprobante adjuntado correctamente';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function getReservations() {
        return window.YaraDB ? window.YaraDB.getReservations() : [];
    }

    function saveReservation(record) {
        if (window.YaraDB) {
            return window.YaraDB.saveReservation(record);
        }
        return record;
    }

    function getDateKey() {
        return fechaInput && fechaInput.value ? fechaInput.value : `${yyyy}-${mm}-${dd}`;
    }

    function getBookedSeats() {
        if (window.YaraDB) {
            return window.YaraDB.getBookedSeats(getDateKey(), booking.vehicle);
        }
        return [];
    }

    function collectPassengerData() {
        return Array.from({ length: booking.passengers }, (_, index) => ({
            name: document.getElementById(`passengerName-${index}`)?.value.trim() || '',
            phone: document.getElementById(`passengerPhone-${index}`)?.value.trim() || '',
            document: document.getElementById(`passengerDocument-${index}`)?.value.trim() || ''
        }));
    }

    function getCapacity() {
        return VEHICLES[booking.vehicle].capacity;
    }

    function getAvailableSeats() {
        return getCapacity() - getBookedSeats().length;
    }

    function renderSteps() {
        document.querySelectorAll('.booking-step').forEach(step => {
            step.classList.toggle('active', Number(step.dataset.step) === booking.step);
        });
        document.querySelectorAll('[data-step-indicator]').forEach(item => {
            const step = Number(item.dataset.stepIndicator);
            item.classList.toggle('active', step === booking.step);
            item.classList.toggle('complete', step < booking.step);
        });

        if (prevStepBtn) prevStepBtn.disabled = booking.step === 1;
        if (nextStepBtn) {
            nextStepBtn.classList.toggle('hidden', booking.step === 4);
            nextStepBtn.innerHTML = booking.step === 3
                ? 'Ver Pago <i class="ph ph-arrow-right"></i>'
                : 'Continuar <i class="ph ph-arrow-right"></i>';
        }
        renderOrderSummary();
    }

    function renderPassengerForms() {
        if (!passengerForms) return;
        const existing = collectPassengerData();
        passengerForms.innerHTML = Array.from({ length: booking.passengers }, (_, index) => {
            const passenger = existing[index] || {};
            const leadLabel = index === 0 ? 'Titular' : `Pasajero ${index + 1}`;
            return `
                <article class="passenger-card">
                    <h4><i class="ph ph-user-circle"></i> ${leadLabel}</h4>
                    <div class="form-group">
                        <label for="passengerName-${index}">Nombre completo</label>
                        <input type="text" id="passengerName-${index}" value="${escapeAttr(passenger.name)}" placeholder="Ej. Juan Perez" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="passengerPhone-${index}">WhatsApp / Celular</label>
                            <input type="tel" id="passengerPhone-${index}" value="${escapeAttr(passenger.phone)}" placeholder="Ej. 75223813" required>
                        </div>
                        <div class="form-group">
                            <label for="passengerDocument-${index}">C.I. / Pasaporte</label>
                            <input type="text" id="passengerDocument-${index}" value="${escapeAttr(passenger.document)}" placeholder="Ej. 9832483 LP" required>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderSeatMap() {
        if (!seatMap || !seatMapTitle) return;
        const vehicle = VEHICLES[booking.vehicle];
        const bookedSeats = new Set(getBookedSeats());
        seatMap.className = `seat-map ${vehicle.mapClass}`;
        seatMapTitle.textContent = `${vehicle.label} - ${vehicle.capacity === 44 ? '40+ asientos' : `${vehicle.capacity} asientos`}`;
        seatMap.innerHTML = '';

        for (let seat = 1; seat <= vehicle.capacity; seat++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'seat-button';
            button.textContent = seat;
            button.dataset.seat = String(seat);
            button.setAttribute('aria-label', `Asiento ${seat}`);

            if (bookedSeats.has(seat)) {
                button.classList.add('booked');
                button.disabled = true;
            } else if (booking.selectedSeats.includes(seat)) {
                button.classList.add('selected');
            }

            button.addEventListener('click', () => toggleSeat(seat));
            seatMap.appendChild(button);
        }
        renderSeatHint();
    }

    function renderSeatHint() {
        if (!seatSelectionHint) return;
        const needed = booking.passengers - booking.selectedSeats.length;
        if (needed > 0) {
            seatSelectionHint.textContent = `Selecciona ${needed} asiento${needed === 1 ? '' : 's'} mas para completar la reserva.`;
            seatSelectionHint.className = 'seat-selection-hint';
        } else {
            seatSelectionHint.textContent = `Asientos seleccionados: ${booking.selectedSeats.sort((a, b) => a - b).join(', ')}`;
            seatSelectionHint.className = 'seat-selection-hint success';
        }
    }

    function renderStats() {
        const vehicle = VEHICLES[booking.vehicle];
        const booked = getBookedSeats().length;
        const selected = booking.selectedSeats.length;
        const free = Math.max(0, vehicle.capacity - booked - selected);
        const capacityLabel = vehicle.capacity === 44 ? '40+ asientos' : `${vehicle.capacity} asientos`;
        const percentage = Math.min(100, ((booked + selected) / vehicle.capacity) * 100);

        if (capacidadTotalEl) capacidadTotalEl.textContent = capacityLabel;
        if (asientosOcupadosEl) asientosOcupadosEl.textContent = booked;
        if (asientosLibresEl) asientosLibresEl.textContent = free;
        if (progressBarFill) {
            progressBarFill.style.width = `${percentage}%`;
            progressBarFill.style.backgroundColor = percentage >= 90 ? '#ef4444' : 'var(--clr-secondary)';
        }
        if (cuposMaxAviso) {
            cuposMaxAviso.textContent = `${free} asientos quedaran disponibles despues de esta seleccion.`;
        }
        if (availabilityAlert) {
            availabilityAlert.innerHTML = `<i class="ph-fill ph-check-circle"></i> ${booked} asiento${booked === 1 ? '' : 's'} reservado${booked === 1 ? '' : 's'} en las ultimas 24 horas para ${vehicle.label}.`;
        }
        if (precioTotalEl) precioTotalEl.textContent = `${vehicle.price * booking.passengers} Bs.`;
    }

    function renderOrderSummary() {
        if (!orderSummary) return;
        const vehicle = VEHICLES[booking.vehicle];
        const passengers = collectPassengerData();
        const list = passengers.map((passenger, index) => {
            const seat = booking.selectedSeats[index] || '-';
            const name = passenger.name || `Pasajero ${index + 1}`;
            const documentId = passenger.document || 'Documento pendiente';
            return `<li><strong>Asiento ${seat}:</strong> ${escapeHtml(name)} <span>${escapeHtml(documentId)}</span></li>`;
        }).join('');

        orderSummary.innerHTML = `
            <div>
                <span>Fecha</span>
                <strong>${getDateKey()}</strong>
            </div>
            <div>
                <span>Transporte</span>
                <strong>${vehicle.label}</strong>
            </div>
            <div>
                <span>Pasajeros</span>
                <strong>${booking.passengers}</strong>
            </div>
            <div>
                <span>Asientos</span>
                <strong>${booking.selectedSeats.length ? booking.selectedSeats.join(', ') : 'Pendiente'}</strong>
            </div>
            <ul>${list}</ul>
        `;
    }

    function updateVehicle(vehicleKey) {
        booking.vehicle = vehicleKey;
        const vehicle = VEHICLES[vehicleKey];
        if (tipoTransporte) {
            tipoTransporte.value = vehicleKey;
            tipoTransporte.dataset.price = String(vehicle.price);
            tipoTransporte.dataset.capacity = String(vehicle.capacity);
        }
        document.querySelectorAll('.vehicle-choice').forEach(choice => {
            choice.classList.toggle('active', choice.dataset.vehicle === vehicleKey);
        });
        if (passengerLimitHint) passengerLimitHint.textContent = vehicle.hint;
        if (pasajerosInput) pasajerosInput.max = vehicle.capacity;
        setPassengerCount(Math.min(booking.passengers, vehicle.capacity), false);
        booking.selectedSeats = booking.selectedSeats.filter(seat => seat <= vehicle.capacity);
        renderAll();
    }

    function setPassengerCount(count, shouldRender = true) {
        const max = Math.min(getCapacity(), Math.max(1, getAvailableSeats() + booking.selectedSeats.length));
        booking.passengers = Math.max(1, Math.min(Number(count) || 1, max));
        if (pasajerosInput) pasajerosInput.value = booking.passengers;
        if (booking.selectedSeats.length > booking.passengers) {
            booking.selectedSeats = booking.selectedSeats.slice(0, booking.passengers);
        }
        if (shouldRender) renderAll();
    }

    function toggleSeat(seat) {
        if (booking.selectedSeats.includes(seat)) {
            booking.selectedSeats = booking.selectedSeats.filter(item => item !== seat);
        } else {
            if (booking.selectedSeats.length >= booking.passengers) return;
            booking.selectedSeats.push(seat);
        }
        booking.selectedSeats.sort((a, b) => a - b);
        renderSeatMap();
        renderStats();
        renderOrderSummary();
    }

    function validateStep(step) {
        if (step === 1) {
            if (!fechaInput.value) {
                fechaInput.focus();
                return false;
            }
            if (booking.passengers > getAvailableSeats()) {
                showNotice(`Solo quedan ${getAvailableSeats()} asientos disponibles para este vehiculo.`);
                return false;
            }
        }

        if (step === 2) {
            const inputs = passengerForms.querySelectorAll('input');
            for (const input of inputs) {
                if (!input.value.trim()) {
                    input.focus();
                    return false;
                }
            }
        }

        if (step === 3 && booking.selectedSeats.length !== booking.passengers) {
            showNotice(`Debes seleccionar ${booking.passengers} asiento${booking.passengers === 1 ? '' : 's'}.`);
            return false;
        }

        return true;
    }

    function showNotice(message) {
        if (!availabilityAlert) return;
        availabilityAlert.innerHTML = `<i class="ph-fill ph-warning-octagon"></i> ${message}`;
    }

    function renderAll() {
        renderPassengerForms();
        renderSeatMap();
        renderStats();
        renderSteps();
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    document.querySelectorAll('.vehicle-choice').forEach(choice => {
        choice.addEventListener('click', () => updateVehicle(choice.dataset.vehicle));
    });

    if (increasePassengers) {
        increasePassengers.addEventListener('click', () => setPassengerCount(booking.passengers + 1));
    }
    if (decreasePassengers) {
        decreasePassengers.addEventListener('click', () => setPassengerCount(booking.passengers - 1));
    }
    if (pasajerosInput) {
        pasajerosInput.addEventListener('input', () => setPassengerCount(pasajerosInput.value));
    }
    if (fechaInput) {
        fechaInput.addEventListener('change', () => {
            const selectedDate = new Date(`${fechaInput.value}T12:00:00`);
            const day = selectedDate.getDay();
            if (fechaAviso) {
                fechaAviso.classList.toggle('hidden', day === 0 || day === 5 || day === 6);
                fechaAviso.textContent = 'Salidas regulares son viernes, sabado y domingo. Otras fechas bajo consulta.';
            }
            booking.selectedSeats = [];
            setPassengerCount(booking.passengers, false);
            renderAll();
        });
    }

    document.querySelectorAll('.payment-option-card').forEach(card => {
        card.addEventListener('click', () => {
            booking.payment = card.dataset.method;
            document.querySelectorAll('.payment-option-card').forEach(item => item.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            Object.keys(payBoxes).forEach(key => {
                if (payBoxes[key]) payBoxes[key].classList.toggle('hidden', key !== booking.payment);
            });
        });
    });

    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', () => {
            if (!validateStep(booking.step)) return;
            booking.step = Math.min(4, booking.step + 1);
            renderSteps();
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', () => {
            booking.step = Math.max(1, booking.step - 1);
            renderSteps();
        });
    }
    if (clearBookingBtn) {
        clearBookingBtn.addEventListener('click', () => {
            booking.step = 1;
            booking.passengers = 1;
            booking.selectedSeats = [];
            updateVehicle('minibus');
        });
    }

    const loadingModal = document.getElementById('paymentLoadingModal');
    const loadingState = document.getElementById('modalLoadingState');
    const successState = document.getElementById('modalSuccessState');
    const btnDownloadPDF = document.getElementById('btnDownloadPDF');
    const btnCloseSuccessModal = document.getElementById('btnCloseSuccessModal');

    if (form && loadingModal && loadingState && successState && btnDownloadPDF && btnCloseSuccessModal) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

            const vehicle = VEHICLES[booking.vehicle];
            const passengers = collectPassengerData();
            const total = `${vehicle.price * booking.passengers} Bs.`;
            let paymentText = 'Efectivo / coordinar por WhatsApp';

            if (booking.payment === 'qr') {
                paymentText = 'Pago por QR (se adjuntara comprobante)';
            } else if (booking.payment === 'tarjeta') {
                const cardNumber = document.getElementById('cardNumber')?.value || '';
                paymentText = `Pago con tarjeta terminacion ${cardNumber.slice(-4) || 'pendiente'}`;
            }

            const record = {
                type: 'Transporte',
                date: getDateKey(),
                vehicle: booking.vehicle,
                seats: [...booking.selectedSeats],
                passengers,
                total,
                payment: booking.payment,
                paymentStatus: booking.payment === 'tarjeta' ? 'Confirmado' : 'Pendiente',
                status: booking.payment === 'tarjeta' ? 'Aceptada' : 'Pendiente',
                receiptImage: booking.payment === 'qr' ? receiptBase64 : ''
            };

            const savedRecord = saveReservation(record);

            // Open payment modal
            loadingModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            const triggerWhatsApp = () => {
                const passengerLines = passengers.map((passenger, index) => (
                    `${index + 1}. Asiento ${booking.selectedSeats[index]} - ${passenger.name} - Doc: ${passenger.document} - Tel: ${passenger.phone}`
                )).join('\n');

                const message = `TRANSPORTE TURISTICO CARANAVI
Hola, quiero confirmar una reserva de excursion:

Código de Reserva: ${savedRecord.code}
Fecha de viaje: ${getDateKey()}
Transporte: ${vehicle.label}
Pasajeros: ${booking.passengers}
Asientos reservados: ${booking.selectedSeats.join(', ')}
Total a pagar: ${total}
Metodo de pago: ${paymentText}
Estado de Pago: ${savedRecord.paymentStatus}

DATOS DE PASAJEROS
${passengerLines}

ITINERARIO
Partida: 06:30 AM - Sede UMSA Caranavi
Llegada: 09:30 AM - San Benito
Retorno: 17:00 PM - Retorno a Caranavi

Por favor, confirmen mi reservacion. Gracias.`;

                const whatsappUrl = `https://api.whatsapp.com/send?phone=${businessWhatsApp}&text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            };

            // Set up download PDF action
            btnDownloadPDF.onclick = () => {
                if (window.YaraDB && savedRecord) {
                    window.YaraDB.downloadPDF(savedRecord.id);
                }
            };

            // Set up WhatsApp optional button action
            const btnSendWA = document.getElementById('btnSendWA');
            if (btnSendWA) {
                btnSendWA.onclick = triggerWhatsApp;
            }

            // Set up close button action
            btnCloseSuccessModal.onclick = () => {
                loadingModal.classList.add('hidden');
                document.body.style.overflow = '';
                
                // Reset form steps
                booking.step = 1;
                booking.passengers = 1;
                booking.selectedSeats = [];
                receiptBase64 = '';
                if (receiptPreview) receiptPreview.style.display = 'none';
                if (receiptUploadLabel) receiptUploadLabel.textContent = 'Toca para adjuntar tu comprobante de pago';
                updateVehicle('minibus');
            };

            if (booking.payment === 'tarjeta') {
                loadingState.classList.remove('hidden');
                successState.classList.add('hidden');

                // Simulate credit card charge validation
                setTimeout(() => {
                    loadingState.classList.add('hidden');
                    successState.classList.remove('hidden');
                    // Auto-download PDF ticket on card payment confirmation
                    if (window.YaraDB && savedRecord) {
                        window.YaraDB.downloadPDF(savedRecord.id);
                    }
                }, 2000);
            } else {
                loadingState.classList.add('hidden');
                successState.classList.remove('hidden');
                // Adjust text for non-credit card payment method
                const descText = successState.querySelector('p');
                if (descText) {
                    descText.innerHTML = `Tu reserva se guardó como <strong>Pendiente de Pago</strong>. Se ha descargado tu ticket temporal. Envía el comprobante para confirmar tu pago.`;
                }
                // Auto-download PDF ticket
                if (window.YaraDB && savedRecord) {
                    window.YaraDB.downloadPDF(savedRecord.id);
                }
            }
        });
    }

    // Reservation Lookup Search logic
    const lookupBtn = document.getElementById('lookupBtn');
    const lookupInput = document.getElementById('lookupInput');
    const lookupResult = document.getElementById('lookupResult');

    if (lookupBtn && lookupInput && lookupResult) {
        lookupBtn.addEventListener('click', () => {
            const q = lookupInput.value.trim();
            if (!q) {
                lookupResult.classList.add('hidden');
                return;
            }
            if (!window.YaraDB) return;
            const r = window.YaraDB.getReservationByCodeOrCI(q);
            lookupResult.classList.remove('hidden');
            if (!r) {
                lookupResult.innerHTML = `
                    <div style="background-color:#fee2e2; border:1px solid #fca5a5; border-radius:8px; padding:1rem; color:#b91c1c; font-size:0.9rem; margin-top:1rem;">
                        <i class="ph ph-warning-circle"></i> No se encontró ninguna reserva con ese código o C.I.
                    </div>
                `;
                return;
            }
            
            const isApproved = r.status === 'Aceptada';
            const statusColor = r.status === 'Aceptada' ? '#065f46' : (r.status === 'Rechazada' ? '#991b1b' : '#92400e');
            const statusBg = r.status === 'Aceptada' ? '#d1fae5' : (r.status === 'Rechazada' ? '#fee2e2' : '#fef3c7');
            
            let detailsHtml = `
                <div style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:1.25rem; margin-top:1rem; text-align:left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                        <span style="font-size:1.2rem; font-weight:800; color:var(--clr-primary);">${r.code}</span>
                        <span style="background-color:${statusBg}; color:${statusColor}; font-weight:700; padding:0.25rem 0.6rem; border-radius:99px; font-size:0.8rem;">${r.status}</span>
                    </div>
                    <p style="font-size:0.9rem; margin-bottom:0.5rem; color:#4b5563;"><strong>Fecha de viaje:</strong> ${r.date}</p>
                    <p style="font-size:0.9rem; margin-bottom:0.5rem; color:#4b5563;"><strong>Detalle:</strong> ${r.type} ${r.vehicle ? `(${r.vehicle.toUpperCase()})` : (r.tourPlan ? `(${r.tourPlan})` : '')}</p>
                    <p style="font-size:0.9rem; margin-bottom:0.5rem; color:#4b5563;"><strong>Total:</strong> ${r.total}</p>
                    <p style="font-size:0.9rem; margin-bottom:1rem; color:#4b5563;"><strong>Pago:</strong> ${r.paymentStatus} (${r.payment.toUpperCase()})</p>
                    
                    <ul style="border-top:1px solid #e5e7eb; padding-top:0.75rem; margin-bottom:1.25rem; list-style:none;">
            `;
            
            r.passengers.forEach((p, idx) => {
                const seatText = r.seats && r.seats[idx] ? ` - Asiento ${r.seats[idx]}` : '';
                detailsHtml += `
                    <li style="font-size:0.88rem; margin-bottom:0.25rem; color:#374151;">• <strong>${escapeHtml(p.name)}</strong> - CI: ${escapeHtml(p.document)}${seatText}</li>
                `;
            });
            
            detailsHtml += `
                    </ul>
            `;
            
            if (isApproved) {
                detailsHtml += `
                    <button class="btn btn-primary w-100" onclick="window.YaraDB.downloadPDF(${r.id})">
                        <i class="ph ph-download-simple"></i> Descargar Ticket Confirmado
                    </button>
                `;
            } else {
                detailsHtml += `
                    <div style="background-color:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:0.85rem; color:#92400e; font-size:0.85rem;">
                        <i class="ph ph-info"></i> Su reserva está pendiente de confirmación de pago por el administrador.
                    </div>
                `;
            }
            
            detailsHtml += `</div>`;
            lookupResult.innerHTML = detailsHtml;
        });

        lookupInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                lookupBtn.click();
            }
        });
    }

    window.selectTransport = function(type) {
        if (VEHICLES[type]) updateVehicle(type);
        const target = document.getElementById('reserva');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    };

    renderAll();
});
