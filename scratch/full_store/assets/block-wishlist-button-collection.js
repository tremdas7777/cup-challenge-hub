const main = async () => {
  const { default: loader, appSettings, collectionButtons } = await import(window.WishlistKingAppLoaderURL);
  const config = collectionButtons.productLinkSelector ? collectionButtons : appSettings.collectionButtons;

  loader.load({
    name: 'wishlist-button-collection-embed',
    customElementName: 'wishlist-button-collection',
    type: 'lit-component',
    url: appSettings.assets.componentWishlistButtonCollectionJs,
    props: {
      injectMethod: config.injectMethod,
      buttonPlacement: collectionButtons.buttonPlacement,
      productLinkSelector: decodeURIComponent(config.productLinkSelector),
      getInjectReference: eval(config.injectReferenceJs),
      getFloatReference: eval(config.floatingReferenceJs),
      getProductHandle: eval(config.productHandleJs),
      getProductVariant: eval(config.productVariantJs),
    },
    dependencies: [
      {
        url: appSettings.assets.componentWishlistButtonCollectionCss,
        order: 5,
      },
    ],
  });
  if (collectionButtons.integration.productLinkSelector) {
    loader.load({
      name: 'wishlist-button-collection-integration',
      type: 'lit-component',
      url: appSettings.assets.componentWishlistButtonCollectionJs,
      props: {
        injectMethod: 'insertAfter',
        buttonPlacement: collectionButtons.buttonPlacement,
        productLinkSelector: decodeURIComponent(collectionButtons.integration.productLinkSelector),
        getInjectReference: eval(collectionButtons.integration.injectReferenceJs),
        getFloatReference: eval(collectionButtons.integration.floatingReferenceJs),
        getProductHandle: eval(collectionButtons.integration.productHandleJs),
        getProductVariant: eval(collectionButtons.integration.productVariantJs),
      },
      dependencies: [
        {
          url: appSettings.assets.componentWishlistButtonCollectionCss,
          order: 5,
        },
      ],
    });
  }
};

if (window.WishlistKingAppLoaderURL) {
  main();
}
