const form = document.querySelector('#produto');
const submit = form.querySelector('button');
const refresh = document.querySelector('#atualizar');
const registrationStatus = document.querySelector('#cadastro-status');
const listStatus = document.querySelector('#lista-status');
const table = document.querySelector('table');
const rows = table.tBodies[0];
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function showStatus(element, message, error = false) {
  element.textContent = message;
  element.dataset.error = String(error);
}

async function loadProducts() {
  refresh.disabled = true;
  showStatus(listStatus, 'Carregando produtos…');
  try {
    const response = await fetch('/produtos', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const products = await response.json();
    const productRows = products.map(product => {
      const row = document.createElement('tr');
      for (const value of [product.id, product.nome, currency.format(product.preco)]) {
        row.insertCell().textContent = value;
      }
      return row;
    });
    rows.replaceChildren(...productRows);
    table.hidden = products.length === 0;
    showStatus(listStatus, table.hidden ? 'Nenhum produto cadastrado.' : '');
  } catch {
    showStatus(listStatus, 'Não foi possível atualizar a lista.', true);
  } finally {
    refresh.disabled = false;
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const nome = form.elements.nome.value.trim();
  const preco = form.elements.preco.valueAsNumber;
  if (!nome) {
    showStatus(registrationStatus, 'Informe o nome do produto.', true);
    form.elements.nome.focus();
    return;
  }

  submit.disabled = true;
  showStatus(registrationStatus, 'Cadastrando…');
  try {
    const response = await fetch('/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, preco })
    });
    if (!response.ok) {
      showStatus(registrationStatus, 'Não foi possível cadastrar o produto. Confira os dados e tente novamente.', true);
      return;
    }
    const product = await response.json();
    form.reset();
    showStatus(registrationStatus, `Produto cadastrado com ID ${product.id}.`);
    await loadProducts();
  } catch {
    showStatus(registrationStatus, 'Não foi possível confirmar o cadastro. Atualize a lista antes de tentar novamente.', true);
  } finally {
    submit.disabled = false;
  }
});

refresh.addEventListener('click', loadProducts);
loadProducts();
