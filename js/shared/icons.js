export function renderIcons(root = document) {
root.querySelectorAll('[data-icon]').forEach(el => {
el.setAttribute('data-lucide', el.getAttribute('data-icon'));
});
if (window.lucide) window.lucide.createIcons();
}
