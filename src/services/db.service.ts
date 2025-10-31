
import { Injectable, signal } from '@angular/core';
import { Category } from '../models/category.model';
import { Item } from '../models/item.model';

const DB_NAME = 'KidsLearningDB';
const DB_VERSION = 1;
const CATEGORIES_STORE = 'categories';
const ITEMS_STORE = 'items';

@Injectable({
  providedIn: 'root',
})
export class DbService {
  private db: IDBDatabase | null = null;
  dbReady = signal(false);

  constructor() {
    this.initDb();
  }

  private async initDb(): Promise<void> {
    try {
      this.db = await this.openDb();
      this.dbReady.set(true);
      
      // Seed initial data if the database is new
      const categoryCount = await this.count(CATEGORIES_STORE);
      if (categoryCount === 0) {
        await this.seedData();
      }

    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.dbReady.set(false);
    }
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
          db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(ITEMS_STORE)) {
          const itemStore = db.createObjectStore(ITEMS_STORE, { keyPath: 'id', autoIncrement: true });
          itemStore.createIndex('categoryId', 'categoryId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject('Database error: ' + (event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // Generic CRUD operations
  add<T>(storeName: string, item: Omit<T, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }
  
  update<T extends {id?: number}>(storeName: string, item: T): Promise<T> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  delete(storeName: string, id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  count(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Category specific methods
  getCategories(): Promise<Category[]> {
    return this.getAll<Category>(CATEGORIES_STORE);
  }
  addCategory(category: Omit<Category, 'id'>): Promise<number> {
    return this.add<Category>(CATEGORIES_STORE, category);
  }
  updateCategory(category: Category): Promise<Category> {
    return this.update<Category>(CATEGORIES_STORE, category);
  }
  deleteCategory(id: number): Promise<void> {
    return this.delete(CATEGORIES_STORE, id);
  }

  // Item specific methods
  getItems(categoryId: number): Promise<Item[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(ITEMS_STORE, 'readonly');
      const index = store.index('categoryId');
      const request = index.getAll(categoryId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  getAllItems(): Promise<Item[]> {
    return this.getAll<Item>(ITEMS_STORE);
  }
  addItem(item: Omit<Item, 'id'>): Promise<number> {
    return this.add<Item>(ITEMS_STORE, item);
  }
  updateItem(item: Item): Promise<Item> {
    return this.update<Item>(ITEMS_STORE, item);
  }
  deleteItem(id: number): Promise<void> {
    return this.delete(ITEMS_STORE, id);
  }

  private async seedData(): Promise<void> {
    console.log('Seeding initial data...');
    // In a real app, these would be actual base64 strings for images/sounds.
    // Here we use placeholders.
    const placeholderSquare = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    const animalCategoryId = await this.addCategory({ name: 'Animals', picture: placeholderSquare });
    await this.addItem({ categoryId: animalCategoryId, name: 'Dog', picture: placeholderSquare, sound: '' });
    await this.addItem({ categoryId: animalCategoryId, name: 'Cat', picture: placeholderSquare, sound: '' });

    const vehicleCategoryId = await this.addCategory({ name: 'Vehicles', picture: placeholderSquare });
    await this.addItem({ categoryId: vehicleCategoryId, name: 'Car', picture: placeholderSquare, sound: '' });
    await this.addItem({ categoryId: vehicleCategoryId, name: 'Airplane', picture: placeholderSquare, sound: '' });
  }
}
