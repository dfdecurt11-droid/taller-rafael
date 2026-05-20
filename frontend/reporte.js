// reporte.js - Módulo de utilidades y reportes

/**
 * Convierte una cadena de hora (ej: "08:30 AM" o "17:45") a minutos totales desde la medianoche
 */
export function convertirAMinutos(horaStr) {
    if (!horaStr || horaStr === "--:--" || horaStr.trim() === "") return 0;
    
    // Validar si viene en formato AM/PM
    const regexAMPM = /([0-9]{1,2}):([0-9]{2})\s*(AM|PM)/i;
    const match = horaStr.match(regexAMPM);

    let hrs, mins;

    if (match) {
        hrs = parseInt(match[1], 10);
        mins = parseInt(match[2], 10);
        const periodo = match[3].toUpperCase();

        if (periodo === "PM" && hrs !== 12) hrs += 12;
        if (periodo === "AM" && hrs === 12) hrs = 0;
    } else {
        // Formato de 24 horas estándar (HH:mm)
        const partes = horaStr.split(":");
        hrs = parseInt(partes[0], 10) || 0;
        mins = parseInt(partes[1], 10) || 0;
    }

    return (hrs * 60) + mins;
}

/**
 * Calcula la diferencia en horas decimales entre una entrada y una salida
 */
export function calcularDiferenciaHoras(entradaStr, salidaStr) {
    const minutosEntrada = convertirAMinutos(entradaStr);
    const minutesSalida = convertirAMinutos(salidaStr);

    if (minutosEntrada === 0 || minutesSalida === 0) return 0;

    let diferenciaMinutos = minutesSalida - minutosEntrada;

    // Si la salida es menor que la entrada, se asume cruce de medianoche
    if (diferenciaMinutos < 0) {
        diferenciaMinutos += 1440; // Sumar 24 horas en minutos
    }

    // Retorna las horas en formato decimal (ej: 8.5 para 8h 30m)
    return parseFloat((diferenciaMinutos / 60).toFixed(2));
}

/**
 * Genera el reporte PDF encapsulando la configuración de html2pdf
 */
export function descargarReportePDF(idElemento, nombreArchivo = "Reporte_Semanal.pdf") {
    const elemento = document.getElementById(idElemento);
    if (!elemento) {
        console.error(`Error: El elemento con ID '${idElemento}' no existe en el DOM.`);
        return;
    }

    const opciones = {
        margin: 0.5,
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Ejecuta la librería html2pdf instalada globalmente
    html2pdf().set(opciones).from(elemento).save();
}