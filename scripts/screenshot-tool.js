(function () {
  if (window.__BUENO_SCREENSHOT_TOOL__) return;
  window.__BUENO_SCREENSHOT_TOOL__ = true;

  var HTML2CANVAS_SOURCES = [
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
  ];

  function loadScriptSequentially(sources, index, resolve, reject) {
    if (window.html2canvas) {
      resolve(window.html2canvas);
      return;
    }

    if (index >= sources.length) {
      reject(new Error('Não foi possível carregar a biblioteca de captura neste navegador.'));
      return;
    }

    var script = document.createElement('script');
    script.src = sources[index];
    script.async = true;

    script.onload = function () {
      if (window.html2canvas) {
        resolve(window.html2canvas);
      } else {
        loadScriptSequentially(sources, index + 1, resolve, reject);
      }
    };

    script.onerror = function () {
      loadScriptSequentially(sources, index + 1, resolve, reject);
    };

    document.head.appendChild(script);
  }

  function loadHtml2Canvas() {
    return new Promise(function (resolve, reject) {
      loadScriptSequentially(HTML2CANVAS_SOURCES, 0, resolve, reject);
    });
  }

  function timestamp() {
    var now = new Date();
    var pad = function (n) {
      return String(n).padStart(2, '0');
    };

    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      '-',
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds())
    ].join('');
  }

  function createStatusToast() {
    var toast = document.createElement('div');
    toast.id = 'eb-screenshot-toast';
    Object.assign(toast.style, {
      position: 'fixed',
      left: '16px',
      bottom: '72px',
      zIndex: '2147483647',
      background: '#111827',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      boxShadow: '0 8px 24px rgba(0,0,0,.25)',
      opacity: '0',
      transition: 'opacity .2s ease'
    });

    document.body.appendChild(toast);
    return toast;
  }

  function showStatus(toast, message, isError) {
    toast.textContent = message;
    toast.style.background = isError ? '#991b1b' : '#111827';
    toast.style.opacity = '1';

    window.clearTimeout(toast.__hideTimer);
    toast.__hideTimer = window.setTimeout(function () {
      toast.style.opacity = '0';
    }, isError ? 4500 : 2200);
  }

  function createButton() {
    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'eb-screenshot-btn';
    button.textContent = '📸 Capturar tela';
    button.setAttribute('aria-label', 'Capturar screenshot da página');

    Object.assign(button.style, {
      position: 'fixed',
      left: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      border: 'none',
      borderRadius: '999px',
      padding: '12px 16px',
      background: '#111827',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(0,0,0,.25)'
    });

    button.addEventListener('mouseenter', function () {
      button.style.background = '#1f2937';
    });

    button.addEventListener('mouseleave', function () {
      button.style.background = '#111827';
    });

    return button;
  }

  function triggerDownload(dataUrl) {
    var link = document.createElement('a');
    link.download = 'screenshot-expositores-' + timestamp() + '.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function saveCanvas(canvas) {
    var dataUrl;

    try {
      dataUrl = canvas.toDataURL('image/png', 1);
    } catch (error) {
      throw new Error('A captura foi bloqueada por imagens externas sem permissão (CORS).');
    }

    triggerDownload(dataUrl);
  }

  function setCapturing(button, isCapturing) {
    button.disabled = isCapturing;
    button.textContent = isCapturing ? '⏳ Gerando print...' : '📸 Capturar tela';
    button.style.opacity = isCapturing ? '0.7' : '1';
    button.style.cursor = isCapturing ? 'wait' : 'pointer';
  }

  function fallbackToPrint(toast, reason) {
    showStatus(toast, reason + ' Abrindo opção de impressão como alternativa.', true);
    window.setTimeout(function () {
      window.print();
    }, 250);
  }

  function capturePage(button, toast) {
    setCapturing(button, true);
    showStatus(toast, 'Preparando captura...', false);

    loadHtml2Canvas()
      .then(function (html2canvas) {
        return html2canvas(document.body, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: Math.max(document.documentElement.scrollWidth, window.innerWidth),
          windowHeight: Math.max(document.documentElement.scrollHeight, window.innerHeight),
          scale: window.devicePixelRatio > 1 ? 2 : 1
        });
      })
      .then(function (canvas) {
        saveCanvas(canvas);
        showStatus(toast, 'Print gerado com sucesso!', false);
      })
      .catch(function (error) {
        fallbackToPrint(toast, error.message || 'Falha ao gerar print.');
      })
      .then(function () {
        setCapturing(button, false);
      });
  }

  function init() {
    var button = createButton();
    var toast = createStatusToast();

    button.addEventListener('click', function () {
      capturePage(button, toast);
    });

    document.body.appendChild(button);

    window.addEventListener('keydown', function (event) {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        capturePage(button, toast);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
