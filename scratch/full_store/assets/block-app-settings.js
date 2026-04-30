const main = async () => {
  const { default: loader, appSettings, themeCode } = await import(window.WishlistKingAppLoaderURL);

  loader.load({
    name: 'wishlist-app',
    type: 'core',
    url: loader.getSdkUrl('wishlist-app.js'),
    props: {
      config: {
        ...appSettings.config,
        accountDialogUrl: themeCode.accountDialogUrl || loader.getThemeCodeUrl('account-dialog.js'),
      },
      settings: appSettings.settings,
    },
    afterLoad: ({ artifact: app }) => {
      loader.waitFor('icons').then(({ icons }) => (app.settings.icons = icons));
      loader.waitFor('locale').then((locale) => app.theme.locale.setLocale(locale));
      loader.waitFor('custom-data').then((fields) => app.apis.storefront.setFields(fields));
      loader.once("event-subscribers:setup").then(() => app.initLoginActionQueue())
    },
    dependencies: [
      {
        url: appSettings.assets.appBaseCss,
        order: 0,
      },
      {
        url: loader.getThemeCodeUrl(appSettings.assets.themeCssFile),
        order: 9,
      },
      {
        url: themeCode.customCssUrl,
        order: 10,
      },
      {
        name: 'event-subscribers',
        url: themeCode.eventSubscribersJsUrl || loader.getThemeCodeUrl('event-subscribers.js'),
      },
      {
        name: 'icons',
        url: themeCode.customIconsUrl || loader.getThemeCodeUrl('icons.js'),
      },
      {
        name: 'locale',
        url: themeCode.localeJsonUrl || loader.getThemeCodeUrl(appSettings.assets.localeJsonFile),
      },
      {
        name: 'custom-data',
        url: themeCode.customDataUrl,
      },
    ],
  });
};

if (window.WishlistKingAppLoaderURL) {
  main();
}
