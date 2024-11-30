import sharp from "sharp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const size = 256;

// Create a gradient pattern
const gradient = new Uint8Array(size * size);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    // Create a radial gradient from center
    const dx = x - size / 2;
    const dy = y - size / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const value = Math.max(
      0,
      Math.min(255, 255 - (distance * 255) / (size / 2))
    );
    gradient[y * size + x] = value;
  }
}

// Add some noise
for (let i = 0; i < gradient.length; i++) {
  const noise = (Math.random() - 0.5) * 30;
  gradient[i] = Math.max(0, Math.min(255, gradient[i] + noise));
}

// Create the heightmap
sharp(gradient, {
  raw: {
    width: size,
    height: size,
    channels: 1,
  },
})
  .png()
  .toFile(join(__dirname, "../public/assets/heightmap.png"))
  .then(() => console.log("Heightmap created successfully"))
  .catch((err) => {
    console.error("Failed to create heightmap:", err);
    process.exit(1);
  });
