document.addEventListener('DOMContentLoaded', () => {
    // Define a clear data model for planner state management
    const PlannerData = {
        // Get current state from DOM
        getCurrentState() {
            const sections = {};
            document.querySelectorAll('.planner-section').forEach(section => {
                // Skip sections that are hidden - this prevents saving a section that's in the middle of being dragged
                if (section.style.display === 'none') {
                    console.warn('Skipping section with display:none -', section.dataset.section);
                    return;
                }
                
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
                let placeholder = '';
                if (isTextSection) {
                    const textarea = section.querySelector('textarea');
                    textContent = textarea?.value || '';
                    placeholder = textarea?.getAttribute('placeholder') || 'Write about any moment today that made you feel nice...';
                }
                
                const columnElement = section.closest('.column');
                const columnIndex = Array.from(document.querySelectorAll('.column')).indexOf(columnElement);
                
                sections[sectionId] = {
                    title,
                    items,
                    isTextSection,
                    textContent,
                    placeholder,
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
                orientation: document.body.classList.contains('portrait-mode') ? 'portrait' : 'landscape'
            };
        },
        
        // Save current state to localStorage
        save() {
            // Ensure all sections are visible before saving
            document.querySelectorAll('.planner-section').forEach(section => {
                // Fix any hidden sections before saving
                if (section.style.display === 'none') {
                    console.warn('Fixing hidden section before saving:', section.dataset.section);
                    section.style.removeProperty('display');
                    section.style.opacity = '1';
                }
                
                // Ensure all non-text sections have remove buttons before saving
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
            
            // Clear any page break classes before saving
            document.querySelectorAll('.planner-section.page-break-before').forEach(section => {
                section.classList.remove('page-break-before');
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
                document.querySelector('.planner-container').classList.remove('portrait');
                document.querySelector('.orientation-toggle').textContent = 'Landscape';
            } else {
                document.body.classList.add('portrait-mode');
                document.querySelector('.planner-container').classList.add('portrait');
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
                const placeholder = sectionData.placeholder || 'Write about any moment today that made you feel nice...';
                section.innerHTML = `
                    <h2 draggable="true">${sectionData.title}</h2>
                    <textarea class="writing-space" placeholder="${placeholder}">${sectionData.textContent || ''}</textarea>
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

    // Set up drag events for section containers
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => {
        column.addEventListener('dragover', handleColumnDragOver);
        column.addEventListener('drop', handleColumnDrop);
    });

    // Section drag handlers - completely separate from item handlers
    function handleSectionDragStart(e) {
        // Don't interfere with item dragging
        if (e.target.closest('.planner-item')) {
            return;
        }
        
        // Get the section element
        const section = e.target.closest('.planner-section');
        if (!section) return;
        
        // Disable page break calculations during drag initiation
        document.body.classList.add('disable-page-breaks');
        
        // Store starting scroll position to prevent unwanted scrolling
        const startScrollY = window.scrollY;
        
        // Set section's original state for later restoration
        section._originalDisplay = section.style.display || '';
        section._hadPageBreak = section.classList.contains('page-break-before');
        
        // Remove page-break-before class immediately to prevent any printing conflicts
        section.classList.remove('page-break-before');
        
        // Set dragging state
        document.body.classList.add('dragging-section');
        section.classList.add('dragging-section');
        document.body.classList.add('prevent-scroll-jump');
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('type', 'section');
        e.dataTransfer.setData('text/plain', section.dataset.section);
        
        // Create a placeholder element that won't trigger scrolling
        const placeholder = document.createElement('div');
        placeholder.className = 'section-placeholder no-auto-scroll';
        
        // Insert placeholder after (or before) the dragged section
        if (section.nextElementSibling) {
            section.parentNode.insertBefore(placeholder, section.nextElementSibling);
        } else {
            section.parentNode.appendChild(placeholder);
        }
        
        // Calculate proper offsets for the drag image
        const sectionRect = section.getBoundingClientRect();
        const offsetX = e.clientX - sectionRect.left;
        const offsetY = e.clientY - sectionRect.top;
        
        // Use the section as drag image with the calculated offsets
        e.dataTransfer.setDragImage(section, offsetX, offsetY);
        
        // Hide the original element after the drag image is created without triggering scroll
        requestAnimationFrame(() => {
            section.style.display = 'none';
            
            // Restore scroll position if browser tried to jump
            if (window.scrollY !== startScrollY) {
                window.scrollTo(0, startScrollY);
            }
        });
    }

    function handleSectionDragEnd(e) {
        // Get the section that was being dragged
        const section = e.target.closest('.planner-section');
        if (!section) return;
        
        // Make section visible immediately as a safety measure
        section.style.display = section._originalDisplay || '';
        section.style.opacity = '1';
        
        // If the placeholder still exists, this means the drop didn't occur
        // We need to restore the section to its original position
        const placeholder = document.querySelector('.section-placeholder');
        if (placeholder) {
            if (placeholder.parentNode) {
                // Prepare section for transition
                section.style.opacity = '0';
                section.style.transition = 'opacity 0.3s ease-in';
                
                // Store scroll position before DOM change
                const beforeScrollY = window.scrollY;
                
                // Move section to where the placeholder is and remove the placeholder
                placeholder.parentNode.insertBefore(section, placeholder);
                placeholder.remove();
                
                // Restore scroll position if it changed
                if (window.scrollY !== beforeScrollY) {
                    window.scrollTo(0, beforeScrollY);
                }
                
                // Trigger reflow for the transition to work
                section.offsetHeight;
                
                // Show the section with transition
                section.style.opacity = '1';
                
                // Remove transition after it completes
                setTimeout(() => {
                    section.style.transition = '';
                }, 300);
            }
        }
        
        // Remove drag-over classes
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        
        // Remove drag state flags
        document.body.classList.remove('dragging-section');
        document.body.classList.remove('disable-page-breaks');
        document.body.classList.remove('prevent-scroll-jump');
        section.classList.remove('dragging-section');
        
        // Delay saving slightly to ensure DOM is fully updated
        setTimeout(() => {
            // Save the updated layout
            PlannerData.save();
        }, 50);
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

        // Get the currently dragged section
        const draggingSection = document.querySelector('.planner-section.dragging-section');
        if (!draggingSection) return;
        
        // Skip if we're hovering over the dragged section itself
        if (section === draggingSection) return;

        // Store current scroll position
        const beforeScrollY = window.scrollY;

        // Create or get the placeholder
        let placeholder = document.querySelector('.section-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'section-placeholder no-auto-scroll';
            
            // Insert placeholder at the dragged section's original position first time
            if (draggingSection.nextElementSibling) {
                draggingSection.parentNode.insertBefore(placeholder, draggingSection.nextElementSibling);
            } else {
                draggingSection.parentNode.appendChild(placeholder);
            }
        }

        // Remove all drag-over classes first
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));

        const rect = section.getBoundingClientRect();
        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        
        // Move the placeholder to show the potential drop position
        if (position === 'before') {
            if (section.previousSibling !== placeholder) {
                section.parentNode.insertBefore(placeholder, section);
            }
        } else {
            if (section.nextSibling !== placeholder) {
                section.parentNode.insertBefore(placeholder, section.nextSibling);
            }
        }
        
        // Restore scroll position if it changed during placeholder movement
        if (window.scrollY !== beforeScrollY) {
            window.scrollTo(0, beforeScrollY);
        }
    }

    function handleSectionDrop(e) {
        e.preventDefault();
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedSection = document.querySelector(`[data-section="${draggedId}"]`);
        if (!draggedSection) return;
        
        const section = this.closest('.planner-section');
        if (!section) return;

        // Get the placeholder
        const placeholder = document.querySelector('.section-placeholder');
        if (!placeholder) return;
        
        // Move placeholder to the final position based on the drop
        const rect = section.getBoundingClientRect();
        const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        
        if (position === 'before') {
            section.parentNode.insertBefore(placeholder, section);
        } else {
            section.parentNode.insertBefore(placeholder, section.nextSibling);
        }
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

        // Get the currently dragged section
        const draggingSection = document.querySelector('.planner-section.dragging-section');
        if (!draggingSection) return;

        // Store current scroll position
        const beforeScrollY = window.scrollY;

        // Get or create the placeholder
        let placeholder = document.querySelector('.section-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'section-placeholder no-auto-scroll';
            
            // Insert placeholder at the dragged section's original position first time
            if (draggingSection.nextElementSibling) {
                draggingSection.parentNode.insertBefore(placeholder, draggingSection.nextElementSibling);
            } else {
                draggingSection.parentNode.appendChild(placeholder);
            }
        }

        // Remove drag-over class from all columns and sections
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        
        // Add drag-over class to current column
        this.classList.add('drag-over-section');

        // Find sections in this column (excluding the dragged section)
        const sections = Array.from(this.children).filter(child => 
            child.classList.contains('planner-section') && child !== draggingSection
        );
        
        // Get column boundaries for empty column case
        const columnRect = this.getBoundingClientRect();
        const dropY = e.clientY;
        
        // If column is empty or cursor is below all sections, append to the end
        if (sections.length === 0 || dropY > sections[sections.length - 1].getBoundingClientRect().bottom) {
            if (this.lastChild !== placeholder) {
                this.appendChild(placeholder);
            }
            
            // Restore scroll position if it changed
            if (window.scrollY !== beforeScrollY) {
                window.scrollTo(0, beforeScrollY);
            }
            return;
        }
        
        // Find the closest section to the drop position for non-empty columns
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
                if (closestSection.previousSibling !== placeholder) {
                    this.insertBefore(placeholder, closestSection);
                }
            } else {
                if (closestSection.nextSibling !== placeholder) {
                    this.insertBefore(placeholder, closestSection.nextSibling);
                }
            }
        }
        
        // Restore scroll position if it changed
        if (window.scrollY !== beforeScrollY) {
            window.scrollTo(0, beforeScrollY);
        }
    }

    function handleColumnDrop(e) {
        e.preventDefault();
        
        if (!document.body.classList.contains('dragging-section')) return;
        
        const draggingSection = document.querySelector('.planner-section.dragging-section');
        if (!draggingSection) return;
        
        const placeholder = document.querySelector('.section-placeholder');
        
        // Store current scroll position
        const beforeScrollY = window.scrollY;
        
        // Move the section to where the placeholder is
        if (placeholder && placeholder.parentNode) {
            // Prepare section for transition
            draggingSection.style.opacity = '0';
            draggingSection.style.display = draggingSection._originalDisplay || '';
            draggingSection.style.transition = 'opacity 0.3s ease-in';
            
            // Insert the section at the placeholder position
            placeholder.parentNode.insertBefore(draggingSection, placeholder);
            placeholder.remove();
            
            // Restore scroll position if it changed
            if (window.scrollY !== beforeScrollY) {
                window.scrollTo(0, beforeScrollY);
            }
            
            // Trigger reflow for the transition to work
            draggingSection.offsetHeight;
            
            // Show the section with transition
            draggingSection.style.opacity = '1';
            
            // Remove transition after it completes
            setTimeout(() => {
                draggingSection.style.transition = '';
            }, 300);
        } else {
            // Make sure the section is visible regardless of what happened
            draggingSection.style.display = draggingSection._originalDisplay || '';
            draggingSection.style.opacity = '1';
        }
        
        // Remove drag-over classes
        document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over-section'));
        document.querySelectorAll('.planner-section').forEach(s => s.classList.remove('drag-over-section'));
        
        // Remove drag state flags
        document.body.classList.remove('dragging-section');
        document.body.classList.remove('disable-page-breaks');
        document.body.classList.remove('prevent-scroll-jump');
        draggingSection.classList.remove('dragging-section');
        
        // Delay saving slightly to ensure DOM is fully updated
        setTimeout(() => {
            // Save the updated layout
            PlannerData.save();
        }, 50);
    }

    // Item drag handlers - modified to check for section dragging
    function handleItemDragStart(e) {
        if (document.body.classList.contains('dragging-section')) {
            e.preventDefault();
            return;
        }
        
        const item = this;
        item.classList.add('dragging');
        document.body.classList.add('dragging');
        e.dataTransfer.setData('text/plain', item.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        
        // Delay hiding the original item and creating the placeholder
        // to let the browser create the drag image first
        setTimeout(() => {
            // Create placeholder and place it where the dragged item was
            const placeholder = document.createElement('div');
            placeholder.className = 'drag-placeholder';
            
            // Insert placeholder after the item (so it's in the right place after the item is hidden)
            if (item.nextElementSibling) {
                item.parentNode.insertBefore(placeholder, item.nextElementSibling);
            } else {
                item.parentNode.appendChild(placeholder);
            }
            
            // Now hide the original item
            item.style.display = 'none';
        }, 0);
    }

    function handleItemDragEnd(e) {
        this.classList.remove('dragging');
        document.body.classList.remove('dragging');
        
        // Remove drag-over class from all items
        document.querySelectorAll('.draggable-item').forEach(item => item.classList.remove('drag-over'));
        
        // Get the placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        
        if (placeholder && placeholder.parentNode) {
            // Get placeholder position for animation
            const placeholderRect = placeholder.getBoundingClientRect();
            
            // Make item visible but with transition
            this.style.opacity = '0';
            this.style.display = '';
            this.style.transition = 'opacity 0.3s ease-in';
            
            // Place the item in the placeholder's position
            placeholder.parentNode.insertBefore(this, placeholder);
            placeholder.remove();
            
            // Trigger reflow for the transition to work
            this.offsetHeight;
            
            // Show the item with transition
            this.style.opacity = '1';
            
            // Remove transition after it completes
            setTimeout(() => {
                this.style.transition = '';
            }, 300);
        } else {
            // Make item visible again if no placeholder (drop didn't occur)
            this.style.display = '';
        }
        
        PlannerData.save();
    }

    function handleItemDragOver(e) {
        if (document.body.classList.contains('dragging-section')) {
            return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Get the currently dragged item
        const draggingItem = document.querySelector('.draggable-item.dragging');
        if (!draggingItem) return;

        // Get the existing placeholder (which should have been created in dragStart)
        const placeholder = document.querySelector('.drag-placeholder');
        if (!placeholder) {
            // If there's no placeholder yet (unlikely but possible), don't do anything
            // The placeholder will be created when the dragStart timeout finishes
            return;
        }

        // If dropping on a list item
        if (this.classList.contains('draggable-item')) {
            const rect = this.getBoundingClientRect();
            const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            
            // Skip if we're hovering over the dragged item itself
            if (this === draggingItem) return;
            
            // Move the placeholder to show the potential drop position
            if (position === 'before') {
                if (this.previousSibling !== placeholder) {
                    this.parentNode.insertBefore(placeholder, this);
                }
            } else {
                if (this.nextSibling !== placeholder) {
                    this.parentNode.insertBefore(placeholder, this.nextSibling);
                }
            }
        }
        // If dropping on a list
        else if (this.classList.contains('sortable-list')) {
            // Find the closest item to the drop position
            const items = Array.from(this.children).filter(child => 
                child.classList.contains('draggable-item') && child !== draggingItem
            );
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
                    if (closestItem.previousSibling !== placeholder) {
                        this.insertBefore(placeholder, closestItem);
                    }
                } else {
                    if (closestItem.nextSibling !== placeholder) {
                        this.insertBefore(placeholder, closestItem.nextSibling);
                    }
                }
            } else {
                // If no items in the list or drop position is at the bottom
                // Only append if it's not already the last child
                if (this.lastChild !== placeholder) {
                    this.appendChild(placeholder);
                }
            }
        }

        // Remove drag-over class from all items except the dragged item
        document.querySelectorAll('.draggable-item').forEach(item => {
            if (item.classList.contains('dragging')) return;
            item.classList.remove('drag-over');
        });
    }

    function handleItemDrop(e) {
        e.preventDefault();
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedItem = document.querySelector(`[data-id="${draggedId}"]`);
        if (!draggedItem) return;
        
        // Get the placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        if (!placeholder) return;
        
        // If dropping on a list item
        if (this.classList.contains('draggable-item')) {
            const rect = this.getBoundingClientRect();
            const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            
            if (position === 'before') {
                this.parentNode.insertBefore(placeholder, this);
            } else {
                this.parentNode.insertBefore(placeholder, this.nextSibling);
            }
        }
        // If dropping on a list
        else if (this.classList.contains('sortable-list')) {
            // Find the closest item to the drop position
            const items = Array.from(this.children).filter(child => 
                child.classList.contains('draggable-item') && child !== draggedItem
            );
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
                    this.insertBefore(placeholder, closestItem);
                } else {
                    this.insertBefore(placeholder, closestItem.nextSibling);
                }
            } else {
                // If no items in the list or drop position is at the bottom
                this.appendChild(placeholder);
            }
        }
        
        // Remove drag-over class from all items in the document
        document.querySelectorAll('.draggable-item').forEach(item => {
            item.classList.remove('drag-over');
        });
        
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
        const plannerContainer = document.querySelector('.planner-container');
        plannerContainer.classList.toggle('portrait');
        const isLandscape = !document.body.classList.contains('portrait-mode');
        orientationToggle.textContent = isLandscape ? 'Landscape' : 'Portrait';
        
        // Save the updated state
        PlannerData.save();
    });


    // Handle print page breaks - Only run this right before printing
    function handlePrintPageBreaks() {
        console.log('Print page breaks calculation started');
        
        // If we're in the middle of a drag operation, don't calculate page breaks
        if (document.body.classList.contains('dragging') || 
            document.body.classList.contains('dragging-section') ||
            document.body.classList.contains('disable-page-breaks')) {
            console.log('Skipping page breaks calculation during drag operation');
            return;
        }
        
        // We need to calculate this right before printing
        const isPortrait = document.body.classList.contains('portrait-mode');
        const pageHeight = isPortrait ? 297 : 210; // A4 height in mm
        const pageHeightPx = pageHeight * 3.779527559; // Convert mm to px (96 dpi)
        
        // Reset any previously set page breaks
        document.querySelectorAll('.planner-section.page-break-before').forEach(section => {
            section.classList.remove('page-break-before');
        });
        
        // Get all sections that are visible
        const sections = Array.from(document.querySelectorAll('.planner-section')).filter(section => {
            // Skip sections that are hidden, being dragged, or placeholder related
            return section.style.display !== 'none' && 
                   !section.classList.contains('dragging-section') &&
                   !section.classList.contains('section-placeholder');
        });
        
        let currentPageTop = 0;
        
        sections.forEach(section => {
            const sectionRect = section.getBoundingClientRect();
            // Skip elements with no height (hidden elements)
            if (sectionRect.height === 0) return;
            
            const sectionHeight = sectionRect.height;
            const sectionTop = sectionRect.top - document.body.getBoundingClientRect().top;
            
            // If this section would cross a page boundary
            if (sectionTop + sectionHeight > currentPageTop + pageHeightPx) {
                // If the section is not at the start of a page already
                if (sectionTop > currentPageTop) {
                    section.classList.add('page-break-before');
                    console.log('Added page-break-before to section:', section.querySelector('h2')?.textContent);
                    currentPageTop = Math.ceil((sectionTop) / pageHeightPx) * pageHeightPx;
                }
            }
        });
        
        console.log('Print page breaks calculation completed');
    }
    
    // Only run handlePrintPageBreaks for actual print events, not during drag operations
    window.addEventListener('beforeprint', () => {
        if (!document.body.classList.contains('dragging') && 
            !document.body.classList.contains('dragging-section') &&
            !document.body.classList.contains('disable-page-breaks')) {
            handlePrintPageBreaks();
        }
    });
    
    // For browsers that don't support beforeprint
    if (window.matchMedia) {
        const mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(function(mql) {
            if (mql.matches && 
                !document.body.classList.contains('dragging-section') && 
                !document.body.classList.contains('dragging') &&
                !document.body.classList.contains('disable-page-breaks')) {
                handlePrintPageBreaks();
            }
        });
    }
    
    // Modify the drag event listeners to better handle page breaks
    document.addEventListener('dragstart', (e) => {
        // Disable page break calculations during any drag operations
        document.body.classList.add('disable-page-breaks');
    });
    
    document.addEventListener('dragend', (e) => {
        // Re-enable page break calculations
        setTimeout(() => {
            document.body.classList.remove('disable-page-breaks');
        }, 100);
    });

    // Add a style rule to prevent scrolling for placeholders
    const style = document.createElement('style');
    style.textContent = `
    .section-placeholder.no-auto-scroll {
        contain: style layout;
        overflow: clip;
    }
    .prevent-scroll-jump {
        overflow-anchor: none;
    }
    `;
    document.head.appendChild(style);

    // Initialize the application
    loadState();
}); 