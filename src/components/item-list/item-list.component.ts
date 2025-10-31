
import { Component, ChangeDetectionStrategy, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../models/category.model';
import { Item } from '../../models/item.model';
import { DbService } from '../../services/db.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-item-list',
  templateUrl: './item-list.component.html',
  imports: [CommonModule],
})
export class ItemListComponent {
  category = input.required<Category>();
  private dbService = inject(DbService);
  
  items = signal<Item[]>([]);
  private currentlyPlaying: HTMLAudioElement | null = null;

  constructor() {
    effect(async () => {
      const cat = this.category();
      if (cat && cat.id) {
        const fetchedItems = await this.dbService.getItems(cat.id);
        this.items.set(fetchedItems);
      }
    });
  }

  playSound(item: Item) {
    if (this.currentlyPlaying) {
      this.currentlyPlaying.pause();
      this.currentlyPlaying.currentTime = 0;
    }
    
    if (item.sound) {
      const audio = new Audio(item.sound);
      this.currentlyPlaying = audio;
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  }
}
