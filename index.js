/**
 * Logseq Parent Breadcrumb Plugin
 * Adds breadcrumb navigation to parent pages
 */
import "@logseq/libs";

function main() {
  let currentPage = null;
  let breadcrumbContainer = null;
  let settings = {
    displayMode: 'full' // 'simple' or 'full'
  };

  /**
   * Creates the breadcrumb DOM element - Simple mode
   */
  function createSimpleBreadcrumb(pageName) {
    const parts = pageName.split('/').map(p => p.trim());
    
    if (parts.length <= 1) {
      return null;
    }

    // Get immediate parent path
    const parentParts = parts.slice(0, -1);
    const parentPath = parentParts.join('/');

    const container = document.createElement('div');
    container.className = 'initial parent-breadcrumb-plugin';
    container.setAttribute('data-breadcrumb', 'true');
    container.style.cssText = 'margin: 12px 24px;';

    // Create simple parent link
    const refSpan = document.createElement('span');
    refSpan.setAttribute('data-ref', parentPath);
    refSpan.className = 'page-reference';

    const refDiv = document.createElement('div');
    refDiv.className = '';
    refDiv.setAttribute('data-tooltipped', '');
    refDiv.style.display = 'inline';

    const link = document.createElement('a');
    link.tabIndex = 0;
    link.setAttribute('data-ref', parentPath.toLowerCase());
    link.draggable = true;
    link.className = 'page-ref';
    link.textContent = '↩ ' + parentParts.at(-1);
    link.setAttribute('href', `#/page/${encodeURIComponent(parentPath.toLowerCase())}`);

    refDiv.appendChild(link);
    refSpan.appendChild(refDiv);
    container.appendChild(refSpan);

    return container;
  }

  /**
   * Creates the breadcrumb DOM element - Full hierarchy mode
   */
  function createFullBreadcrumb(pageName) {
    const parts = pageName.split('/').map(p => p.trim());
    if (parts.length <= 1) {
      return null;
    }

    const container = document.createElement('div');
    container.className = 'initial parent-breadcrumb-plugin';
    container.setAttribute('data-breadcrumb', 'true');
    container.style.cssText = 'margin: 12px 24px;';

    // Add "↩ Parent:" label
    const label = document.createElement('span');
    label.textContent = '↩';
    label.style.cssText = 'margin-right: 8px;';
    container.appendChild(label);

    // Build breadcrumb path
    for (let i = 0; i < parts.length - 1; i++) {
      const pathParts = parts.slice(0, i + 1);
      const fullPath = pathParts.join('/');
      const displayName = parts[i];
      
      // Create page reference span
      const refSpan = document.createElement('span');
      refSpan.setAttribute('data-ref', fullPath);
      refSpan.className = 'page-reference';

      const refDiv = document.createElement('div');
      refDiv.className = '';
      refDiv.setAttribute('data-tooltipped', '');
      refDiv.style.display = 'inline';

      const link = document.createElement('a');
      link.tabIndex = 0;
      link.setAttribute('data-ref', fullPath.toLowerCase());
      link.draggable = true;
      link.className = 'page-ref';
      link.textContent = displayName;
      link.setAttribute('href', `#/page/${encodeURIComponent(fullPath.toLowerCase())}`);

      refDiv.appendChild(link);
      refSpan.appendChild(refDiv);
      container.appendChild(refSpan);

      // Add separator if not last item
      if (i < parts.length - 2) {
        const separator = document.createElement('span');
        separator.className = 'mx-2 opacity-30';
        separator.textContent = '/';
        container.appendChild(separator);
      }
    }

    return container;
  }

  /**
   * Creates breadcrumb based on current settings
   */
  function createBreadcrumb(pageName) {
    if (settings.displayMode === 'simple') {
      return createSimpleBreadcrumb(pageName);
    } else {
      return createFullBreadcrumb(pageName);
    }
  }

  /**
   * Updates breadcrumb based on current page
   */
  async function updateBreadcrumb() {
    const page = await logseq.Editor.getCurrentPage();
    
    if (!page || !page.originalName) {
      removeBreadcrumb();
      return;
    }

    const pageName = page.originalName;

    // Only update if page changed
    if (pageName === currentPage) {
      return;
    }

    currentPage = pageName;

    // Remove existing breadcrumb
    removeBreadcrumb();

    // Create new breadcrumb if page is parent
    if (pageName.includes('/')) {
      const breadcrumb = createBreadcrumb(pageName);
      
      if (breadcrumb) {
        // Find the header element (flex flex-row space-between container)
        const headerElement = parent.document.querySelector('.flex.flex-row.space-between');
        
        if (headerElement && headerElement.parentNode) {
          breadcrumbContainer = breadcrumb;
          // Insert right after the header element
        //   headerElement.parentNode.insertBefore(breadcrumb, headerElement.nextSibling);
          headerElement.appendChild(breadcrumb)
        } else {
          // Fallback: try to find ls-page-title and insert after its parent
          const pageTitle = parent.document.querySelector('.ls-page-title');
          if (pageTitle) {
            const flexContainer = pageTitle.closest('.flex.flex-row');
            if (flexContainer && flexContainer.parentNode) {
              breadcrumbContainer = breadcrumb;
              flexContainer.parentNode.insertBefore(breadcrumb, flexContainer.nextSibling);
            }
          }
        }
      }
    }
  }

  /**
   * Removes existing breadcrumb
   */
  function removeBreadcrumb() {
    // Remove by attribute to be safe
    const existing = parent.document.querySelector('[data-breadcrumb="true"]');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    
    if (breadcrumbContainer && breadcrumbContainer.parentNode) {
      breadcrumbContainer.parentNode.removeChild(breadcrumbContainer);
    }
    breadcrumbContainer = null;
  }

  // Register settings
  logseq.useSettingsSchema([
    {
      key: 'displayMode',
      type: 'enum',
      title: 'Display Mode',
      description: 'Choose how to display the breadcrumb navigation',
      enumChoices: ['simple', 'full'],
      enumPicker: 'radio',
      default: 'simple'
    }
  ]);

  // Load settings
  function loadSettings() {
    const userSettings = logseq.settings;
    if (userSettings) {
      settings.displayMode = userSettings.displayMode || 'full';
    }
  }

  // Listen for settings changes
  logseq.onSettingsChanged((newSettings) => {
    settings.displayMode = newSettings.displayMode || 'full';
    // Force update to apply new settings
    currentPage = null;
    updateBreadcrumb();
  });

  // Load initial settings
  loadSettings();

  // Listen for route changes
  logseq.App.onRouteChanged(() => {
    setTimeout(updateBreadcrumb, 100);
  });

  // Initial update
  setTimeout(updateBreadcrumb, 500);

  // Also update periodically to catch any missed changes
  setInterval(updateBreadcrumb, 2000);
}

// Bootstrap the plugin
logseq.ready(main).catch(console.error);