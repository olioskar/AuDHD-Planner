document.addEventListener('DOMContentLoaded', () => {
    // Define a clear data model for planner state management
    const PlannerData = {
        // Get current state from DOM
        getCurrentState() {
            const sections = {};
            document.querySelectorAll('.planner-section').forEach(section => {
                const sectionId = section.dataset.section;
                const items = [];
                
                section.querySelectorAll('.draggable-item').forEach(item => {
                    items.push({
                        id: item.dataset.id,
                        text: item.querySelector('span:nth-child(2)').textContent,
                        checked: item.querySelector('.checkbox').classList.contains('checked')
                    });
                });
                
                const title = section.querySelector('h2').textContent;
                const isTextSection = section.querySelector('textarea') !== null;
                let textContent = '';
                if (isTextSection) {
                    textContent = section.querySelector('textarea')?.value || '';
                }
                
                const columnElement = section.closest('.column');
                const columnIndex = Array.from(document.querySelectorAll('.column')).indexOf(columnElement);
                
                sections[sectionId] = {
                    title,
                    items,
                    isTextSection,
                    textContent,
                    columnIndex
                };
            });
            
            // Get column layout information
            const columnsOrder = Array.from(document.querySelectorAll('.column')).map(col => 
                Array.from(col.querySelectorAll('.planner-section')).map(s => s.dataset.section)
            );
            
            return {
                sections,
                columnsOrder,
                orientation: document.body.classList.contains('landscape') ? 'landscape' : 'portrait'
            };
        },
        
        // Save current state to localStorage
        save() {
            // Ensure all non-text sections have remove buttons before saving
            document.querySelectorAll('.planner-section').forEach(section => {
                if (!section.querySelector('textarea')) {  // If not a text section
                    const actions = section.querySelector('.section-actions');
                    if (actions && !actions.querySelector('.remove-section-button')) {
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'remove-section-button';
                        removeBtn.title = 'Remove section';
                        removeBtn.textContent = '−';
                        removeBtn.addEventListener('click', () => removeSection(section));
                        actions.appendChild(removeBtn);
                    }
                }
            });
            
            const currentState = this.getCurrentState();
            localStorage.setItem('plannerData', JSON.stringify(currentState));
            console.log('Saved planner data:', currentState);
        },
        
        // Load state from localStorage or return null if none exists
        load() {
            const saved = localStorage.getItem('plannerData');
            return saved ? JSON.parse(saved) : null;
        },
        
        // Apply saved state to DOM
        applyState(state) {
            if (!state) return false;
            
            console.log('Applying state:', state);
            
            // Apply orientation
            if (state.orientation === 'landscape') {
                document.body.classList.remove('portrait-mode');
                document.querySelector('.orientation-toggle').textContent = 'Landscape';
            } else {
                document.body.classList.add('portrait-mode');
                document.querySelector('.orientation-toggle').textContent = 'Portrait';
            }
            
            // Clear existing sections
            document.querySelectorAll('.column').forEach(column => {
                // Remove only planner sections, not other elements
                Array.from(column.children)
                    .filter(child => child.classList.contains('planner-section'))
                    .forEach(section => section.remove());
            });
            
            // Recreate sections in proper column order
            state.columnsOrder.forEach((sectionIds, columnIndex) => {
                const column = document.querySelectorAll('.column')[columnIndex];
                if (!column) return;
                
                sectionIds.forEach(sectionId => {
                    if (!state.sections[sectionId]) return;
                    
                    const sectionData = state.sections[sectionId];
                    const section = this.createSection(sectionId, sectionData);
                    
                    // Add event listeners for the new section
                    this.setupSectionEventListeners(section);
                    
                    column.appendChild(section);
                });
            });
            
            return true;
        },
        
        // Create a new section element with all its items
        createSection(sectionId, sectionData) {
            const section = document.createElement('section');
            section.className = 'planner-section';
            section.dataset.section = sectionId;
            
            if (sectionData.isTextSection) {
                // Create text-type section (like "Happy Moment")
                section.innerHTML = `
                    <h2 draggable="true">${sectionData.title}</h2>
                    <textarea class="writing-space" placeholder="Write here...">${sectionData.textContent || ''}</textarea>
                `;
            } else {
                // Create list-type section (standard task list)
                section.innerHTML = `
                    <div class="section-header">
                        <h2 draggable="true">${sectionData.title}</h2>
                        <div class="section-actions">
                            <button class="add-item-button" title="Add new item">+</button>
                            <button class="remove-section-button" title="Remove section">−</button>
                        </div>
                    </div>
                    <ul class="sortable-list"></ul>
                `;
                
                // Add all items to the list
                const list = section.querySelector('.sortable-list');
                if (sectionData.items && sectionData.items.length > 0) {
                    sectionData.items.forEach(item => {
                        const li = this.createItem(item);
                        list.appendChild(li);
                    });
                }
            }
            
            return section;
        },
        
        // Create a new item element
        createItem(itemData) {
            const li = document.createElement('li');
            li.className = 'draggable-item';
            li.draggable = true;
            li.dataset.id = itemData.id;
            
            const checkbox = document.createElement('span');
            checkbox.className = 'checkbox';
            if (itemData.checked) {
                checkbox.classList.add('checked');
            }
            
            const textSpan = document.createElement('span');
            textSpan.textContent = itemData.text;
            
            li.appendChild(checkbox);
            li.appendChild(textSpan);
            
            return li;
        },
        
        // Set up all event listeners for a section
        setupSectionEventListeners(section) {
            // Set up event listeners for section header
            const header = section.querySelector('h2');
            if (header) {
                header.addEventListener('dragstart', handleSectionDragStart);
                header.addEventListener('dragend', handleSectionDragEnd);
                header.addEventListener('dragover', handleSectionDragOver);
                header.addEventListener('drop', handleSectionDrop);
                
                header.addEventListener('dblclick', (e) => {
                    header.setAttribute('draggable', 'false');
                    makeEditable(header);
                });
                
                header.addEventListener('blur', () => {
                    setTimeout(() => {
                        header.setAttribute('draggable', 'true');
                        PlannerData.save();
                    }, 0);
                });
            }
            
            // Set up event listeners for items
            const items = section.querySelectorAll('.draggable-item');
            items.forEach(item => {
                item.addEventListener('dragstart', handleItemDragStart);
                item.addEventListener('dragend', handleItemDragEnd);
                item.addEventListener('dragover', handleItemDragOver);
                item.addEventListener('drop', handleItemDrop);
                
                const textSpan = item.querySelector('span:nth-child(2)');
                if (textSpan) {
                    item.addEventListener('dblclick', (e) => {
                        if (e.target === textSpan) {
                            item.setAttribute('draggable', 'false');
                            makeEditable(textSpan);
                        }
                    });
                    
                    textSpan.addEventListener('blur', () => {
                        setTimeout(() => {
                            item.setAttribute('draggable', 'true');
                            PlannerData.save();
                        }, 0);
                    });
                }
                
                const checkbox = item.querySelector('.checkbox');
                if (checkbox) {
                    checkbox.addEventListener('click', () => {
                        checkbox.classList.toggle('checked');
                        PlannerData.save();
                    });
                }
            });
            
            // Set up event listeners for add item button
            const addItemButton = section.querySelector('.add-item-button');
            if (addItemButton) {
                addItemButton.addEventListener('click', () => {
                    const list = section.querySelector('.sortable-list');
                    const newId = `item-${Date.now()}`;
                    
                    const itemData = {
                        id: newId,
                        text: '',
                        checked: false
                    };
                    
                    const li = PlannerData.createItem(itemData);
                    PlannerData.setupItemEventListeners(li);
                    list.appendChild(li);
                    
                    // Make the text editable immediately
                    const textSpan = li.querySelector('span:nth-child(2)');
                    makeEditable(textSpan);
                    
                    PlannerData.save();
                });
            }
            
            // Set up event listeners for remove section button
            const removeButton = section.querySelector('.remove-section-button');
            if (removeButton) {
                removeButton.addEventListener('click', () => {
                    removeSection(section);
                });
            }
            
            // Set up event listeners for writing space
            const writingSpace = section.querySelector('.writing-space');
            if (writingSpace) {
                writingSpace.addEventListener('input', () => {
                    PlannerData.save();
                });
            }
            
            // Set up event listeners for sortable list
            const list = section.querySelector('.sortable-list');
            if (list) {
                list.addEventListener('dragover', handleItemDragOver);
                list.addEventListener('drop', handleItemDrop);
            }
        },
        
        // Set up all event listeners for an item
        setupItemEventListeners(item) {
            item.addEventListener('dragstart', handleItemDragStart);
            item.addEventListener('dragend', handleItemDragEnd);
            item.addEventListener('dragover', handleItemDragOver);
            item.addEventListener('drop', handleItemDrop);
            
            const textSpan = item.querySelector('span:nth-child(2)');
            if (textSpan) {
                item.addEventListener('dblclick', (e) => {
                    if (e.target === textSpan) {
                        item.setAttribute('draggable', 'false');
                        makeEditable(textSpan);
                    }
                });
                
                textSpan.addEventListener('blur', () => {
                    setTimeout(() => {
                        item.setAttribute('draggable', 'true');
                        PlannerData.save();
                    }, 0);
                });
            }
            
            const checkbox = item.querySelector('.checkbox');
            if (checkbox) {
                checkbox.addEventListener('click', () => {
                    checkbox.classList.toggle('checked');
                    PlannerData.save();
                });
            }
        },
        
        // Reset to default state
        reset() {
            localStorage.removeItem('plannerData');
            window.location.reload();
        }
    };

    // Function to remove a section
    function removeSection(section) {
        if (confirm('Are you sure you want to remove this section and all its items?')) {
            // Remove the section from the DOM
            section.remove();
            
            // Save changes to localStorage
            PlannerData.save();
        }
    }

    // Item dragging setup
    const draggableItems = document.querySelectorAll('.draggable-item');
    const sortableLists = document.querySelectorAll('.sortable-list');

    // Section dragging setup - completely separate
    const draggableHeaders = document.querySelectorAll('.planner-section h2[draggable="true"]');
    const columns = document.querySelectorAll('.column');

    // Ensure all non-text sections have remove buttons initially
    document.querySelectorAll('.planner-section').forEach(section => {
        if (!section.querySelector('textarea')) {  // If not a text section
            const actions = section.querySelector('.section-actions');
            if (actions && !actions.querySelector('.remove-section-button')) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-section-button';
                removeBtn.title = 'Remove section';
                removeBtn.textContent = '−';
                removeBtn.addEventListener('click', () => removeSection(section));
                actions.appendChild(removeBtn);
            }
        }
    });

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
        
        // Create a ghost image of the entire section
        const ghost = section.cloneNode(true);
        ghost.style.width = `${section.offsetWidth}px`;
        ghost.style.height = `${section.offsetHeight}px`;
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        ghost.style.left = '-1000px';
        document.body.appendChild(ghost);
        
        // Calculate the offset based on where the user clicked
        const rect = section.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
        // Set the drag image with the correct offset
        e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
        
        // Remove the ghost after a short delay
        setTimeout(() => ghost.remove(), 0);
    }

    function handleSectionDragEnd(e) {
        const section = this.closest('.planner-section');
        section.classList.remove('dragging-section');
        document.body.classList.remove('dragging');
        document.body.classList.remove('dragging-section');
        
        // Remove drag-over class from all sections
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        
        // Remove placeholder
        const placeholder = document.querySelector('.section-placeholder');
        if (placeholder) placeholder.remove();
        
        // Save changes after drag ends
        PlannerData.save();
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

        // Remove all drag-over classes first
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));

        // Create or update placeholder
        let placeholder = document.querySelector('.section-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'section-placeholder';
        }

        const rect = section.getBoundingClientRect();
        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        
        // Only show placeholder, don't add drag-over class to sections
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
        
        PlannerData.save();
    }

    function handleColumnDragOver(e) {
        // If we're dragging an item, don't show section drag feedback
        if (document.body.classList.contains('dragging') && !document.body.classList.contains('dragging-section')) {
            return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Reading dataTransfer during dragover doesn't work reliably in all browsers
        // We'll check if body has dragging-section class instead
        if (!document.body.classList.contains('dragging-section')) return;

        // Remove drag-over class from all columns and sections
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        
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
            if (!section.classList.contains('planner-section')) return;
            
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
        if (!draggedSection) return;
        
        // Find the closest section to the drop position
        const sections = Array.from(this.children);
        const dropY = e.clientY;
        
        let closestSection = null;
        let closestDistance = Infinity;
        
        sections.forEach(section => {
            if (!section.classList.contains('planner-section')) return;
            
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
        
        PlannerData.save();
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
        document.querySelectorAll('.draggable-item').forEach(item => item.classList.remove('drag-over'));
        // Remove placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (placeholder) placeholder.remove();
        
        PlannerData.save();
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
            document.querySelectorAll('.draggable-item').forEach(item => {
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
                if (!item.classList.contains('draggable-item')) return;
                
                const rect = item.getBoundingClientRect();
                const distance = Math.abs(rect.top + rect.height / 2 - dropY);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestItem = item;
                }
            });
            
            // Remove drag-over class from all items
            document.querySelectorAll('.draggable-item').forEach(item => item.classList.remove('drag-over'));
            
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
        if (!draggedItem) return;
        
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
                if (!item.classList.contains('draggable-item')) return;
                
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
        
        // Remove drag-over class from all items in the document
        document.querySelectorAll('.draggable-item').forEach(item => {
            item.classList.remove('drag-over');
        });
        
        // Remove placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (placeholder) placeholder.remove();
        
        PlannerData.save();
    }

    // Load saved order and content when the page loads
    function loadState() {
        const savedState = PlannerData.load();
        if (savedState) {
            PlannerData.applyState(savedState);
        } else {
            // If no saved state exists, use the initial HTML state
            // Set up event listeners for all sections in the initial HTML
            document.querySelectorAll('.planner-section').forEach(section => {
                PlannerData.setupSectionEventListeners(section);
            });
            
            // Save the initial state
            PlannerData.save();
        }
    }

    // Add double-click handlers for editing
    function makeEditable(element) {
        element.setAttribute('contenteditable', 'true');
        element.focus();
        
        // Save the current text to restore if editing is cancelled
        const originalText = element.textContent;
        
        function handleBlur() {
            element.removeAttribute('contenteditable');
            if (element.textContent.trim() === '') {
                element.textContent = '';
            }
            // Save order after content is updated
            PlannerData.save();
            element.removeEventListener('blur', handleBlur);
            element.removeEventListener('keydown', handleKeyDown);
        }
        
        function handleKeyDown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                element.blur();
            } else if (e.key === 'Escape') {
                element.textContent = originalText;
                element.blur();
            }
        }
        
        element.addEventListener('blur', handleBlur);
        element.addEventListener('keydown', handleKeyDown);
    }

    // Add double-click listeners to section headers
    document.querySelectorAll('.planner-section h2').forEach(header => {
        header.addEventListener('dblclick', (e) => {
            // Prevent starting drag operation
            header.setAttribute('draggable', 'false');
            makeEditable(header);
        });
        
        // Restore draggable when editing ends
        header.addEventListener('blur', () => {
            setTimeout(() => {
                header.setAttribute('draggable', 'true');
            }, 0);
        });
    });

    // Add double-click listeners to list items
    document.querySelectorAll('.draggable-item').forEach(item => {
        const textSpan = item.querySelector('span:not(.checkbox)');
        if (textSpan) {
            item.addEventListener('dblclick', (e) => {
                // Only make editable if clicking the text span
                if (e.target === textSpan) {
                    // Prevent starting drag operation
                    item.setAttribute('draggable', 'false');
                    makeEditable(textSpan);
                }
            });
            
            // Restore draggable when editing ends
            textSpan.addEventListener('blur', () => {
                setTimeout(() => {
                    item.setAttribute('draggable', 'true');
                }, 0);
            });
        }
    });

    // Add new section functionality
    document.querySelector('.add-section-button').addEventListener('click', (e) => {
        e.preventDefault();
        
        const columns = document.querySelectorAll('.column');
        const lastColumn = columns[columns.length - 1];
        const newId = `section-${Date.now()}`;
        
        // Create new section
        const sectionData = {
            title: 'New Section',
            items: [],
            isTextSection: false,
            textContent: '',
            columnIndex: columns.length - 1
        };
        
        const section = PlannerData.createSection(newId, sectionData);
        PlannerData.setupSectionEventListeners(section);
        
        // Add to the last column
        lastColumn.appendChild(section);
        
        // Save order and make title editable
        PlannerData.save();
        makeEditable(section.querySelector('h2'));
    });

    // Reset functionality
    document.querySelector('.action-button.reset-button').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset everything? This will remove all changes you have made.')) {
            // Clear localStorage and reload
            PlannerData.reset();
        }
    });

    // Orientation toggle functionality
    const orientationToggle = document.querySelector('.orientation-toggle');
    orientationToggle.addEventListener('click', () => {
        document.body.classList.toggle('portrait-mode');
        const isLandscape = !document.body.classList.contains('portrait-mode');
        orientationToggle.textContent = isLandscape ? 'Landscape' : 'Portrait';
        
        // Save the updated state
        PlannerData.save();
    });

    // Add event listeners to checkboxes
    document.querySelectorAll('.checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', () => {
            checkbox.classList.toggle('checked');
            PlannerData.save();
        });
    });

    // Add event listeners to writing spaces
    document.querySelectorAll('.writing-space').forEach(textarea => {
        textarea.addEventListener('input', () => {
            PlannerData.save();
        });
    });

    // Initialize the application
    loadState();
}); 