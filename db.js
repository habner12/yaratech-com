/**
 * Base de Datos Local - Yara POS & Reservas
 * Simula la base de datos local usando LocalStorage para soporte offline (PWA)
 */

const STORAGE_KEY = 'transCaranaviReservationsV1';

window.YaraDB = {
    /**
     * Obtiene todas las reservas de la base de datos
     */
    getReservations() {
        let reservations = [];
        try {
            reservations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            console.error("Error cargando base de datos local:", e);
            reservations = [];
        }
        return reservations;
    },

    /**
     * Guarda una nueva reserva en la base de datos
     */
    saveReservation(record) {
        const reservations = this.getReservations();
        const newRecord = {
            id: record.id || Date.now(),
            code: record.code || this.generateCode(record.type),
            type: record.type || 'Transporte', // 'Transporte' o 'Necro Turismo'
            date: record.date,
            vehicle: record.vehicle || '', // 'ipsum', 'minibus', 'flota'
            tourPlan: record.tourPlan || '', // 'diurno', 'nocturno' (para Necro)
            seats: record.seats || [],
            passengers: record.passengers || [],
            total: record.total,
            payment: record.payment || 'qr', // 'qr', 'tarjeta', 'whatsapp'
            paymentStatus: record.paymentStatus || (record.payment === 'tarjeta' ? 'Confirmado' : 'Pendiente'),
            status: record.status || 'Pendiente', // 'Pendiente', 'Aceptada', 'Rechazada'
            receiptImage: record.receiptImage || '', // Imagen del comprobante de pago por QR
            createdAt: record.createdAt || Date.now(),
            expiresAt: record.expiresAt || (Date.now() + 24 * 60 * 60 * 1000) // Expiración en 24h
        };
        
        reservations.push(newRecord);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
        return newRecord;
    },

    /**
     * Actualiza propiedades de una reserva específica
     */
    updateReservation(id, updates) {
        let reservations = this.getReservations();
        reservations = reservations.map(item => {
            if (item.id === Number(id) || item.id === id) {
                return { ...item, ...updates };
            }
            return item;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    },

    /**
     * Elimina una reserva de la base de datos
     */
    deleteReservation(id) {
        let reservations = this.getReservations();
        reservations = reservations.filter(item => item.id !== Number(id) && item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    },

    /**
     * Busca una reserva específica por su código de ticket o por el número de C.I. de algún pasajero
     */
    getReservationByCodeOrCI(query) {
        if (!query) return null;
        const q = String(query).toUpperCase().trim();
        return this.getReservations().find(r => 
            r.code.toUpperCase() === q || 
            r.passengers.some(p => p.document.toUpperCase().includes(q))
        );
    },

    /**
     * Genera un código de reserva único e identificable
     */
    generateCode(type) {
        const prefix = type === 'Necro Turismo' ? 'NC' : 'TR';
        const num = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${num}`;
    },

    /**
     * Obtiene los asientos ocupados para un vehículo y fecha particular (excluyendo reservas rechazadas)
     */
    getBookedSeats(date, vehicle) {
        const now = Date.now();
        return this.getReservations()
            .filter(item => item.date === date && 
                            item.vehicle === vehicle && 
                            item.type === 'Transporte' &&
                            item.status !== 'Rechazada' &&
                            item.expiresAt > now)
            .flatMap(item => item.seats);
    },

    /**
     * Genera y descarga un comprobante PDF (Ticket) para la reserva seleccionada
     */
    downloadPDF(bookingId) {
        const reservations = this.getReservations();
        const booking = reservations.find(item => item.id === Number(bookingId) || item.id === bookingId);
        if (!booking) {
            alert("Reserva no encontrada.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a6'
        });

        const isNecro = booking.type === 'Necro Turismo';
        const primaryColor = isNecro ? [168, 85, 247] : [5, 150, 105]; // Morado para Necro, Verde para Transporte
        
        // Borde exterior
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(255, 255, 255);
        doc.rect(4, 4, 97, 140);
        
        // Banner Superior
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(4, 4, 97, 24, 'F');
        
        // Texto de Encabezado
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(isNecro ? 'TICKET DE TOUR' : 'TICKET DE VIAJE', 52.5, 13, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.text('TransCaranavi • YaraPOS 2026', 52.5, 19, { align: 'center' });
        
        // Código del Ticket
        doc.setTextColor(0, 0, 0);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(booking.code, 52.5, 37, { align: 'center' });
        
        // Línea divisoria
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.4);
        doc.line(10, 41, 95, 41);
        
        // Detalles de la Reserva
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('FECHA:', 10, 47);
        doc.text('TIPO:', 10, 53);
        doc.text('ITINERARIO:', 10, 59);
        doc.text('PAGO:', 10, 65);
        doc.text('ESTADO:', 10, 71);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(booking.date, 32, 47);
        
        let typeVal = '';
        if (isNecro) {
            typeVal = `Necro Turismo (${booking.tourPlan === 'diurno' ? 'Diurno' : 'Nocturno'})`;
        } else {
            typeVal = `Transporte (${booking.vehicle.toUpperCase()})`;
        }
        doc.text(typeVal, 32, 53);
        
        let itVal = isNecro 
            ? (booking.tourPlan === 'diurno' ? '09:30 AM • Cem. Caranavi' : '07:00 PM • Cem. Caranavi')
            : '06:30 AM • Sede UMSA Caranavi';
        doc.text(itVal, 32, 59);
        
        let payVal = `${booking.payment.toUpperCase()} (${booking.total})`;
        doc.text(payVal, 32, 65);

        let statusVal = booking.status.toUpperCase();
        if (booking.paymentStatus === 'Confirmado') {
            statusVal += ' (PAGADO)';
            doc.setTextColor(5, 150, 105);
        } else {
            doc.setTextColor(249, 115, 22);
        }
        doc.text(statusVal, 32, 71);

        // Sección de Asistentes/Pasajeros
        doc.setTextColor(0, 0, 0);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('PASAJEROS REGISTRADOS', 10, 81);
        
        doc.setLineWidth(0.2);
        doc.setDrawColor(200, 200, 200);
        doc.line(10, 83, 95, 83);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        let yPos = 88;
        booking.passengers.forEach((p, idx) => {
            if (yPos > 125) return; // Limitar listado al espacio físico de la tarjeta A6
            const seatText = !isNecro && booking.seats && booking.seats[idx] ? ` [Asiento ${booking.seats[idx]}]` : '';
            doc.setFont('Helvetica', 'bold');
            doc.text(`${idx + 1}. ${p.name.substring(0, 26)}`, 10, yPos);
            doc.setFont('Helvetica', 'normal');
            doc.text(`CI: ${p.document} ${seatText}`, 10, yPos + 3.8);
            yPos += 8.5;
        });

        // Código de barras falso en el pie
        doc.setDrawColor(180, 180, 180);
        doc.line(10, 129, 95, 129);
        
        doc.setFillColor(0, 0, 0);
        let barX = 22;
        for (let i = 0; i < 24; i++) {
            const width = i % 3 === 0 ? 0.7 : (i % 2 === 0 ? 0.35 : 1.1);
            doc.rect(barX, 131, width, 5, 'F');
            barX += width + 0.4;
        }
        
        doc.setFontSize(6);
        doc.text(`COMPROBANTE OFICIAL - GENERADO EN CALIENTE PWA`, 52.5, 140, { align: 'center' });

        doc.save(`Ticket-${booking.code}.pdf`);
    },

    /**
     * Inserta datos ficticios de prueba si no existen reservas registradas
     */
    initSeeds() {
        const reservations = this.getReservations();
        if (reservations.length === 0) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const seeds = [
                {
                    id: 1001,
                    code: 'TR-4820',
                    type: 'Transporte',
                    date: dateStr,
                    vehicle: 'minibus',
                    seats: [5, 6],
                    passengers: [
                        { name: 'Juan Pérez', phone: '75223813', document: '1234567 LP' },
                        { name: 'Sofía Pérez', phone: '75223813', document: '7654321 LP' }
                    ],
                    total: '220 Bs.',
                    payment: 'qr',
                    paymentStatus: 'Confirmado',
                    status: 'Aceptada',
                    createdAt: Date.now() - 3600000 * 2,
                    expiresAt: Date.now() + 24 * 60 * 60 * 1000
                },
                {
                    id: 1002,
                    code: 'NC-9102',
                    type: 'Necro Turismo',
                    date: dateStr,
                    tourPlan: 'nocturno',
                    seats: [],
                    passengers: [
                        { name: 'Grover Mamani', phone: '68219482', document: '5829103 LP', type: 'nacional' }
                    ],
                    total: '180 Bs.',
                    payment: 'tarjeta',
                    paymentStatus: 'Confirmado',
                    status: 'Aceptada',
                    createdAt: Date.now() - 3600000,
                    expiresAt: Date.now() + 24 * 60 * 60 * 1000
                },
                {
                    id: 1003,
                    code: 'TR-1192',
                    type: 'Transporte',
                    date: dateStr,
                    vehicle: 'ipsum',
                    seats: [1],
                    passengers: [
                        { name: 'Ana Choque', phone: '71938472', document: '4820192 LP' }
                    ],
                    total: '150 Bs.',
                    payment: 'whatsapp',
                    paymentStatus: 'Pendiente',
                    status: 'Pendiente',
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 24 * 60 * 60 * 1000
                }
            ];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
            console.log("Semillas de base de datos cargadas correctamente.");
        }
    }
};

// Inicializar base de datos con semillas de prueba si es necesario
window.YaraDB.initSeeds();
