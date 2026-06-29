module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === "production" || process.env.EXPO_PUBLIC_BUILD_ENV === "production";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // ============================================
      // REMOVE ALL CONSOLE CALLS IN PRODUCTION BUILD
      // Plugin ini menghapus TOTAL semua baris console.*
      // (beserta string isinya) dari bundle akhir saat build production.
      // Ini mencegah string log terekspos di APK hasil decompile.
      // Di development (expo start), log tetap berjalan normal.
      // ============================================
      ...(isProduction
        ? [
            [
              "transform-remove-console",
              {
                // Hapus semua jenis console kecuali "error"
                // agar crash tetap bisa dilacak jika ada crash reporter
                exclude: ["error"],
              },
            ],
          ]
        : []),
    ],
  };
};
