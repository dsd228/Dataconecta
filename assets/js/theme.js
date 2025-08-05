// theme.js

// Function to apply the theme based on user's system preference
function applyTheme() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (darkModeMediaQuery.matches) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Apply theme on initial load
applyTheme();

// Listen for changes to the user's preference
darkModeMediaQuery.addListener(applyTheme);