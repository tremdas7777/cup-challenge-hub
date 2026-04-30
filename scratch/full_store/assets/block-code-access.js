const main = async () => {
  const { default: loader, appSettings, themeCode } = await import(window.WishlistKingAppLoaderURL);

  if (themeCode.collectionButtonsJsUrl) {
    loader.load({
      name: 'wishlist-button-collection-custom',
      customElementName: 'wishlist-button-collection',
      type: 'lit-component',
      url: themeCode.collectionButtonsJsUrl,
      dependencies: [
        {
          name: 'wishlist-button-collection',
          type: 'lit-component',
          url: appSettings.assets.componentWishlistButtonCollectionJs,
        },
        {
          url: appSettings.assets.componentWishlistButtonCollectionCss,
          order: 5,
        },
      ],
    });
  }

  if (themeCode.productPageButtonsJsUrl) {
    loader.load({
      name: 'wishlist-button-product-custom',
      customElementName: 'wishlist-button-product',
      type: 'lit-component',
      url: themeCode.productPageButtonsJsUrl,
      dependencies: [
        {
          name: 'wishlist-button-product',
          type: 'lit-component',
          url: appSettings.assets.componentWishlistButtonProductJs,
        },
        {
          url: appSettings.assets.componentWishlistButtonProductCss,
          order: 5,
        },
      ],
    });
  }
  if (themeCode.headerLinkJsUrl) {
    loader.load({
      name: 'wishlist-link-custom',
      customElementName: 'wishlist-link',
      type: 'lit-component',
      url: themeCode.headerLinkJsUrl,
      dependencies: [
        {
          name: 'wishlist-link',
          type: 'lit-component',
          url: appSettings.assets.componentWishlistLinkJs,
        },
        {
          url: appSettings.assets.componentWishlistLinkCss,
          order: 5,
        },
      ],
    });
  }
  if (themeCode.saveForLaterJsUrl) {
    loader.load({
      name: 'save-for-later',
      type: 'lit-component',
      url: themeCode.saveForLaterJsUrl,
      dependencies: [
        {
          url: appSettings.assets.componentSaveForLaterCss,
          order: 5,
        },
      ],
    });
  }
  if (themeCode.wishlistButtonHeadlessJsUrl) {
    loader.load({
      name: 'wishlist-button-headless',
      type: 'headless-component',
      url: themeCode.wishlistButtonHeadlessJsUrl,
    });
  }
  if (themeCode.wishlistLinkHeadlessJsUrl) {
    loader.load({
      name: 'wishlist-link-headless',
      type: 'headless-component',
      url: themeCode.wishlistLinkHeadlessJsUrl,
    });
  }
};

if (window.WishlistKingAppLoaderURL) {
  main();
}

