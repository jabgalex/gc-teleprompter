# Pruebas

La suite browser se ejecuta con Playwright y usa el canal `chrome` para aprovechar Google Chrome instalado:

```bash
npm run test:browser
```

Requisito local/CI: Google Chrome debe estar instalado. En macOS 12, Playwright no puede instalar su Chromium administrado; por eso se usa Chrome estable del sistema.

La suite valida reproducción, pausa, desplazamiento manual, reanudación, marcadores, slider, responsive a 380 px y detención de guiones cortos.
