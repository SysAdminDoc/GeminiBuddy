// ==UserScript==
// @name         GeminiBuddy
// @namespace    https://github.com/SysAdminDoc/GeminiBuddy
// @version      35.0
// @description  CSP-Compliant. Upgraded with a professional SaaS-style settings menu, UI refinements, and more.
// @author       Matthew Parker
// @match        https://gemini.google.com/*
// @icon         https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/Google_Gemini_icon_2025.svg
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceText
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @license      MIT
// @updateURL    https://github.com/SysAdminDoc/GeminiBuddy/raw/refs/heads/main/GeminiBuddy.user.js
// @downloadURL  https://github.com/SysAdminDoc/GeminiBuddy/raw/refs/heads/main/GeminiBuddy.user.js
// @resource     config.js ./src/config.js
// @resource     state.js ./src/state.js
// @resource     GM_wrappers.js ./src/GM_wrappers.js
// @resource     icons.js ./src/icons.js
// @resource     styles.js ./src/styles.js
// @resource     utils.js ./src/utils.js
// @resource     api.js ./src/features/api.js
// @resource     prompts.js ./src/features/prompts.js
// @resource     dragDrop.js ./src/features/dragDrop.js
// @resource     canvasDownload.js ./src/features/canvasDownload.js
// @resource     mainPanel.js ./src/ui/mainPanel.js
// @resource     modals.js ./src/ui/modals.js
// @resource     settingsUI.js ./src/ui/settingsUI.js
// @resource     main.js ./src/main.js
// ==/UserScript==

