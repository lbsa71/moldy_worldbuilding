(async function() {
  try {
    const response = await fetch('/wasm/release.wasm');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.instantiate(bytes);
    const exports = wasmModule.instance.exports;
    
    // Add exports to window object
    window.add = exports.add;
    window.calculatePhysics = exports.calculatePhysics;
    
    console.log('WASM module loaded successfully');
  } catch (e) {
    console.error('Failed to load WASM:', e);
  }
})();