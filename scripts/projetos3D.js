/* ==========================================================================
   LÓGICA DA PÁGINA DE PROJETOS 3D (GALERIA E MODAL)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ---------------------------------------------------------
  // 1. BOTÕES DO WHATSAPP
  // ---------------------------------------------------------
  const numeroWhatsApp = "5551996034579";
  const mensagem = "Olá! Quero um projeto 3D para a minha loja.";
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;

  const btnOrcamento = document.querySelector('.link-wa-image');
  if (btnOrcamento) btnOrcamento.href = linkWhatsApp;

  const btnFlutuante = document.querySelector('.whatsapp-float');
  if (btnFlutuante) btnFlutuante.href = linkWhatsApp;

  // ---------------------------------------------------------
  // 2. LÓGICA DO MODAL DE PROJETOS (CARROSSEL)
  // ---------------------------------------------------------
  const modal = document.getElementById('projeto-modal');
  const modalImg = document.getElementById('modal-main-img');
  const modalCaption = document.getElementById('modal-caption');
  const btnClose = document.querySelector('.modal-close');
  const btnPrev = document.querySelector('.modal-prev');
  const btnNext = document.querySelector('.modal-next');
  
  // SEGREDO AQUI: Seleciona a nova estrutura que criamos no HTML
  const imagensGaleria = document.querySelectorAll('.gallery-image-wrapper');

  // Banco de Imagens. As chaves devem ser IGUAIS ao data-projeto do HTML
  const bancoDeImagens = {
    "LOJA DE MODA FEMININA": [
      "../images/projeto-1.jpg", 
      "../images/projeto-2.jpg",
      "../images/projeto-3.jpg",
      "../images/projeto-4.jpg",
      "../images/projeto-5.jpg"
    ],
    "LOJA DE MODA MASCULINA": [
      "../images/projeto-2.jpg"
    ],
    "BOUTIQUE INFANTIL": [
      "../images/projeto-3.jpg"
    ],
    "SHOWROOM COMERCIAL": [
      "../images/projeto-4.jpg"
    ]
  };

  let imagensAtuais = [];
  let indexAtual = 0;

  // Função para trocar a imagem na tela
  function mostrarImagem(index) {
    if (imagensAtuais.length > 0) {
      modalImg.src = imagensAtuais[index];
      
      // Esconde as setas se o projeto tiver apenas 1 imagem
      const displaySetas = imagensAtuais.length > 1 ? 'block' : 'none';
      if(btnPrev) btnPrev.style.display = displaySetas;
      if(btnNext) btnNext.style.display = displaySetas;
    }
  }

  // Abre o modal ao clicar na imagem
  imagensGaleria.forEach(wrapper => {
    wrapper.addEventListener('click', () => {
      // Pega o título direto do atributo data-projeto
      const titulo = wrapper.getAttribute('data-projeto');
      
      // Busca a lista de imagens baseada no título
      imagensAtuais = bancoDeImagens[titulo] || [];

      // Só abre o modal se encontrar as imagens
      if (imagensAtuais.length > 0) {
        indexAtual = 0; 
        mostrarImagem(indexAtual);
        if(modalCaption) modalCaption.innerText = titulo;
        if(modal) modal.classList.add('show');
      } else {
        console.warn(`Atenção: Nenhuma imagem encontrada no JS para o projeto "${titulo}"`);
      }
    });
  });

  // Clicar na seta para a Direita (Avançar)
  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation(); // Impede que o clique feche o modal acidentalmente
      indexAtual = (indexAtual + 1) % imagensAtuais.length;
      mostrarImagem(indexAtual);
    });
  }

  // Clicar na seta para a Esquerda (Voltar)
  if (btnPrev) {
    btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      indexAtual = (indexAtual - 1 + imagensAtuais.length) % imagensAtuais.length;
      mostrarImagem(indexAtual);
    });
  }

  // Fecha o modal ao clicar no 'X'
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if(modal) modal.classList.remove('show');
    });
  }

  // Fecha o modal ao clicar fora da foto (fundo escuro)
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  }
});