import { useEffect, useState } from "react";

// Top 200 most popular Google/Fontsource Fonts as an offline fallback
export const POPULAR_FONTS = [
  "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Oswald", "Source Sans Pro", "Slabo 27px", "Raleway", "PT Sans",
  "Merriweather", "Noto Sans", "Nutanix", "Ubuntu", "Lora", "Playfair Display", "Roboto Condensed", "Nunito", "Rubik", "Amatic SC",
  "Josefin Sans", "Bebas Neue", "Arimo", "Quicksand", "Dancing Script", "Pacifico", "Fira Sans", "PT Serif", "Kanit", "Mukta",
  "Titillium Web", "Bitter", "Muli", "Oxygen", "Nanum Gothic", "Hind", "Heebo", "Source Serif Pro", "Work Sans", "Arvo",
  "Libre Baskerville", "Merriweather Sans", "Lobster", "Inconsolata", "Barlow", "Caveat", "Inter", "Abel", "Dosis", "Nanum Myeongjo",
  "DM Sans", "Cabin", "Crimson Text", "Indie Flower", "Signika", "Anton", "Archivo Black", "Teko", "Comfortaa", "Asap",
  "IBM Plex Sans", "Noto Serif", "Acme", "Questrial", "Alegreya", "Righteous", "Overpass", "Source Code Pro", "Domine",
  "Shadows Into Light", "Josefin Slab", "Catamaran", "Exo 2", "Chivo", "Bree Serif", "Hind Siliguri", "Monda", "Signika Negative",
  "Amiri", "PT Sans Narrow", "Cinzel", "Spirax", "Bungee", "Cinzel Decorative", "Orbitron", "Permanent Marker", "Courgette", "Play",
  "Kalam", "Creepster", "Sacramento", "Architects Daughter", "Fredoka One", "Luckiest Guy", "Yellowtail", "Kaushan Script", "Great Vibes", "Tangerine",
  "Alegreya Sans", "Karma", "Yanone Kaffeesatz", "Fjalla One", "Alata", "Quattrocento", "Quattrocento Sans", "Abhaya Libre", "Prata", "Old Standard TT",
  "Cardo", "Zilla Slab", "Vollkorn", "Rokkitt", "Alfa Slab One", "Patua One", "Abril Fatface", "Ultra", "Fugaz One", "Carter One",
  "Satisfy", "Cookie", "Alex Brush", "Allura", "Parisienne", "Damion", "Herr Von Muellerhoff", "Pinyon Script", "Rochester", "Monoton",
  "Crete Round", "Saira", "Rajdhani", "Cormorant Garamond", "Gothic A1", "Nanum Pen Script", "Kubo", "Barlow Condensed", "Maven Pro",
  "Varela Round", "Pathway Gothic One", "Saira Condensed", "Krona One", "Rubik Mono One", "Chroma Serif", "Manrope", "Outfit", "Space Grotesk",
  "Lexend Deca", "Space Mono", "Fira Code", "Sora", "Syne", "Plus Jakarta Sans", "Sen", "Be Vietnam Pro", "Urbanist", "Epilogue",
  "Cabinet Grotesk", "Satoshi", "General Sans", "Clash Display", "Ranade", "Synonym", "Telma", "Zodiak", "Switzer", "Stardom",
  "Pally", "Melodrama", "Lausanne", "Krylon", "Chillax", "Bespoke Serif", "Boska", "Supreme", "Array", "New York"
];

// Helper to convert font family name to Fontsource ID format (lowercase, hyphenated)
export function getFontId(fontName: string): string {
  return fontName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, ""); // Remove special characters
}

// Dynamically inject link tags to load a font from Fontsource CDN, with Google Fonts as a rock-solid fallback
export function loadGoogleFont(fontName: string) {
  if (!fontName) return;
  
  // Ignore system defaults
  const defaults = ["sans", "serif", "mono", "inter", "poppins", "lora", "jetbrains", "system-ui", "sans-serif", "monospace"];
  if (defaults.includes(fontName.toLowerCase())) return;

  const fontId = getFontId(fontName);
  const elementId = `fontsource-${fontId}`;
  
  // Return if already loaded
  if (document.getElementById(elementId) || document.getElementById(`google-${fontId}`)) return;

  const link = document.createElement("link");
  link.id = elementId;
  link.rel = "stylesheet";
  // Load the full optimized CSS bundle from Fontsource CDN (includes Latin subsets & common weights)
  link.href = `https://cdn.jsdelivr.net/npm/@fontsource/${fontId}/index.css`;
  
  // Fallback to Google Fonts if the Fontsource CDN package fails to load (e.g. slight name discrepancy)
  link.onerror = () => {
    console.warn(`Fontsource package failed for ${fontName}. Falling back to Google Fonts API...`);
    const gLink = document.createElement("link");
    gLink.id = `google-${fontId}`;
    gLink.rel = "stylesheet";
    gLink.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(gLink);
    
    // Remove the failed link to keep document.head clean
    link.remove();
  };

  document.head.appendChild(link);
}

// Hook to fetch the complete list of 2,000+ fonts from Fontsource API with popular fonts as baseline
export function useGoogleFonts() {
  const [fonts, setFonts] = useState<string[]>(POPULAR_FONTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Fetch official, complete directory list from Fontsource API
    fetch("https://api.fontsource.org/v1/fonts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch Fontsource API");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          // Extract families from the Fontsource metadata array
          const apiFamilies = data.map((font: { family?: string }) => font.family).filter(Boolean) as string[];
          // Merge with our baseline and deduplicate
          const merged = Array.from(new Set([...POPULAR_FONTS, ...apiFamilies])).sort();
          setFonts(merged);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Fontsource API fetch failed. Using popular fonts baseline offline fallback:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { fonts, isLoading };
}
