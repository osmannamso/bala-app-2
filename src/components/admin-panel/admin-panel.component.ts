
import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbService } from '../../services/db.service';
import { Category } from '../../models/category.model';
import { Item } from '../../models/item.model';
import { FormsModule } from '@angular/forms';

type FormMode = 'add' | 'edit';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  imports: [CommonModule, FormsModule],
})
export class AdminPanelComponent implements OnInit {
  private dbService = inject(DbService);

  categories = signal<Category[]>([]);
  items = signal<Item[]>([]);

  // Category Form State
  showCategoryForm = signal(false);
  categoryFormMode = signal<FormMode>('add');
  editableCategory = signal<Category | null>(null);

  // Item Form State
  showItemForm = signal(false);
  itemFormMode = signal<FormMode>('add');
  editableItem = signal<Item | null>(null);

  // Audio Recording State
  isRecording = signal(false);
  recordedAudioUrl = signal<string | null>(null);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.categories.set(await this.dbService.getCategories());
    this.items.set(await this.dbService.getAllItems());
  }

  getCategoryName(categoryId: number): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? 'Unknown';
  }
  
  // --- Category Management ---

  showAddCategoryForm() {
    this.editableCategory.set({ name: '', picture: '' });
    this.categoryFormMode.set('add');
    this.showCategoryForm.set(true);
  }

  showEditCategoryForm(category: Category) {
    this.editableCategory.set({ ...category });
    this.categoryFormMode.set('edit');
    this.showCategoryForm.set(true);
  }

  async saveCategory() {
    const category = this.editableCategory();
    if (!category || !category.name || !category.picture) {
      alert('Please provide a name and picture.');
      return;
    }

    if (this.categoryFormMode() === 'add') {
      await this.dbService.addCategory({ name: category.name, picture: category.picture });
    } else {
      await this.dbService.updateCategory(category);
    }
    
    this.cancelCategoryForm();
    await this.loadData();
  }

  cancelCategoryForm() {
    this.showCategoryForm.set(false);
    this.editableCategory.set(null);
  }

  async deleteCategory(id: number | undefined) {
    if (id && confirm('Are you sure? This will also delete all items in this category.')) {
      // First, delete items in the category
      const itemsToDelete = this.items().filter(item => item.categoryId === id);
      for (const item of itemsToDelete) {
        if(item.id) await this.dbService.deleteItem(item.id);
      }

      await this.dbService.deleteCategory(id);
      await this.loadData();
    }
  }

  handlePictureInput(event: Event, type: 'category' | 'item') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (type === 'category' && this.editableCategory()) {
          this.editableCategory.update(cat => cat ? { ...cat, picture: base64 } : null);
        } else if (type === 'item' && this.editableItem()) {
          this.editableItem.update(item => item ? { ...item, picture: base64 } : null);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // --- Item Management ---

  showAddItemForm() {
    this.editableItem.set({ categoryId: 0, name: '', picture: '', sound: '' });
    this.itemFormMode.set('add');
    this.recordedAudioUrl.set(null);
    this.showItemForm.set(true);
  }

  showEditItemForm(item: Item) {
    this.editableItem.set({ ...item });
    this.itemFormMode.set('edit');
    this.recordedAudioUrl.set(item.sound);
    this.showItemForm.set(true);
  }

  async saveItem() {
    const item = this.editableItem();
    if (!item || !item.name || !item.picture || item.categoryId === 0) {
      alert('Please fill all fields and select a category.');
      return;
    }
     if (!item.sound) {
      alert('Please record a sound for the item.');
      return;
    }

    if (this.itemFormMode() === 'add') {
      await this.dbService.addItem({ ...item });
    } else {
      await this.dbService.updateItem(item);
    }

    this.cancelItemForm();
    await this.loadData();
  }

  cancelItemForm() {
    this.showItemForm.set(false);
    this.editableItem.set(null);
    this.stopRecording();
  }

  async deleteItem(id: number | undefined) {
    if (id && confirm('Are you sure you want to delete this item?')) {
      await this.dbService.deleteItem(id);
      await this.loadData();
    }
  }

  // --- Audio Recording ---
  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          this.recordedAudioUrl.set(base64);
          if(this.editableItem()) {
            this.editableItem.update(item => item ? {...item, sound: base64} : null);
          }
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };
      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }
}
