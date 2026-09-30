// Fills the About window with build details passed by the main process in the query string

const params = new URLSearchParams(window.location.search);

for (const element of document.querySelectorAll('[data-field]')) {
  const value = params.get(element.dataset.field);
  if (value) element.textContent = value;
}

document.getElementById('close').addEventListener('click', () => window.close());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.close();
});
