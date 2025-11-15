export const handler = async () => {
  const body = {
    host: "freedomcrateco.com",
    key: "9cfb578c089c461ba4fb1e9ce69cd15b",
    keyLocation: "https://freedomcrateco.com/9cfb578c089c461ba4fb1e9ce69cd15b.txt",
    urlList: [
      "https://freedomcrateco.com/",
      "https://freedomcrateco.com/index.html",
      "https://freedomcrateco.com/about.html",
      "https://freedomcrateco.com/branch-collection.html",
      "https://freedomcrateco.com/product.html?sku=FC-RM-400",
      "https://freedomcrateco.com/giveaway.html",
      "https://freedomcrateco.com/transparency.html",
      "https://freedomcrateco.com/reviews.html",
      "https://freedomcrateco.com/gallery.html",
      "https://freedomcrateco.com/contact.html"
    ]
  };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    });

    return {
      statusCode: response.status,
      body: JSON.stringify({ success: true, status: response.status })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
