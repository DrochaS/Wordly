// Dictionary API endpoint
const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

// DOM Elements
const searchForm = document.getElementById('searchForm');
const wordInput = document.getElementById('wordInput');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const results = document.getElementById('results');
const wordHeader = document.getElementById('wordHeader');
const wordTitle = document.getElementById('wordTitle');
const playAudioBtn = document.getElementById('playAudio');
const definitionsSection = document.getElementById('definitionsSection');
const definitionsList = document.getElementById('definitionsList');
const synonymsSection = document.getElementById('synonymsSection');
const synonymsList = document.getElementById('synonymsList');
const placeholder = document.getElementById('placeholder');

// Audio object for pronunciation
let currentAudio = null;

//  Functions
function showLoading() {
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    // Hide all result sections
    wordHeader.classList.add('hidden');
    definitionsSection.classList.add('hidden');
    synonymsSection.classList.add('hidden');
    placeholder.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function clearResults() {
    wordHeader.classList.add('hidden');
    definitionsSection.classList.add('hidden');
    synonymsSection.classList.add('hidden');
    definitionsList.innerHTML = '';
    synonymsList.innerHTML = '';
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
}

function showPlaceholder() {
    placeholder.classList.remove('hidden');
}

function hidePlaceholder() {
    placeholder.classList.add('hidden');
}

// Display Definitions
function displayDefinitions(definitions) {
    if (!definitions || definitions.length === 0) {
        definitionsList.innerHTML = '<div class="fallback-message">No definitions available for this word.</div>';
        return;
    }

    definitionsList.innerHTML = '';
    definitions.forEach(def => {
        const definitionItem = document.createElement('div');
        definitionItem.className = 'definition-item';
        
        const partOfSpeech = def.partOfSpeech || 'Unknown';
        const definition = def.definition || 'No definition available';
        const example = def.example || '';
        
        definitionItem.innerHTML = `
            <div class="definition-part">${partOfSpeech}</div>
            <div class="definition-text">${definition}</div>
            ${example ? `<div class="definition-example">"${example}"</div>` : ''}
        `;
        
        definitionsList.appendChild(definitionItem);
    });
}

// Display Synonyms
function displaySynonyms(synonyms) {
    if (!synonyms || synonyms.length === 0) {
        synonymsList.innerHTML = '<div class="fallback-message">No synonyms available for this word.</div>';
        return;
    }

    synonymsList.innerHTML = '';
    
    const uniqueSynonyms = [...new Set(synonyms)].slice(0, 15);
    
    uniqueSynonyms.forEach(synonym => {
        const synonymTag = document.createElement('div');
        synonymTag.className = 'synonym-tag';
        synonymTag.textContent = synonym;
        
        
        synonymTag.addEventListener('click', () => {
            wordInput.value = synonym;
            searchForm.dispatchEvent(new Event('submit'));
        });
        
        synonymsList.appendChild(synonymTag);
    });
}

// Play audio pronunciation
function setupAudio(phonetics) {
    if (!phonetics || phonetics.length === 0) {
        playAudioBtn.classList.add('hidden');
        return;
    }
    
    // Find first audio URL
    const audioObj = phonetics.find(p => p.audio && p.audio.length > 0);
    const audioUrl = audioObj ? audioObj.audio : null;
    
    if (audioUrl) {
        currentAudio = new Audio(audioUrl);
        playAudioBtn.classList.remove('hidden');
        
        // Remove existing listeners and add new one
        const newPlayBtn = playAudioBtn.cloneNode(true);
        playAudioBtn.parentNode.replaceChild(newPlayBtn, playAudioBtn);
        
        newPlayBtn.addEventListener('click', () => {
            if (currentAudio) {
                currentAudio.play().catch(err => {
                    console.error('Audio playback error:', err);
                    showError('Unable to play pronunciation. Audio file may be unavailable.');
                });
            }
        });
        
        // Update reference
        window.playAudioBtn = newPlayBtn;
    } else {
        playAudioBtn.classList.add('hidden');
    }
}

// Main function to fetch word data
async function fetchWordData(word) {
    if (!word || word.trim() === '') {
        showError('Please enter a word to search.');
        return;
    }
    
    // Trim and lowercase the word
    const searchWord = word.trim().toLowerCase();
    
    showLoading();
    hideError();
    clearResults();
    hidePlaceholder();
    
    try {
        const response = await fetch(`${API_URL}${searchWord}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`"${searchWord}" not found. Please check spelling or try another word.`);
            }
            throw new Error(`HTTP ${response.status}: Unable to fetch data.`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error(`No definitions found for "${searchWord}".`);
        }
        
        const wordData = data[0];
        
        // Display word title
        wordTitle.textContent = wordData.word;
        wordHeader.classList.remove('hidden');
        
        // Setup audio pronunciation
        setupAudio(wordData.phonetics);
        
        // Extract and display definitions
        const definitions = [];
        const allSynonyms = [];
        
        if (wordData.meanings && wordData.meanings.length > 0) {
            wordData.meanings.forEach(meaning => {
                if (meaning.definitions && meaning.definitions.length > 0) {
                    meaning.definitions.forEach(def => {
                        definitions.push({
                            partOfSpeech: meaning.partOfSpeech,
                            definition: def.definition,
                            example: def.example
                        });
                    });
                }
                
                // Collect synonyms
                if (meaning.synonyms && meaning.synonyms.length > 0) {
                    allSynonyms.push(...meaning.synonyms);
                }
            });
        }
        
        // Display definitions
        if (definitions.length > 0) {
            displayDefinitions(definitions);
            definitionsSection.classList.remove('hidden');
        } else {
            definitionsSection.classList.add('hidden');
        }
        
        // Display synonyms
        if (allSynonyms.length > 0) {
            displaySynonyms(allSynonyms);
            synonymsSection.classList.remove('hidden');
        } else {
            synonymsSection.classList.add('hidden');
        }
        
        // If no data at all, show placeholder with message
        if (definitions.length === 0 && allSynonyms.length === 0) {
            showPlaceholder();
            placeholder.innerHTML = '<p>⚠️ No definitions or synonyms found for this word.</p>';
        }
        
    } catch (error) {
        console.error('Error fetching word data:', error);
        showError(error.message || 'Failed to fetch word data. Please try again.');
        showPlaceholder();
    } finally {
        hideLoading();
    }
}

// Handle form submission
function handleSubmit(event) {
    event.preventDefault();
    const word = wordInput.value;
    fetchWordData(word);
}

// Input validation on the fly
wordInput.addEventListener('input', (event) => {
    const value = event.target.value;
    if (value.length > 0 && !/^[a-zA-Z\s\-']+$/.test(value)) {
        wordInput.style.borderColor = '#ff9800';
    } else {
        wordInput.style.borderColor = '#e0e0e0';
    }
});

wordInput.addEventListener('blur', () => {
    wordInput.style.borderColor = '#e0e0e0';
});

// Event Listeners
searchForm.addEventListener('submit', handleSubmit);

// Allow Enter key to submit
wordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchForm.dispatchEvent(new Event('submit'));
    }
});

// Focus on input on page load
wordInput.focus();

// Console log to confirm script loaded
console.log('Dictionary App loaded! Ready to search for words.');