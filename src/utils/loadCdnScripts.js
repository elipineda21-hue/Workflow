function loadScript(src, onLoad, label) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.onload = onLoad;
  s.onerror = () => console.error(`Failed to load ${label} from CDN: ${src}`);
  document.head.appendChild(s);
}

export function loadPdfLibraries(callbacks = {}) {
  // jsPDF
  if (!window.jspdf) {
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      () => callbacks.onJspdf?.(),
      "jsPDF"
    );
  } else {
    callbacks.onJspdf?.();
  }

  // pdf-lib
  if (!window.PDFLib) {
    loadScript(
      "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js",
      () => callbacks.onPdfLib?.(),
      "pdf-lib"
    );
  } else {
    callbacks.onPdfLib?.();
  }

  // pdf.js
  if (!window.pdfjsLib) {
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js",
      () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        callbacks.onPdfJs?.();
      },
      "pdf.js"
    );
  } else {
    callbacks.onPdfJs?.();
  }
}
