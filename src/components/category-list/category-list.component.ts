
import { Component, ChangeDetectionStrategy, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../models/category.model';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  imports: [CommonModule],
})
export class CategoryListComponent implements OnInit {
  categorySelected = output<Category>();
  private dbService = inject(DbService);
  
  categories = signal<Category[]>([]);

  ngOnInit() {
    this.loadCategories();
  }

  async loadCategories() {
    const cats = await this.dbService.getCategories();
    this.categories.set(cats);
  }

  selectCategory(category: Category) {
    this.categorySelected.emit(category);
  }
}
