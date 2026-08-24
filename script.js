function filter(type) {
  document.querySelectorAll('.item').forEach(x => {
    x.style.display = x.dataset.type === type ? 'block' : 'none';
  });
  window.scrollTo({
    top: document.getElementById('items').offsetTop - 20,
    behavior: 'smooth'
  });
}

function search() {
  const q = document.getElementById('q').value.toLowerCase();
  document.querySelectorAll('.item').forEach(x => {
    x.style.display = x.innerText.toLowerCase().includes(q) ? 'block' : 'none';
  });
}
