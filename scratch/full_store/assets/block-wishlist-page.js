const main = async () => {
  const { default: loader, appSettings } = await import(window.WishlistKingAppLoaderURL);

  const wishlistPage = JSON.parse(document.getElementById('wkWishlistPage')?.text ?? '{}');
  const themeCode = JSON.parse(document.getElementById('wkThemeCode')?.text ?? '{}');

  const wishlistPageComponentUrl = themeCode.wishlistPageJsUrl || loader.getThemeCodeUrl('wishlist-page.js');
  const productCardComponentUrl = themeCode.productCardJsUrl || loader.getThemeCodeUrl('wishlist-product-card.js');
  const addWishlistToCartComponentUrl =
    themeCode.addWishlistToCartJsUrl || loader.getThemeCodeUrl('add-wishlist-to-cart.js');
  const addToCartActionUrl = themeCode.addToCartJsUrl || loader.getThemeCodeUrl('add-to-cart.js');

  let addToCartAction = () => { };
  import(addToCartActionUrl).then(({ action }) => (addToCartAction = action));

  loader.load({
    name: 'wishlist-page-bundle',
    type: 'lit-component',
    url: appSettings.assets.componentWishlistPageBundleJs,
    props: wishlistPage,
    dependencies: [
      {
        url: appSettings.assets.componentWishlistPageBundleCss,
        order: 5,
      },
      {
        name: 'wishlist-page',
        type: 'lit-component',
        url: wishlistPageComponentUrl,
      },
      {
        name: 'wishlist-add-to-cart',
        type: 'lit-component',
        url: addWishlistToCartComponentUrl,
      },
      {
        name: 'wishlist-product-card',
        type: 'lit-component',
        url: productCardComponentUrl,
        props: {
          addToCartAction: (...args) => addToCartAction(...args),
        },
      },
    ],
  });
};

if (window.WishlistKingAppLoaderURL) {
  main();
}