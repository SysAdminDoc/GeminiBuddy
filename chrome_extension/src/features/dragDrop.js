// /src/features/dragDrop.js

import { state, saveSettings } from '../state.js';
import { findPromptCategory, renderAllPrompts, savePrompts } from './prompts.js';
import { showToast } from '../utils.js';

let draggedItem = null;

export function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', "<span></span>");
    setTimeout(() => this.classList.add('dragging'), 0);
}

export function handleDragOver(e) {
    e.preventDefault();
    if (this.classList.contains('prompt-button-wrapper') && this !== draggedItem && this.closest('.prompt-category-content')) {
        this.classList.add('drag-over');
    }
    return false;
}

export function handleDragLeave() {
    this.classList.remove('drag-over');
}

export function handleDrop(e) {
    e.stopPropagation();
    if (draggedItem !== this) {
        const sourceCategoryName = findPromptCategory(draggedItem.dataset.promptId);
        const targetCategoryName = findPromptCategory(this.dataset.promptId);
        if (sourceCategoryName === targetCategoryName && sourceCategoryName !== null) {
            const categoryPrompts = state.currentPrompts[sourceCategoryName];
            const sourceIndex = categoryPrompts.findIndex(p => p.id === draggedItem.dataset.promptId);
            const targetIndex = categoryPrompts.findIndex(p => p.id === this.dataset.promptId);

            if (sourceIndex > -1 && targetIndex > -1) {
                const [removed] = categoryPrompts.splice(sourceIndex, 1);
                categoryPrompts.splice(targetIndex, 0, removed);
                savePrompts().then(renderAllPrompts);
            }
        } else {
            showToast("Can only reorder prompts within the same category.", 2500, 'error');
        }
    }
    return false;
}

export function handleDragEnd() {
    document.querySelectorAll('.prompt-button-wrapper').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
    draggedItem = null;
}

export function handleCategoryDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.categoryName);
    setTimeout(() => this.classList.add('dragging'), 0);
}

export function handleCategoryDragOver(e) {
    e.preventDefault();
    if (this.classList.contains('prompt-category') && this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

export function handleCategoryDragLeave() {
    this.classList.remove('drag-over');
}

export function handleCategoryDrop(e) {
    e.stopPropagation();
    if (draggedItem !== this) {
        const sourceName = draggedItem.dataset.categoryName;
        const targetName = this.dataset.categoryName;

        const order = state.settings.groupByTags ? state.settings.tagOrder : state.settings.groupOrder;
        const sourceIndex = order.findIndex(t => t === sourceName);
        const targetIndex = order.findIndex(t => t === targetName);

        if (sourceIndex > -1 && targetIndex > -1) {
            const [removed] = order.splice(sourceIndex, 1);
            order.splice(targetIndex, 0, removed);
            saveSettings().then(renderAllPrompts);
        }
    }
    return false;
}

export function handleCategoryDragEnd() {
    document.querySelectorAll('.prompt-category').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
    draggedItem = null;
}