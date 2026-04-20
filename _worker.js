export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Inject your API key into API requests
    if (url.pathname.startsWith("/api/")) {
      const apiRequest = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers),
          "Authorization": `Bearer ${env.API_KEY}`
        }
      });
      return fetch(apiRequest);
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  }
};