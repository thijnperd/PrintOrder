# PrintLab 🖨️

Custom 3D print on-demand service builder. A modern web application for showcasing available filaments, calculating print prices, and managing customer print requests.

## Features

✨ **Modern UI**
- Dark theme with accent colors
- Smooth animations and transitions
- Responsive grid layouts
- Interactive 3D model viewer (THREE.js)

🎨 **Filament Management**
- CSV-based filament catalog
- Color swatches with live preview
- Glitter filament indicator
- Stock status tracking (Available / Low Stock / Out of Stock)

💰 **Dynamic Price Calculator**
- Real-time pricing based on weight and print time
- Material costs + hourly rate + fixed startup fee
- Friend discount toggle
- Material-specific pricing

📦 **Portfolio Showcase**
- Interactive 3D STL viewer
- Print type icons (Vase, Torus, Box)
- Drag-to-rotate, scroll-to-zoom controls
- Print specifications display

📧 **Contact & Orders**
- Form submission via Formspree
- WhatsApp integration
- Email fallback

## Tech Stack

- **Frontend**: React 18 + Vite
- **3D Rendering**: THREE.js
- **CSV Parsing**: PapaParse
- **Icons**: Lucide React
- **Styling**: CSS-in-JS with CSS variables
- **Build**: Vite
- **Deployment**: Vercel

## Project Structure

```
PrintOnDemandOMD/
├── src/
│   ├── main.jsx              # React entry point
│   └── PrintLab.jsx          # Main app component
├── public/
│   └── data/
│       ├── filamenten.csv    # Filament catalog
│       └── prints.csv        # Portfolio items
├── Models/
│   ├── Card.stl
│   ├── Tract.stl
│   └── Tract+Card.stl
├── index.html                # HTML entry point
├── package.json
├── vite.config.js
├── vercel.json               # Vercel deployment config
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173` (default Vite port)

## Configuration

Edit the configuration object in `src/PrintLab.jsx`:

```javascript
const config = {
  businessName:           "PrintLab",
  tagline:                "Custom 3D prints op maat",
  ownerName:              "Thijn",
  printerNaam:            "Elegoo Centauri Carbon",
  contactEmail:           "thijnfigo@gmail.com",
  whatsappNumber:         "+31612345678",
  uurtarief:              2.50,             // € per hour
  vasteMarge:             1.00,             // € fixed startup
  vriendenkortingProcent: 15,
  formspreeId:            "JOUW_FORMSPREE_ID",  // See below
};
```

### Setting up Email Forms

1. Go to [formspree.io](https://formspree.io)
2. Create a free account
3. Create a new form for your email
4. Copy the form ID
5. Paste it into `config.formspreeId` in `PrintLab.jsx`

## CSV Format

### filamenten.csv (Filaments)

Required columns:
- `naam` - Filament name (e.g., "Elegoo Rapid PLA+")
- `kleur` - Color name (e.g., "Zwart")
- `hex` - Color hex code (e.g., "#1a1a1a")
- `materiaal` - Material type (e.g., "PLA+")
- `prijs_per_kilo` - Price per kilogram
- `status` - Stock status: `beschikbaar` | `bijna op` | `uitverkocht`
- `is_glittery` - Glitter filament: `ja` | `nee`

Example:
```csv
naam,kleur,hex,materiaal,prijs_per_kilo,status,is_glittery
Elegoo Rapid PLA+,Zwart,#1a1a1a,PLA+,17.99,beschikbaar,nee
Elegoo Glitter PLA,Goud Glitter,#d4af37,PLA Glitter,24.99,beschikbaar,ja
```

### prints.csv (Portfolio)

Required columns:
- `naam` - Print name
- `beschrijving` - Description
- `bestand` - STL filename
- `materiaalAdvies` - Recommended material
- `gewichtGram` - Weight in grams
- `type` - Print type: `vase` | `torus` | `box`
- `prijsIndicatie` - Indicative price

Example:
```csv
naam,beschrijving,bestand,materiaalAdvies,gewichtGram,type,prijsIndicatie
Vaas — Spiraal,Sierlijke spiraalvaas 180mm hoog,vaas_spiraal.stl,PLA Matte,85,vase,4.25
```

## Deployment

### Vercel (Recommended)

The project includes `vercel.json` configuration:

1. Push to GitHub
2. Connect repository to Vercel
3. Deploy (automatic on push)

### Manual Build

```bash
npm run build
# Output in ./dist folder
```

## Customization

### Colors & Theme

Edit CSS variables in `PrintLab.jsx`:

```javascript
:root {
  --bg:         #0a0a0a;      // Background
  --surface:    #111111;      // Card background
  --accent:     #e8611a;      // Accent (orange)
  --fg:         #ede8e0;      // Text color
  --fg-muted:   #6a6560;      // Muted text
  // ... more variables
}
```

### Animations

Modify animation constants:
- `CUBE_FACES` - 3D cube rotation
- `SPARKLE_POS` - Glitter effects
- Easing: `--ease-out`, `--ease-io`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- ~70KB initial bundle (gzipped)
- Smooth 60fps animations
- Lazy-loaded CSV data
- Optimized THREE.js scene

## License

Private project - feel free to customize for your own use

## Author

**Thijn** - [thijnfigo@gmail.com](mailto:thijnfigo@gmail.com)

---

Built with React, Vite, and THREE.js ✨
