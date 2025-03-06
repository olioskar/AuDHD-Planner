document.addEventListener('DOMContentLoaded', () => {
    // Item dragging setup
    const draggableItems = document.querySelectorAll('.draggable-item');
    const sortableLists = document.querySelectorAll('.sortable-list');

    // Section dragging setup - completely separate
    const draggableHeaders = document.querySelectorAll('.planner-section h2[draggable="true"]');
    const columns = document.querySelectorAll('.column');

    // Add drag event listeners to all draggable items
    draggableItems.forEach(item => {
        item.addEventListener('dragstart', handleItemDragStart);
        item.addEventListener('dragend', handleItemDragEnd);
        item.addEventListener('dragover', handleItemDragOver);
        item.addEventListener('drop', handleItemDrop);
    });

    // Add drag event listeners to all sortable lists
    sortableLists.forEach(list => {
        list.addEventListener('dragover', handleItemDragOver);
        list.addEventListener('drop', handleItemDrop);
    });

    // Add drag event listeners to all draggable section headers
    draggableHeaders.forEach(header => {
        header.addEventListener('dragstart', handleSectionDragStart);
        header.addEventListener('dragend', handleSectionDragEnd);
        header.addEventListener('dragover', handleSectionDragOver);
        header.addEventListener('drop', handleSectionDrop);
    });

    // Add drag event listeners to all columns
    columns.forEach(column => {
        column.addEventListener('dragover', handleColumnDragOver);
        column.addEventListener('drop', handleColumnDrop);
    });

    // Section drag handlers - completely separate from item handlers
    function handleSectionDragStart(e) {
        // If we're dragging an item, don't allow section dragging
        if (document.body.classList.contains('dragging')) {
            e.preventDefault();
            return;
        }
        const section = this.closest('.planner-section');
        section.classList.add('dragging-section');
        document.body.classList.add('dragging');
        document.body.classList.add('dragging-section');
        e.dataTransfer.setData('text/plain', section.dataset.section);
        e.dataTransfer.setData('type', 'section');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleSectionDragEnd(e) {
        const section = this.closest('.planner-section');
        section.classList.remove('dragging-section');
        document.body.classList.remove('dragging');
        document.body.classList.remove('dragging-section');
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        const placeholder = document.querySelector('.section-placeholder');
        if (placeholder) placeholder.remove();
    }

    function handleSectionDragOver(e) {
        // If we're dragging an item, don't show section drag feedback
        if (document.body.classList.contains('dragging') && !document.body.classList.contains('dragging-section')) {
            return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const section = this.closest('.planner-section');
        if (!section) return;

        // Remove drag-over class from all sections except the current one
        document.querySelectorAll('.planner-section').forEach(s => {
            if (s !== section) s.classList.remove('drag-over-section');
        });

        // Add drag-over class to current section if not dragging
        if (!section.classList.contains('dragging-section')) {
            section.classList.add('drag-over-section');
        }

        // Create or update placeholder
        let placeholder = document.querySelector('.section-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'section-placeholder';
        }

        const rect = section.getBoundingClientRect();
        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        
        if (position === 'before') {
            section.parentNode.insertBefore(placeholder, section);
        } else {
            section.parentNode.insertBefore(placeholder, section.nextSibling);
        }
    }

    function handleSectionDrop(e) {
        e.preventDefault();
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedSection = document.querySelector(`[data-section="${draggedId}"]`);
        
        const section = this.closest('.planner-section');
        if (!section) return;

        const rect = section.getBoundingClientRect();
        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        
        if (position === 'before') {
            section.parentNode.insertBefore(draggedSection, section);
        } else {
            section.parentNode.insertBefore(draggedSection, section.nextSibling);
        }
        
        // Clean up
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        const placeholder = document.querySelector('.section-placeholder');
        if (placeholder) placeholder.remove();
        
        saveOrder();
    }

    function handleColumnDragOver(e) {
        // If we're dragging an item, don't show section drag feedback
        if (document.body.classList.contains('dragging') && !document.body.classList.contains('dragging-section')) {
            return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const type = e.dataTransfer.getData('type');
        if (type !== 'section') return;

        // Remove drag-over class from all columns
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        
        // Add drag-over class to current column
        this.classList.add('drag-over-section');

        // Create or update placeholder
        let placeholder = document.querySelector('.section-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'section-placeholder';
        }

        // Find the closest section to the drop position
        const sections = Array.from(this.children);
        const dropY = e.clientY;
        
        let closestSection = null;
        let closestDistance = Infinity;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const distance = Math.abs(rect.top + rect.height / 2 - dropY);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestSection = section;
            }
        });
        
        if (closestSection) {
            const rect = closestSection.getBoundingClientRect();
            const position = dropY < rect.top + rect.height / 2 ? 'before' : 'after';
            
            if (position === 'before') {
                this.insertBefore(placeholder, closestSection);
            } else {
                this.insertBefore(placeholder, closestSection.nextSibling);
            }
        } else {
            // If no sections in the column or drop position is at the bottom
            this.appendChild(placeholder);
        }
    }

    function handleColumnDrop(e) {
        e.preventDefault();
        
        const type = e.dataTransfer.getData('type');
        if (type !== 'section') return;

        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedSection = document.querySelector(`[data-section="${draggedId}"]`);
        
        // Find the closest section to the drop position
        const sections = Array.from(this.children);
        const dropY = e.clientY;
        
        let closestSection = null;
        let closestDistance = Infinity;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const distance = Math.abs(rect.top + rect.height / 2 - dropY);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestSection = section;
            }
        });
        
        if (closestSection) {
            const rect = closestSection.getBoundingClientRect();
            const position = dropY < rect.top + rect.height / 2 ? 'before' : 'after';
            
            if (position === 'before') {
                this.insertBefore(draggedSection, closestSection);
            } else {
                this.insertBefore(draggedSection, closestSection.nextSibling);
            }
        } else {
            // If no sections in the column or drop position is at the bottom
            this.appendChild(draggedSection);
        }
        
        // Clean up
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        const placeholder = document.querySelector('.section-placeholder');
        if (placeholder) placeholder.remove();
        
        saveOrder();
    }

    // Item drag handlers - modified to check for section dragging
    function handleItemDragStart(e) {
        if (document.body.classList.contains('dragging-section')) {
            e.preventDefault();
            return;
        }
        this.classList.add('dragging');
        document.body.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleItemDragEnd(e) {
        this.classList.remove('dragging');
        document.body.classList.remove('dragging');
        // Remove drag-over class from all items
        draggableItems.forEach(item => item.classList.remove('drag-over'));
        // Remove placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (placeholder) placeholder.remove();
    }

    function handleItemDragOver(e) {
        if (document.body.classList.contains('dragging-section')) {
            return;
        }

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

    function handleItemDrop(e) {
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