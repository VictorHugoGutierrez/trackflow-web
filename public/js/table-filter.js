function applyFilters(tableId, searchId, statusId) {
    const table = document.getElementById(tableId);
    const searchInput = document.getElementById(searchId);
    const statusSelect = document.getElementById(statusId);
    
    if (!table) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusTerm = statusSelect ? statusSelect.value.toLowerCase() : '';
    
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const statusEl = row.querySelector('.status-cell');
        const status = statusEl ? statusEl.textContent.toLowerCase() : '';
        
        const matchesSearch = text.includes(searchTerm);
        const matchesStatus = !statusTerm || status.includes(statusTerm);
        
        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}