(async function() {
    'use strict';

    /**
     * A simple, CSP-compliant module loader for userscripts.
     * It uses GM_getResourceText to load modules as strings and executes them.
     * @param {string[]} resourceNames - An array of resource names to load and execute in order.
     */
    const loadModules = (resourceNames) => {
        const modules = {};
        const exports = {};

        // Helper to simulate 'export' by attaching properties to an 'exports' object.
        const moduleExecutor = (code, exports) => {
            // Injects 'exports' into the scope of the module code.
            // All 'export const X' or 'export function Y' are rewritten to 'exports.X =' and 'exports.Y ='
            const transformedCode = code
                .replace(/export\s+const\s+/g, 'exports.')
                .replace(/export\s+function\s+/g, 'exports.');
            new Function('exports', transformedCode)(exports);
        };

        resourceNames.forEach(name => {
            console.log(`Loading module: ${name}`);
            try {
                const code = GM_getResourceText(name);
                if (!code) {
                    throw new Error(`Resource '${name}' is empty or could not be loaded.`);
                }
                const moduleExports = {};

                // Simulate 'import' by creating a scope with all previously loaded modules.
                // This is a simplified approach; it doesn't handle named imports and assumes default imports.
                const transformedCode = code.replace(
                    /import\s+{\s*([^}]+)\s*}\s+from\s+['"](.+)['"];/g,
                    (match, imports, path) => {
                        const moduleName = path.split('/').pop().replace('.js', '');
                        const importAssignments = imports.split(',').map(imp => {
                            const trimmedImp = imp.trim();
                            return `const ${trimmedImp} = modules['${moduleName}'].${trimmedImp};`;
                        }).join('\n');
                        return importAssignments;
                    }
                ).replace(/export\s+/g, ''); // Remove export keywords after processing imports

                // Create a function that will execute the module code with its dependencies.
                const moduleFunction = new Function('exports', 'modules', `
                    ${transformedCode}
                    return exports;
                `);

                // Execute the function, passing the exports object and the modules cache.
                modules[name.replace('.js', '')] = moduleFunction(exports, modules);

            } catch (error) {
                console.error(`Error loading or executing module '${name}':`, error);
                alert(`Failed to load a critical component: ${name}. The script may not function correctly. Check the console for details.`);
            }
        });
    };

    // Define the order of module execution based on dependencies.
    // Files with no dependencies come first.
    const moduleLoadOrder = [
        'config.js',
        'GM_wrappers.js',
        'utils.js',
        'state.js',
        'icons.js',
        'styles.js',
        'canvasDownload.js',
        'dragDrop.js',
        'api.js',
        'mainPanel.js', // Depends on many but provides functions to others
        'modals.js',
        'prompts.js',
        'settingsUI.js',
        'main.js' // The entry point, runs last.
    ];

    /**
     * This function simulates the ES module system in a Greasemonkey environment
     * by sequentially loading and executing modules. Each module's exports are collected
     * and made available to subsequent modules, mimicking an import/export system.
     */
    const bootstrap = () => {
        const modules = {};

        const executeAndGetExports = (code, localModules) => {
            // Find all import statements
            const importRegex = /import\s+{([^}]+)}\s+from\s+'(.+?)';/g;
            let match;
            let injectedDependencies = '';

            // Create variable declarations for each imported function/constant
            while ((match = importRegex.exec(code)) !== null) {
                const imports = match[1].split(',').map(i => i.trim());
                const path = match[2];
                const moduleName = path.split('/').pop().replace('.js', '');

                imports.forEach(imp => {
                    injectedDependencies += `const ${imp} = modules['${moduleName}'].${imp};\n`;
                });
            }

            // Remove the original import and all export statements
            const cleanCode = code.replace(importRegex, '').replace(/export\s+/g, '');

            // The function body will contain dependencies and the module's code
            const functionBody = injectedDependencies + cleanCode + '; return {...(typeof exports !== "undefined" ? exports : {})};';

            // Each module defines its own 'exports' object
            const moduleScope = { exports: {} };

            // The module's code is executed inside a function to create a private scope
            const moduleFunction = new Function(...Object.keys(moduleScope), functionBody);
            return moduleFunction.apply(null, Object.values(moduleScope));
        };
        
        // A slightly different approach for the final execution
        const runInScope = (code, scopeVars) => {
            const varNames = Object.keys(scopeVars);
            const varValues = Object.values(scopeVars);
            new Function(...varNames, code)(...varValues);
        };
        
        const fileOrder = [
            'config.js', 'GM_wrappers.js', 'icons.js', 'styles.js', 'utils.js', 
            'state.js', 'canvasDownload.js', 'features/api.js', 'features/prompts.js',
            'features/dragDrop.js', 'ui/settingsUI.js', 'ui/mainPanel.js', 'ui/modals.js', 'main.js'
        ];
        
        const finalScope = {};
        
        fileOrder.forEach(fileName => {
            const resourceName = fileName.includes('/') ? fileName.substring(fileName.lastIndexOf('/') + 1) : fileName;
            const moduleName = resourceName.replace('.js', '');
            const code = GM_getResourceText(resourceName);
            
            const importRegex = /import\s+({[^}]+})\s+from\s+['"](.+)['"];/g;
            let dependencyInjections = '';
            let matchResult;
            while ((matchResult = importRegex.exec(code)) !== null) {
                const importedItems = matchResult[1].replace(/[{}]/g, '').split(',').map(s => s.trim());
                const fromFile = matchResult[2].split('/').pop();
                const fromModuleName = fromFile.replace('.js', '');

                for (const item of importedItems) {
                    dependencyInjections += `const ${item} = finalScope['${fromModuleName}']['${item}'];\n`;
                }
            }

            const exportRegex = /export\s+(const|function)\s+([a-zA-Z0-9_]+)/g;
            let modifiedCode = code.replace(importRegex, '');
            const exportedItems = [];
            modifiedCode = modifiedCode.replace(exportRegex, (match, type, name) => {
                exportedItems.push(name);
                return `${type} ${name}`;
            });
            
            const fullCodeToRun = `
                (function() {
                    ${dependencyInjections}
                    ${modifiedCode}
                    if (!finalScope['${moduleName}']) finalScope['${moduleName}'] = {};
                    ${exportedItems.map(item => `finalScope['${moduleName}']['${item}'] = ${item};`).join('\n')}
                })();
            `;
            
            runInScope(fullCodeToRun, { finalScope });
        });
        
        // The final main.js doesn't export, it just runs.
        const mainCode = GM_getResourceText('main.js');
        const mainImportRegex = /import\s+({[^}]+})\s+from\s+['"](.+)['"];/g;
        let mainDependencyInjections = '';
        let mainMatch;
        while ((mainMatch = mainImportRegex.exec(mainCode)) !== null) {
             const importedItems = mainMatch[1].replace(/[{}]/g, '').split(',').map(s => s.trim());
             const fromFile = mainMatch[2].split('/').pop();
             const fromModuleName = fromFile.replace('.js', '');
             for (const item of importedItems) {
                 mainDependencyInjections += `const ${item} = finalScope['${fromModuleName}']['${item}'];\n`;
             }
        }
        const finalMainCode = mainCode.replace(mainImportRegex, '');
        
        runInScope(mainDependencyInjections + finalMainCode, { finalScope });

    };

    bootstrap();

})();