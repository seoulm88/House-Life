/**
 * Mamma App Entry Point
 */
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI with Store data
    UI.init();

    // 2. Prevent pull-to-refresh on mobile
    document.body.addEventListener('touchmove', function(e) {
        if(e.target.closest('#modal-container') || e.target.closest('main')) {
            return;
        }
        e.preventDefault();
    }, { passive: false });

    // 3. Android Back Button Exit Confirmation Setup
    window.history.pushState({ page: 'mamma_app' }, "", "");
    window.addEventListener('popstate', function(event) {
        const wantExit = confirm('Mamma 앱을 종료하시겠습니까?');
        if (wantExit) {
            window.history.back(); // Allow it to naturally close
            setTimeout(() => { window.close(); }, 300); // Fallback for some browsers
        } else {
            // Push state back so next back button press caught again
            window.history.pushState({ page: 'mamma_app' }, "", "");
        }
    });
});

// Polyfill for PWA prompt (optional, omitted for simple flow)
