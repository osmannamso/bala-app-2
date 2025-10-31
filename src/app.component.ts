
import { Component, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryListComponent } from './components/category-list/category-list.component';
import { ItemListComponent } from './components/item-list/item-list.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { DbService } from './services/db.service';
import { Category } from './models/category.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CategoryListComponent, ItemListComponent, AdminPanelComponent],
})
export class AppComponent {
  dbService = inject(DbService);

  viewMode = signal<'learn' | 'edit'>('learn');
  selectedCategory = signal<Category | null>(null);

  isDbReady = this.dbService.dbReady;

  selectCategory(category: Category) {
    this.selectedCategory.set(category);
  }

  goBackToCategories() {
    this.selectedCategory.set(null);
  }

  toggleViewMode() {
    this.viewMode.update(mode => (mode === 'learn' ? 'edit' : 'learn'));
    this.selectedCategory.set(null); // Reset selection when changing mode
  }
}
