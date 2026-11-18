import { Platform } from "react-native";

const GA_MEASUREMENT_ID =
  process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID || "G-82VW908CN8";
const GTM_ID = process.env.EXPO_PUBLIC_GTM_ID || "GTM-WPGVZLQK";

let initialized = false;

/**
 * Inisialisasi Google Tag / GA4 di Web.
 * Jika script sudah dimuat lewat public/index.html, fungsi ini tidak akan menyuntikkan ulang.
 */
export const initAnalytics = (): void => {
  if (Platform.OS !== "web" || initialized) return;
  const win = globalThis as any;
  const doc = win?.document;
  if (!doc) return;

  if (typeof win.gtag === "function") {
    initialized = true;
    return;
  }

  if (GTM_ID) {
    const existing = doc.querySelector(`script[src*="gtm.js?id=${GTM_ID}"]`);
    if (!existing) {
      const script = doc.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      doc.head.appendChild(script);
    }
  }

  win.dataLayer = win.dataLayer || [];
  win.gtag = function () {
    win.dataLayer.push(arguments);
  };
  win.gtag("js", new Date());
  if (GA_MEASUREMENT_ID) {
    win.gtag("config", GA_MEASUREMENT_ID);
  }

  initialized = true;
};

/**
 * Mengubah nama route & parameter React Navigation menjadi path dan judul halaman yang rapi untuk GA4.
 */
export const getRoutePageInfo = (
  routeName: string,
  params?: Record<string, any>,
): { path: string; title: string } => {
  switch (routeName) {
    case "HomeTab":
      return { path: "/", title: "Home - MyAnime" };
    case "AnimeList": {
      const type = params?.type || "list";
      const title =
        params?.title ||
        (type === "ongoing" ? "Anime Ongoing" : "Anime Completed");
      return { path: `/anime/${type}`, title };
    }
    case "GenreList":
    case "GenreTab":
      return { path: "/genres", title: "Daftar Genre" };
    case "GenreAnime": {
      const id = params?.genreId || "unknown";
      const name = params?.genreName ? `Genre: ${params.genreName}` : "Genre Anime";
      return { path: `/genre/${id}`, title: name };
    }
    case "Episode": {
      const bookId = params?.bookId || "unknown";
      const title = params?.title || "Detail Anime";
      return { path: `/anime/detail/${bookId}`, title };
    }
    case "Video": {
      const animeId = params?.animeId || "unknown";
      const epId = params?.episode?.chapterId || "episode";
      const epTitle = params?.episode?.chapterName || "Watch Episode";
      return { path: `/watch/${animeId}/${epId}`, title: epTitle };
    }
    case "Search":
    case "SearchTab":
      return { path: "/search", title: "Pencarian Anime" };
    case "MyListTab":
      return { path: "/my-list", title: "My List" };
    case "ProfileTab":
      return { path: "/profile", title: "Profil" };
    case "Login":
      return { path: "/login", title: "Login" };
    case "Register":
      return { path: "/register", title: "Register" };
    default:
      return { path: `/${routeName.toLowerCase()}`, title: routeName };
  }
};

/**
 * Melacak perpindahan layar di SPA (React Navigation) ke Google Analytics 4.
 */
export const trackScreenView = (
  routeName: string,
  params?: Record<string, any>,
): void => {
  if (Platform.OS !== "web" || !GA_MEASUREMENT_ID) return;
  const win = globalThis as any;
  if (typeof win?.gtag !== "function") return;

  const { path, title } = getRoutePageInfo(routeName, params);
  const origin = win.location?.origin || "";

  win.gtag("event", "page_view", {
    page_title: title,
    page_path: path,
    page_location: origin ? `${origin}${path}` : undefined,
    send_to: GA_MEASUREMENT_ID,
  });
};

/**
 * Mengirim custom event ke Google Analytics 4 (misal: watch_episode, search, dll).
 */
export const trackEvent = (
  eventName: string,
  params?: Record<string, any>,
): void => {
  if (Platform.OS !== "web" || !GA_MEASUREMENT_ID) return;
  const win = globalThis as any;
  if (typeof win?.gtag !== "function") return;

  win.gtag("event", eventName, {
    ...params,
    send_to: GA_MEASUREMENT_ID,
  });
};
