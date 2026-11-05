/*
 * Breathing Point shared Botpress Webchat loader.
 *
 * Setup:
 * 1. In Botpress, open Webchat > Deploy Settings.
 * 2. Copy the generated "script URL" (the files.bpcontent.cloud URL).
 * 3. Paste that URL below. It is the second script in Botpress's official
 *    embed snippet and contains your botId/clientId initialization.
 *
 * Keep this file identical on the main website and Care portal.
 * This file contains public webchat configuration only; never put API tokens,
 * Supabase service-role keys, or private credentials here.
 */
(() => {
  const CONFIG_SCRIPT_URL = "https://files.bpcontent.cloud/2026/11/05/07/20261105070537-IOPXJ4TW.js";
  const INJECT_SCRIPT_URL = "https://cdn.botpress.cloud/webchat/v3.3/inject.js";

  if (!CONFIG_SCRIPT_URL || CONFIG_SCRIPT_URL.includes("PASTE_BOTPRESS")) {
    console.info("[Breathing Point] Botpress is not configured yet. Add the Deploy Settings script URL.");
    return;
  }

  if (window.__bpBotpressLoaderStarted) return;
  window.__bpBotpressLoaderStarted = true;

  const inject = document.createElement("script");
  inject.src = INJECT_SCRIPT_URL;
  inject.async = true;

  inject.onload = () => {
    const config = document.createElement("script");
    config.src = CONFIG_SCRIPT_URL;
    config.async = true;
    config.onload = () => console.info("[Breathing Point] Assistant loaded.");
    config.onerror = () => console.error("[Breathing Point] Could not load Botpress configuration.");
    document.head.appendChild(config);
  };

  inject.onerror = () => {
    console.error("[Breathing Point] Could not load Botpress Webchat.");
    window.__bpBotpressLoaderStarted = false;
  };

  document.head.appendChild(inject);
})();
