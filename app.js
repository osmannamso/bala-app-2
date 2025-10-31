// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// IndexedDB setup
let db;
const request = indexedDB.open('kidsLearningApp', 1);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
    db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
};
request.onsuccess = function(e) { db = e.target.result; renderCategories(); };

// Utility functions for DB
function addCategory(name, picture) {
    const tx = db.transaction('categories', 'readwrite');
    tx.objectStore('categories').add({ name, picture });
    tx.oncomplete = renderCategories;
}
function addItem(categoryId, name, picture, sound) {
    const tx = db.transaction('items', 'readwrite');
    tx.objectStore('items').add({ categoryId, name, picture, sound });
    tx.oncomplete = () => renderItems(categoryId);
}
function getCategories(cb) {
    const tx = db.transaction('categories', 'readonly');
    const store = tx.objectStore('categories');
    const req = store.getAll();
    req.onsuccess = () => cb(req.result);
}
function getItems(categoryId, cb) {
    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const req = store.getAll();
    req.onsuccess = () => cb(req.result.filter(i => i.categoryId === categoryId));
}

// UI rendering
function renderCategories() {
    getCategories(categories => {
        const app = document.getElementById('app');
        app.innerHTML = `<h2>Categories</h2>
      <button onclick="showAddCategory()">Add Category</button>
      <div>${categories.map(c => `<div onclick="renderItems(${c.id})">
        <img src="${c.picture}" width="100"><br>${c.name}</div>`).join('')}</div>`;
    });
}
function renderItems(categoryId) {
    getItems(categoryId, items => {
        const app = document.getElementById('app');
        app.innerHTML = `<button onclick="renderCategories()">Back</button>
      <h2>Items</h2>
      <button onclick="showAddItem(${categoryId})">Add Item</button>
      <div class="items-grid">
        ${items.map(i => `
          <div class="item-card">
            <img src="${i.picture}" onclick="playSound('${i.sound}')" alt="${i.name}">
            <div class="item-name">${i.name}</div>
          </div>
        `).join('')}
      </div>`;
    });
}
function showAddCategory() {
    document.getElementById('app').innerHTML = `
    <button onclick="renderCategories()">Back</button>
    <h2>Add Category</h2>
    <input id="catName" placeholder="Name"><br>
    <input type="file" id="catPic" accept="image/*"><br>
    <button onclick="submitCategory()">Save</button>`;
}
function submitCategory() {
    const name = document.getElementById('catName').value;
    const picFile = document.getElementById('catPic').files[0];
    const reader = new FileReader();
    reader.onload = () => addCategory(name, reader.result);
    if (picFile) reader.readAsDataURL(picFile);
}
function showAddItem(categoryId) {
    document.getElementById('app').innerHTML = `
    <button onclick="renderItems(${categoryId})">Back</button>
    <h2>Add Item</h2>
    <input id="itemName" placeholder="Name"><br>
    <input type="file" id="itemPic" accept="image/*"><br>
    <button onclick="startRecording()">Record Sound</button>
    <audio id="audioPreview" controls style="display:none"></audio>
    <button onclick="submitItem(${categoryId})">Save</button>`;
}
let recordedSound = null;
let mediaRecorder, audioChunks = [];
function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            recordedSound = URL.createObjectURL(audioBlob);
            const audio = document.getElementById('audioPreview');
            audio.src = recordedSound;
            audio.style.display = 'block';
        };
        setTimeout(() => mediaRecorder.stop(), 3000); // Record for 3 seconds
    });
}
function submitItem(categoryId) {
    const name = document.getElementById('itemName').value;
    const picFile = document.getElementById('itemPic').files[0];
    const reader = new FileReader();
    reader.onload = () => addItem(categoryId, name, reader.result, recordedSound);
    if (picFile) reader.readAsDataURL(picFile);
}
function playSound(soundUrl) {
    const audio = new Audio(soundUrl);
    audio.play();
}
