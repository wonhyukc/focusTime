function getLang() {
    const lang = (navigator.language || navigator.userLanguage || 'ko').slice(0,2).toLowerCase();
    const supported = [
        'ko','en','zh','hi','es','fr','ar','bn','pt','ru','ur'
    ];
    const result = supported.includes(lang) ? lang : 'ko';
    console.log('[i18n] Detected browser language:', lang, '-> Using:', result);
    return result;
}

function getI18nUrl(lang) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        const url = chrome.runtime.getURL(`i18n/${lang}.json`);
        console.log('[i18n] Using Chrome extension URL for', lang, ':', url);
        return url;
    }
    const url = '../i18n/' + lang + '.json';
    console.log('[i18n] Using relative URL for', lang, ':', url);
    return url;
}

async function loadI18n(lang) {
    try {
        const url = getI18nUrl(lang);
        console.log('[i18n] Fetching i18n JSON:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        console.log('[i18n] Loaded i18n JSON for', lang, ':', json);
        return json;
    } catch (e) {
        console.error('[i18n] Failed to load i18n for', lang, ', falling back to ko. Error:', e);
        try {
            const url = getI18nUrl('ko');
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (fallbackError) {
            console.error('[i18n] Failed to load fallback (ko) i18n:', fallbackError);
            return {
                appName: 'PomoLog',
                error: 'Failed to load translations'
            };
        }
    }
}

function updateElement(element, key, dict) {
    if (!element || !key || !dict[key]) return;
    
    if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = dict[key];
    } else if (element.tagName === 'IMG') {
        element.alt = dict[key];
    } else {
        element.innerHTML = dict[key];
    }
}

async function i18nUpdate(selectedLang) {
    const lang = selectedLang || getLang();
    const dict = await loadI18n(lang);
    window.currentI18nDict = dict;
    console.log('[i18n] Applying language:', lang);
    
    // Update document title
    document.title = dict.appName + ' (PomoLog)';
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        updateElement(element, key, dict);
    });
    
    // Update select options
    document.querySelectorAll('select option[data-i18n]').forEach(option => {
        const key = option.getAttribute('data-i18n');
        if (dict[key]) {
            option.textContent = dict[key];
        }
    });
    
    // Sync language dropdown
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = lang;
    
    // 드롭다운 옵션도 번역
    console.log('[i18n] updateAllSoundOptionsWithI18n 호출, dict:', dict);
    if (window.updateAllSoundOptionsWithI18n) {
        window.updateAllSoundOptionsWithI18n(dict);
    }
    
    console.log('[i18n] UI updated to language:', lang);
}

// Initialize i18n when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    i18nUpdate();
    // Add language change listener
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', function() {
            i18nUpdate(langSelect.value);
        });
    }
}); 