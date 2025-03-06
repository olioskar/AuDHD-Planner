document.addEventListener('DOMContentLoaded', () => {
    const draggableItems = document.querySelectorAll('.draggable-item');
    const sortableLists = document.querySelectorAll('.sortable-list');

    // Add drag event listeners to all draggable items
    draggableItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
    });

    // Add drag event listeners to all sortable lists
    sortableLists.forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
    });

    function handleDragStart(e) {
        this.classList.add('dragging');
        document.body.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        document.body.classList.remove('dragging');
        // Remove drag-over class from all items
        draggableItems.forEach(item => item.classList.remove('drag-over'));
        // Remove placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (placeholder) placeholder.remove();
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Create placeholder if it doesn't exist
        let placeholder = document.querySelector('.drag-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'drag-placeholder';
        }
        
        // If dragging over a list item
        if (this.classList.contains('draggable-item')) {
            const rect = this.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const position = e.clientY < midY ? 'before' : 'after';
            
            // Remove drag-over class from all items except the dragged item
            draggableItems.forEach(item => {
                if (item.classList.contains('dragging')) return;
                item.classList.remove('drag-over');
            });
            
            // Add drag-over class to current item
            if (!this.classList.contains('dragging')) {
                this.classList.add('drag-over');
            }

            // Move placeholder
            if (position === 'before') {
                this.parentNode.insertBefore(placeholder, this);
            } else {
                this.parentNode.insertBefore(placeholder, this.nextSibling);
            }
        }
        // If dragging over a list
        else if (this.classList.contains('sortable-list')) {
            // Find the closest item to the drop position
            const items = Array.from(this.children);
            const dropY = e.clientY;
            
            let closestItem = null;
            let closestDistance = Infinity;
            
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const distance = Math.abs(rect.top + rect.height / 2 - dropY);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestItem = item;
                }
            });
            
            // Remove drag-over class from all items
            draggableItems.forEach(item => item.classList.remove('drag-over'));
            
            // Move placeholder
            if (closestItem) {
                const rect = closestItem.getBoundingClientRect();
                const position = dropY < rect.top + rect.height / 2 ? 'before' : 'after';
                
                if (position === 'before') {
                    this.insertBefore(placeholder, closestItem);
                } else {
                    this.insertBefore(placeholder, closestItem.nextSibling);
                }
            } else {
                // If no items in the list or drop position is at the bottom
                this.appendChild(placeholder);
            }
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedItem = document.querySelector(`[data-id="${draggedId}"]`);
        
        // If dropping on a list item
        if (this.classList.contains('draggable-item')) {
            const rect = this.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const position = e.clientY < midY ? 'before' : 'after';
            
            if (position === 'before') {
                this.parentNode.insertBefore(draggedItem, this);
            } else {
                this.parentNode.insertBefore(draggedItem, this.nextSibling);
            }
        }
        // If dropping on a list
        else if (this.classList.contains('sortable-list')) {
            // Find the closest item to the drop position
            const items = Array.from(this.children);
            const dropY = e.clientY;
            
            let closestItem = null;
            let closestDistance = Infinity;
            
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const distance = Math.abs(rect.top + rect.height / 2 - dropY);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestItem = item;
                }
            });
            
            if (closestItem) {
                const rect = closestItem.getBoundingClientRect();
                const position = dropY < rect.top + rect.height / 2 ? 'before' : 'after';
                
                if (position === 'before') {
                    this.insertBefore(draggedItem, closestItem);
                } else {
                    this.insertBefore(draggedItem, closestItem.nextSibling);
                }
            } else {
                // If no items in the list or drop position is at the bottom
                this.appendChild(draggedItem);
            }
        }
        
        // Remove drag-over class from all items
        draggableItems.forEach(item => item.classList.remove('drag-over'));
        
        // Remove placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (placeholder) placeholder.remove();
        
        // Save the new order to localStorage
        saveOrder();
    }

    // Save the current order to localStorage
    function saveOrder() {
        const order = {};
        sortableLists.forEach(list => {
            const section = list.closest('.planner-section').dataset.section;
            order[section] = Array.from(list.children).map(item => item.dataset.id);
        });
        localStorage.setItem('plannerOrder', JSON.stringify(order));
    }

    // Load the saved order from localStorage
    function loadOrder() {
        const savedOrder = localStorage.getItem('plannerOrder');
        if (savedOrder) {
            const order = JSON.parse(savedOrder);
            Object.entries(order).forEach(([section, itemIds]) => {
                const sectionElement = document.querySelector(`[data-section="${section}"]`);
                if (sectionElement) {
                    const list = sectionElement.querySelector('.sortable-list');
                    if (list) {
                        itemIds.forEach(id => {
                            const item = document.querySelector(`[data-id="${id}"]`);
                            if (item) {
                                list.appendChild(item);
                            }
                        });
                    }
                }
            });
        }
    }

    // Load saved order when the page loads
    loadOrder();
}); 